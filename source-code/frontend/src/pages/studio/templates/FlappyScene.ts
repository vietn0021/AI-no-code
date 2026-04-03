import type { TemplateRuntimePayload } from './templateSceneUtils'
import { cfgHex, cfgNum, hexToPhaserColor } from './templateSceneUtils'

type PipePair = {
  top: Phaser.GameObjects.Rectangle
  bottom: Phaser.GameObjects.Rectangle
  scored: boolean
}

export function buildFlappyScene(PhaserRef: typeof import('phaser')): typeof Phaser.Scene {
  return class FlappyScene extends PhaserRef.Scene {
    private p!: TemplateRuntimePayload
    private gravity = 800
    private flapForce = -350
    private pipeSpeed = 200
    private pipeGap = 150
    private pipeW = 72
    private spawnEveryPx = 260
    private bird!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    private pipes: PipePair[] = []
    private score = 0
    private scoreText!: Phaser.GameObjects.Text
    private gameOver = false
    private groundY = 0
    private ceilingY = 0
    private bgColor = 0x87ceeb
    private birdColor = 0xffd700
    private pipeColor = 0x228b22
    private keyR?: Phaser.Input.Keyboard.Key
    private spaceKey!: Phaser.Input.Keyboard.Key
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

    constructor() {
      super({ key: 'studioFlappy' })
    }

    init(data: TemplateRuntimePayload) {
      this.p = data
      const tc = data.templateConfig
      this.gravity = cfgNum(tc.gravity, 800)
      this.flapForce = cfgNum(tc.flapForce, -350)
      this.pipeSpeed = cfgNum(tc.pipeSpeed, 200)
      this.bgColor = hexToPhaserColor(cfgHex(tc.backgroundColor, '#87CEEB'), 0x87ceeb)
      this.birdColor = hexToPhaserColor(cfgHex(tc.birdColor, '#FFD700'), 0xffd700)
      this.pipeColor = hexToPhaserColor(cfgHex(tc.pipeColor, '#228B22'), 0x228b22)
    }

    create() {
      const { width: W, height: H } = this.p
      this.gameOver = false
      this.score = 0
      this.pipes = []

      this.physics.world.gravity.y = this.gravity
      this.cameras.main.setBackgroundColor(this.bgColor)

      const g = this.make.graphics({ x: 0, y: 0 }, false)
      g.fillStyle(this.birdColor, 1)
      g.fillCircle(18, 18, 16)
      g.generateTexture('_tplBird', 36, 36)
      g.destroy()

      this.ceilingY = 24
      this.groundY = H - 28
      this.bird = this.physics.add.sprite(W * 0.28, H * 0.45, '_tplBird')
      this.bird.setCollideWorldBounds(true)
      this.bird.body.setAllowGravity(true)
      ;(this.bird.body as Phaser.Physics.Arcade.Body).setCircle(15, 3, 3)

      this.physics.world.setBounds(0, this.ceilingY, W, this.groundY - this.ceilingY)

      this.scoreText = this.add.text(12, 10, 'Score: 0', {
        fontSize: '20px',
        color: '#1a1a2e',
        fontStyle: 'bold',
      })
      this.scoreText.setDepth(50)
      this.scoreText.setScrollFactor(0)

      this.add.rectangle(W / 2, H - 8, W, 24, 0x8b4513).setDepth(2)

      if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys()
        this.spaceKey = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.SPACE)
        this.keyR = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.R)
      }

      this.spawnPipePair(W + 40)
    }

    private flap() {
      if (this.gameOver) return
      ;(this.bird.body as Phaser.Physics.Arcade.Body).setVelocityY(this.flapForce)
    }

    private spawnPipePair(x: number) {
      const { height: H } = this.p
      const margin = 80
      const gapHalf = this.pipeGap / 2
      const centerY = Phaser.Math.Between(margin + gapHalf, H - margin - gapHalf - 32)

      const topH = centerY - gapHalf - this.ceilingY
      const top = this.add.rectangle(x, this.ceilingY + topH / 2, this.pipeW, topH, this.pipeColor)
      this.physics.add.existing(top, true)

      const bottomTop = centerY + gapHalf
      const bottomH = this.groundY - bottomTop
      const bottom = this.add.rectangle(x, bottomTop + bottomH / 2, this.pipeW, bottomH, this.pipeColor)
      this.physics.add.existing(bottom, true)

      this.pipes.push({ top, bottom, scored: false })
    }

    private overlapsRect(
      bx: number,
      by: number,
      br: number,
      rx: number,
      ry: number,
      rw: number,
      rh: number,
    ): boolean {
      const closestX = Phaser.Math.Clamp(bx, rx - rw / 2, rx + rw / 2)
      const closestY = Phaser.Math.Clamp(by, ry - rh / 2, ry + rh / 2)
      const dx = bx - closestX
      const dy = by - closestY
      return dx * dx + dy * dy < br * br
    }

    private endGame() {
      if (this.gameOver) return
      this.gameOver = true
      this.physics.pause()
      const { width: W, height: H } = this.p
      this.add
        .text(W / 2, H / 2 - 16, 'GAME OVER', {
          fontSize: '28px',
          color: '#b00020',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(200)
      this.add
        .text(W / 2, H / 2 + 24, 'Nhấn R để chơi lại', {
          fontSize: '15px',
          color: '#333333',
        })
        .setOrigin(0.5)
        .setDepth(200)
    }

    update(_t: number, delta: number) {
      const dt = delta / 1000
      const { width: W } = this.p

      if (this.gameOver) {
        if (this.keyR && PhaserRef.Input.Keyboard.JustDown(this.keyR)) {
          this.physics.resume()
          this.scene.restart(this.p)
        }
        return
      }

      if (PhaserRef.Input.Keyboard.JustDown(this.spaceKey) || PhaserRef.Input.Keyboard.JustDown(this.cursors.up)) {
        this.flap()
      }

      const move = this.pipeSpeed * dt
      let rightmost = -9999
      for (const pair of this.pipes) {
        pair.top.x -= move
        pair.bottom.x -= move
        ;(pair.top.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject()
        ;(pair.bottom.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject()
        rightmost = Math.max(rightmost, pair.top.x + this.pipeW / 2)

        if (!pair.scored && pair.top.x + this.pipeW / 2 < this.bird.x) {
          pair.scored = true
          this.score += 1
          this.scoreText.setText(`Score: ${this.score}`)
        }
      }

      this.pipes = this.pipes.filter((pair) => pair.top.x > -this.pipeW)

      if (rightmost < W - this.spawnEveryPx) {
        this.spawnPipePair(W + this.pipeW)
      }

      const bx = this.bird.x
      const by = this.bird.y
      const br = 14

      for (const pair of this.pipes) {
        const tw = pair.top.width
        const th = pair.top.height
        if (
          this.overlapsRect(bx, by, br, pair.top.x, pair.top.y, tw, th) ||
          this.overlapsRect(bx, by, br, pair.bottom.x, pair.bottom.y, pair.bottom.width, pair.bottom.height)
        ) {
          this.endGame()
          return
        }
      }

      if (by < this.ceilingY + br || by > this.groundY - br) {
        this.endGame()
      }
    }
  }
}
