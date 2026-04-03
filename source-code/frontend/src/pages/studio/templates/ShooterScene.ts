import type { TemplateRuntimePayload } from './templateSceneUtils'
import { cfgHex, cfgNum, hexToPhaserColor } from './templateSceneUtils'

const FIRE_COOLDOWN_MS = 300
const WAVE_BREAK_MS = 3000
const WAVE_LABEL_MS = 1200
const PLAYER_INVULN_MS = 1400

export function buildShooterScene(PhaserRef: typeof import('phaser')): typeof Phaser.Scene {
  return class ShooterScene extends PhaserRef.Scene {
    private p!: TemplateRuntimePayload
    private playerSpeed = 200
    private bulletSpeed = 400
    private enemySpeedBase = 80
    private playerColor = 0x00ff88
    private bulletColor = 0xffffff
    private enemyColor = 0xff4444
    private bgColor = 0x1a1a2e

    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    private bullets!: Phaser.Physics.Arcade.Group
    private enemies!: Phaser.Physics.Arcade.Group

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private keyW!: Phaser.Input.Keyboard.Key
    private keyA!: Phaser.Input.Keyboard.Key
    private keyS!: Phaser.Input.Keyboard.Key
    private keyD!: Phaser.Input.Keyboard.Key
    private spaceKey!: Phaser.Input.Keyboard.Key
    private keyR?: Phaser.Input.Keyboard.Key

    private lastFireTime = 0
    private score = 0
    private lives = 3
    private wave = 1
    private waveEnemiesTotal = 5
    private waveEnemiesKilled = 0
    private inWaveBreak = false
    private invulnUntil = 0

    private scoreText!: Phaser.GameObjects.Text
    private livesText!: Phaser.GameObjects.Text
    private waveText!: Phaser.GameObjects.Text
    private waveBanner?: Phaser.GameObjects.Text
    private gameOver = false

    constructor() {
      super({ key: 'studioShooter' })
    }

    init(data: TemplateRuntimePayload) {
      this.p = data
      const tc = data.templateConfig
      this.playerSpeed = cfgNum(tc.playerSpeed, 200)
      this.bulletSpeed = cfgNum(tc.bulletSpeed, 400)
      this.enemySpeedBase = cfgNum(tc.enemySpeed, 80)
      this.bgColor = hexToPhaserColor(cfgHex(tc.backgroundColor, '#1a1a2e'), 0x1a1a2e)
      this.playerColor = hexToPhaserColor(cfgHex(tc.playerColor, '#00ff88'), 0x00ff88)
      this.bulletColor = hexToPhaserColor(cfgHex(tc.bulletColor, '#ffffff'), 0xffffff)
      this.enemyColor = hexToPhaserColor(cfgHex(tc.enemyColor, '#ff4444'), 0xff4444)
    }

    create() {
      const { width: W, height: H } = this.p
      this.gameOver = false
      this.physics.world.gravity.set(0, 0)
      this.cameras.main.setBackgroundColor(this.bgColor)
      this.physics.world.setBounds(0, 0, W, H)

      const g = this.make.graphics({ x: 0, y: 0 }, false)
      g.fillStyle(this.playerColor, 1)
      g.fillCircle(14, 14, 12)
      g.fillStyle(0xffffff, 0.9)
      g.fillTriangle(22, 14, 30, 10, 30, 18)
      g.generateTexture('_tplShooterPlayer', 32, 32)
      g.destroy()

      const gb = this.make.graphics({ x: 0, y: 0 }, false)
      gb.fillStyle(this.bulletColor, 1)
      gb.fillCircle(4, 4, 4)
      gb.generateTexture('_tplShooterBullet', 8, 8)
      gb.destroy()

      const ge = this.make.graphics({ x: 0, y: 0 }, false)
      ge.fillStyle(this.enemyColor, 1)
      ge.fillCircle(10, 10, 10)
      ge.generateTexture('_tplShooterEnemy', 20, 20)
      ge.destroy()

      this.player = this.physics.add.sprite(W / 2, H / 2, '_tplShooterPlayer')
      this.player.setCollideWorldBounds(true)
      ;(this.player.body as Phaser.Physics.Arcade.Body).setDrag(0, 0)

      this.bullets = this.physics.add.group({ maxSize: 120 })
      this.enemies = this.physics.add.group({ maxSize: 160 })

      this.score = 0
      this.lives = 3
      this.wave = 1
      this.inWaveBreak = false
      this.waveEnemiesKilled = 0
      this.waveEnemiesTotal = this.enemyCountForWave(1)
      this.invulnUntil = 0
      this.lastFireTime = 0

      this.scoreText = this.add
        .text(12, 10, 'Score: 0', {
          fontSize: '18px',
          color: '#e8e8f0',
          fontStyle: 'bold',
        })
        .setDepth(50)

      this.livesText = this.add
        .text(12, 34, 'Lives: 3', {
          fontSize: '18px',
          color: '#e8e8f0',
          fontStyle: 'bold',
        })
        .setDepth(50)

      this.waveText = this.add
        .text(W - 12, 10, 'Wave: 1', {
          fontSize: '18px',
          color: '#e8e8f0',
          fontStyle: 'bold',
        })
        .setOrigin(1, 0)
        .setDepth(50)

      if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys()
        this.keyW = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.W)
        this.keyA = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.A)
        this.keyS = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.S)
        this.keyD = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.D)
        this.spaceKey = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.SPACE)
        this.keyR = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.R)
      }

      this.physics.add.overlap(this.bullets, this.enemies, (b, e) =>
        this.onBulletHitEnemy(b as Phaser.GameObjects.GameObject, e as Phaser.GameObjects.GameObject),
      )
      this.physics.add.overlap(this.player, this.enemies, (pl, en) =>
        this.onEnemyHitPlayer(pl as Phaser.GameObjects.GameObject, en as Phaser.GameObjects.GameObject),
      )

      this.showWaveBanner(1)
      this.beginSpawningCurrentWave()
    }

    private enemyCountForWave(w: number): number {
      return 5 + (w - 1) * 3
    }

    private currentEnemySpeed(): number {
      const mul = 1 + (this.wave - 1) * 0.12
      return this.enemySpeedBase * mul
    }

    private showWaveBanner(w: number) {
      this.waveBanner?.destroy()
      const { width: W, height: H } = this.p
      this.waveBanner = this.add
        .text(W / 2, H / 2 - 40, `Wave ${w}`, {
          fontSize: '42px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(120)
        .setAlpha(1)
      this.tweens.add({
        targets: this.waveBanner,
        alpha: 0,
        duration: WAVE_LABEL_MS,
        ease: 'Power2',
        onComplete: () => {
          this.waveBanner?.destroy()
          this.waveBanner = undefined
        },
      })
    }

    private beginSpawningCurrentWave() {
      this.waveEnemiesTotal = this.enemyCountForWave(this.wave)
      this.waveEnemiesKilled = 0
      const stagger = 220
      for (let i = 0; i < this.waveEnemiesTotal; i++) {
        this.time.delayedCall(i * stagger, () => {
          if (!this.gameOver && !this.inWaveBreak) this.spawnEnemy()
        })
      }
    }

    private spawnEnemy() {
      if (this.gameOver || this.inWaveBreak) return
      const { width: W, height: H } = this.p
      const edge = Phaser.Math.Between(0, 3)
      let x = 0
      let y = 0
      const pad = 24
      switch (edge) {
        case 0:
          x = Phaser.Math.Between(pad, W - pad)
          y = -pad
          break
        case 1:
          x = W + pad
          y = Phaser.Math.Between(pad, H - pad)
          break
        case 2:
          x = Phaser.Math.Between(pad, W - pad)
          y = H + pad
          break
        default:
          x = -pad
          y = Phaser.Math.Between(pad, H - pad)
          break
      }

      const en = this.physics.add.sprite(x, y, '_tplShooterEnemy')
      this.enemies.add(en)
      ;(en.body as Phaser.Physics.Arcade.Body).setCircle(10, 0, 0)
      this.refreshEnemyVelocity(en)
    }

    private refreshEnemyVelocity(en: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
      const sp = this.currentEnemySpeed()
      const a = Phaser.Math.Angle.Between(en.x, en.y, this.player.x, this.player.y)
      en.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp)
    }

    private onBulletHitEnemy(bulletGO: Phaser.GameObjects.GameObject, enemyGO: Phaser.GameObjects.GameObject) {
      bulletGO.destroy()
      enemyGO.destroy()
      this.score += 10
      this.scoreText.setText(`Score: ${this.score}`)
      this.waveEnemiesKilled++
      if (
        this.waveEnemiesKilled >= this.waveEnemiesTotal &&
        !this.inWaveBreak &&
        !this.gameOver
      ) {
        this.score += 50
        this.scoreText.setText(`Score: ${this.score}`)
        this.startWaveBreak()
      }
    }

    private startWaveBreak() {
      if (this.inWaveBreak) return
      this.inWaveBreak = true
      this.enemies.clear(true, true)
      const { width: W, height: H } = this.p
      const next = this.wave + 1
      const msg = this.add
        .text(W / 2, H / 2, `Wave ${next}`, {
          fontSize: '36px',
          color: '#aaddff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(100)
      this.time.delayedCall(WAVE_BREAK_MS, () => {
        msg.destroy()
        this.wave = next
        this.waveText.setText(`Wave: ${this.wave}`)
        this.inWaveBreak = false
        this.beginSpawningCurrentWave()
      })
    }

    private onEnemyHitPlayer(_playerGO: Phaser.GameObjects.GameObject, enemyGO: Phaser.GameObjects.GameObject) {
      if (this.gameOver || this.inWaveBreak) return
      const now = this.time.now
      if (now < this.invulnUntil) return
      enemyGO.destroy()
      this.invulnUntil = now + PLAYER_INVULN_MS
      this.lives -= 1
      this.livesText.setText(`Lives: ${this.lives}`)
      this.player.setAlpha(0.45)
      this.time.delayedCall(PLAYER_INVULN_MS, () => {
        if (!this.gameOver) this.player.setAlpha(1)
      })
      if (this.lives <= 0) this.triggerGameOver()
    }

    private tryFire() {
      if (this.gameOver || this.inWaveBreak) return
      const now = this.time.now
      if (now - this.lastFireTime < FIRE_COOLDOWN_MS) return
      this.lastFireTime = now

      const ptr = this.input.activePointer
      const angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        ptr.worldX,
        ptr.worldY,
      )
      this.player.setRotation(angle)

      const bullet = this.physics.add.image(this.player.x, this.player.y, '_tplShooterBullet')
      this.bullets.add(bullet)
      const b = bullet.body as Phaser.Physics.Arcade.Body
      b.setAllowGravity(false)
      bullet.setRotation(angle)
      b.setVelocity(Math.cos(angle) * this.bulletSpeed, Math.sin(angle) * this.bulletSpeed)
    }

    private triggerGameOver() {
      if (this.gameOver) return
      this.gameOver = true
      this.physics.pause()
      const { width: W, height: H } = this.p
      this.add
        .text(W / 2, H / 2 - 20, 'GAME OVER', {
          fontSize: '38px',
          color: '#ff4466',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(200)
      this.add
        .text(W / 2, H / 2 + 32, 'Nhấn R để chơi lại', {
          fontSize: '18px',
          color: '#cccccc',
        })
        .setOrigin(0.5)
        .setDepth(200)
    }

    update() {
      if (this.gameOver) {
        if (this.keyR && PhaserRef.Input.Keyboard.JustDown(this.keyR)) {
          this.scene.restart(this.p)
        }
        return
      }

      if (this.inWaveBreak) {
        return
      }

      const body = this.player.body as Phaser.Physics.Arcade.Body
      let vx = 0
      let vy = 0
      if (this.cursors.left.isDown || this.keyA.isDown) vx = -this.playerSpeed
      else if (this.cursors.right.isDown || this.keyD.isDown) vx = this.playerSpeed
      if (this.cursors.up.isDown || this.keyW.isDown) vy = -this.playerSpeed
      else if (this.cursors.down.isDown || this.keyS.isDown) vy = this.playerSpeed
      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071
        vy *= 0.7071
      }
      body.setVelocity(vx, vy)

      const ptr = this.input.activePointer
      const aimAngle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        ptr.worldX,
        ptr.worldY,
      )
      this.player.setRotation(aimAngle)

      if (PhaserRef.Input.Keyboard.JustDown(this.spaceKey) || ptr.leftButtonDown()) {
        this.tryFire()
      }

      this.enemies.children.iterate((ch) => {
        const en = ch as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null
        if (!en || !en.active) return true
        this.refreshEnemyVelocity(en)
        return true
      })

      const { width: W, height: H } = this.p
      const margin = 60
      this.bullets.children.iterate((ch) => {
        const b = ch as Phaser.Physics.Arcade.Image
        if (!b || !b.active) return true
        if (b.x < -margin || b.x > W + margin || b.y < -margin || b.y > H + margin) {
          b.destroy()
        }
        return true
      })
    }
  }
}
