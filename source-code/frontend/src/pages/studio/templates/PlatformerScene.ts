import type { TemplateRuntimePayload } from './templateSceneUtils'
import { cfgHex, cfgNum, hexToPhaserColor } from './templateSceneUtils'

type ManagedChunk = {
  /** Cạnh phải (world px) của platform — dùng để cull. */
  maxX: number
  objects: Phaser.GameObjects.GameObject[]
}

export function buildPlatformerScene(PhaserRef: typeof import('phaser')): typeof Phaser.Scene {
  return class PlatformerScene extends PhaserRef.Scene {
    private p!: TemplateRuntimePayload
    private gravity = 600
    private jumpForce = -500
    private speed = 200
    private playerColor = 0xff6b6b
    private platformColor = 0x4ecdc4
    private coinColor = 0xffe66d
    private spikeColor = 0x8b0000
    private bgColor = 0x87ceeb

    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    private platforms!: Phaser.Physics.Arcade.StaticGroup
    private spikes!: Phaser.Physics.Arcade.StaticGroup
    private coins!: Phaser.Physics.Arcade.StaticGroup

    private score = 0
    private lives = 3
    private readonly maxJumps = 2
    private jumpsRemaining = 2
    private scoreText!: Phaser.GameObjects.Text
    private livesText!: Phaser.GameObjects.Text
    private gameOver = false
    private lastSpikeHitTime = 0
    private readonly spikeCooldownMs = 1100

    private nextSpawnX = 0
    private managedChunks: ManagedChunk[] = []

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private keyA!: Phaser.Input.Keyboard.Key
    private keyD!: Phaser.Input.Keyboard.Key
    private spaceKey!: Phaser.Input.Keyboard.Key
    private keyR?: Phaser.Input.Keyboard.Key

    constructor() {
      super({ key: 'studioPlatformer' })
    }

    init(data: TemplateRuntimePayload) {
      this.p = data
      const tc = data.templateConfig
      this.gravity = cfgNum(tc.gravity, 600)
      this.jumpForce = cfgNum(tc.jumpForce, -500)
      this.speed = cfgNum(tc.speed, 200)
      this.bgColor = hexToPhaserColor(cfgHex(tc.backgroundColor, '#87CEEB'), 0x87ceeb)
      this.playerColor = hexToPhaserColor(cfgHex(tc.playerColor, '#FF6B6B'), 0xff6b6b)
      this.platformColor = hexToPhaserColor(cfgHex(tc.platformColor, '#4ECDC4'), 0x4ecdc4)
      this.coinColor = hexToPhaserColor(cfgHex(tc.coinColor, '#FFE66D'), 0xffe66d)
    }

    private spawnStarterPlatforms(H: number) {
      const floorY = H - 28
      const floorW = 720
      this.addPlatformChunk(floorW / 2, floorY, floorW, 36, false, false)

      const p2x = 420
      const p2y = H * 0.62
      this.addPlatformChunk(p2x, p2y, 200, 22, true, true)

      const p3x = 720
      const p3y = H * 0.48
      this.addPlatformChunk(p3x, p3y, 160, 22, true, false)

      this.nextSpawnX = Math.max(this.nextSpawnX, 900)
    }

    private addPlatformChunk(
      cx: number,
      cy: number,
      pw: number,
      ph: number,
      withCoin: boolean,
      withSpike: boolean,
    ) {
      const plat = this.add.rectangle(cx, cy, pw, ph, this.platformColor)
      this.physics.add.existing(plat, true)
      this.platforms.add(plat)

      const objects: Phaser.GameObjects.GameObject[] = [plat]
      const topY = cy - ph / 2

      if (withCoin) {
        const coin = this.add.rectangle(cx, topY - 22, 20, 20, this.coinColor)
        this.physics.add.existing(coin, true)
        const cb = coin.body as Phaser.Physics.Arcade.StaticBody
        cb.setCircle(10, 10, 10)
        this.coins.add(coin)
        objects.push(coin)
      }

      if (withSpike) {
        const spike = this.add.rectangle(cx, topY - 12, 20, 18, this.spikeColor)
        this.physics.add.existing(spike, true)
        this.spikes.add(spike)
        objects.push(spike)
      }

      this.managedChunks.push({
        maxX: cx + pw / 2,
        objects,
      })
    }

    private spawnUntilAhead(H: number) {
      const W = this.p.width
      const target = this.player.x + W * 2.8
      while (this.nextSpawnX < target) {
        const gap = Phaser.Math.Between(48, 160)
        const pw = Phaser.Math.Between(120, 280)
        const ph = 22
        const minY = Math.floor(H * 0.38)
        const maxY = Math.floor(H * 0.86)
        const cy = Phaser.Math.Between(minY, maxY)
        const cx = this.nextSpawnX + gap + pw / 2
        this.nextSpawnX = cx + pw / 2

        const withCoin = Math.random() < 0.72
        let withSpike = Math.random() < 0.32
        if (withCoin && withSpike && Math.random() < 0.5) withSpike = false
        this.addPlatformChunk(cx, cy, pw, ph, withCoin, withSpike)
      }
    }

    private cullBehindCamera() {
      const left = this.cameras.main.scrollX - 280
      const next: ManagedChunk[] = []
      for (const ch of this.managedChunks) {
        if (ch.maxX < left) {
          for (const o of ch.objects) {
            o.destroy()
          }
        } else {
          next.push(ch)
        }
      }
      this.managedChunks = next
    }

    private triggerGameOver() {
      if (this.gameOver) return
      this.gameOver = true
      this.physics.pause()
      const W = this.p.width
      const H = this.p.height
      this.add
        .text(W / 2, H / 2 - 24, 'GAME OVER', {
          fontSize: '36px',
          color: '#b00020',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(200)
        .setScrollFactor(0)
      this.add
        .text(W / 2, H / 2 + 28, 'Nhấn R để chơi lại', {
          fontSize: '18px',
          color: '#333333',
        })
        .setOrigin(0.5)
        .setDepth(200)
        .setScrollFactor(0)
    }

    private loseLifeFromSpike() {
      const now = this.time.now
      if (now - this.lastSpikeHitTime < this.spikeCooldownMs) return
      this.lastSpikeHitTime = now
      this.lives -= 1
      this.livesText.setText(`Lives: ${this.lives}`)
      const body = this.player.body as Phaser.Physics.Arcade.Body
      body.setVelocityY(this.jumpForce * 0.55)
      if (this.lives <= 0) {
        this.triggerGameOver()
      }
    }

    private collectCoin(a: Phaser.GameObjects.GameObject, b: Phaser.GameObjects.GameObject) {
      const coin = a === this.player ? b : a
      coin.destroy()
      this.score += 10
      this.scoreText.setText(`Score: ${this.score}`)
    }

    create() {
      const { width: W, height: H } = this.p
      this.gameOver = false
      this.score = 0
      this.lives = 3
      this.jumpsRemaining = this.maxJumps
      this.managedChunks = []
      this.nextSpawnX = 0
      this.lastSpikeHitTime = 0

      this.physics.world.gravity.y = this.gravity
      this.cameras.main.setBackgroundColor(this.bgColor)
      this.physics.world.setBounds(0, 0, 1_000_000, H)

      this.platforms = this.physics.add.staticGroup()
      this.spikes = this.physics.add.staticGroup()
      this.coins = this.physics.add.staticGroup()

      const gfx = this.make.graphics({ x: 0, y: 0 }, false)
      gfx.fillStyle(this.playerColor, 1)
      gfx.fillRoundedRect(0, 0, 28, 34, 6)
      gfx.generateTexture('_tplPlatformerPlayer', 28, 34)
      gfx.destroy()

      const startX = 180
      const startY = H * 0.42
      this.player = this.physics.add.sprite(startX, startY, '_tplPlatformerPlayer')
      this.player.setCollideWorldBounds(false)
      ;(this.player.body as Phaser.Physics.Arcade.Body).setMaxVelocity(400, 900)

      this.cameras.main.setBounds(0, 0, 1_000_000, H)
      this.cameras.main.startFollow(this.player, true, 0.12, 0.08)
      this.cameras.main.setDeadzone(W * 0.22, H * 0.35)

      this.scoreText = this.add.text(12, 10, 'Score: 0', {
        fontSize: '18px',
        color: '#1a1a2e',
        fontStyle: 'bold',
      })
      this.scoreText.setDepth(100).setScrollFactor(0)

      this.livesText = this.add.text(12, 34, 'Lives: 3', {
        fontSize: '18px',
        color: '#1a1a2e',
        fontStyle: 'bold',
      })
      this.livesText.setDepth(100).setScrollFactor(0)

      if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys()
        this.keyA = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.A)
        this.keyD = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.D)
        this.spaceKey = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.SPACE)
        this.keyR = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.R)
      }

      this.spawnStarterPlatforms(H)
      this.spawnUntilAhead(H)

      this.physics.add.collider(this.player, this.platforms)
      this.physics.add.overlap(this.player, this.coins, (a, b) =>
        this.collectCoin(a as Phaser.GameObjects.GameObject, b as Phaser.GameObjects.GameObject),
      )
      this.physics.add.overlap(this.player, this.spikes, () => {
        if (!this.gameOver) this.loseLifeFromSpike()
      })
    }

    update() {
      if (this.gameOver) {
        if (this.keyR && PhaserRef.Input.Keyboard.JustDown(this.keyR)) {
          this.scene.restart(this.p)
        }
        return
      }

      const body = this.player.body as Phaser.Physics.Arcade.Body
      const H = this.p.height

      if (body.blocked.down || body.touching.down) {
        this.jumpsRemaining = this.maxJumps
      }

      let vx = 0
      if (this.cursors.left.isDown || this.keyA.isDown) vx = -this.speed
      else if (this.cursors.right.isDown || this.keyD.isDown) vx = this.speed
      body.setVelocityX(vx)

      const jumpPressed =
        PhaserRef.Input.Keyboard.JustDown(this.spaceKey) ||
        PhaserRef.Input.Keyboard.JustDown(this.cursors.up)
      if (jumpPressed && this.jumpsRemaining > 0) {
        body.setVelocityY(this.jumpForce)
        this.jumpsRemaining--
      }

      const camBottom = this.cameras.main.scrollY + this.cameras.main.height + 120
      if (this.player.y > camBottom) {
        this.lives = 0
        this.livesText.setText('Lives: 0')
        this.triggerGameOver()
      }

      this.spawnUntilAhead(H)
      this.cullBehindCamera()
    }
  }
}
