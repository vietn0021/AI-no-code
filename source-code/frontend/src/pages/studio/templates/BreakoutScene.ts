import type { TemplateRuntimePayload } from './templateSceneUtils'
import { cfgHex, cfgNum, hexToPhaserColor } from './templateSceneUtils'

export function buildBreakoutScene(PhaserRef: typeof import('phaser')): typeof Phaser.Scene {
  return class BreakoutScene extends PhaserRef.Scene {
    private p!: TemplateRuntimePayload
    private ballSpeed = 300
    private paddleSpeed = 400
    private bgColor = 0x0f0f23
    private ballColor = 0xffffff
    private paddleColor = 0x00aaff
    private brickColors: number[] = [0xff0000, 0xff8800, 0xffff00, 0x00ff00]
    private paddle!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    private ball!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    private bricks!: Phaser.Physics.Arcade.StaticGroup
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private keyA!: Phaser.Input.Keyboard.Key
    private keyD!: Phaser.Input.Keyboard.Key
    private keyR?: Phaser.Input.Keyboard.Key
    private scoreText!: Phaser.GameObjects.Text
    private score = 0
    private gameOver = false
    private won = false

    constructor() {
      super({ key: 'studioBreakout' })
    }

    init(data: TemplateRuntimePayload) {
      this.p = data
      const tc = data.templateConfig
      this.ballSpeed = cfgNum(tc.ballSpeed, 300)
      this.paddleSpeed = cfgNum(tc.paddleSpeed, 400)
      this.bgColor = hexToPhaserColor(cfgHex(tc.backgroundColor, '#0f0f23'), 0x0f0f23)
      this.ballColor = hexToPhaserColor(cfgHex(tc.ballColor, '#ffffff'), 0xffffff)
      this.paddleColor = hexToPhaserColor(cfgHex(tc.paddleColor, '#00aaff'), 0x00aaff)
      const bc = tc.brickColors
      if (Array.isArray(bc) && bc.length > 0) {
        this.brickColors = bc.map((c) =>
          typeof c === 'string' ? hexToPhaserColor(c, 0xff0000) : this.brickColors[0]!,
        )
      }
    }

    create() {
      const { width: W, height: H } = this.p
      this.gameOver = false
      this.won = false
      this.score = 0

      this.physics.world.gravity.y = 0
      this.cameras.main.setBackgroundColor(this.bgColor)
      this.physics.world.setBounds(0, 0, W, H)

      const g = this.make.graphics({ x: 0, y: 0 }, false)
      g.fillStyle(this.ballColor, 1)
      g.fillCircle(10, 10, 9)
      g.generateTexture('_tplBall', 20, 20)
      g.clear()
      g.fillStyle(this.paddleColor, 1)
      g.fillRoundedRect(0, 0, 100, 16, 4)
      g.generateTexture('_tplPaddle', 100, 16)
      g.destroy()

      this.paddle = this.physics.add.sprite(W / 2, H - 36, '_tplPaddle')
      this.paddle.setCollideWorldBounds(true)
      this.paddle.body.setImmovable(true)
      this.paddle.body.allowGravity = false

      this.ball = this.physics.add.sprite(W / 2, H - 80, '_tplBall')
      this.ball.body.setAllowGravity(false)
      ;(this.ball.body as Phaser.Physics.Arcade.Body).setCircle(9, 1, 1)

      const ballBody = this.ball.body as Phaser.Physics.Arcade.Body
      ballBody.checkCollision.none = false
      ballBody.checkCollision.up = true
      ballBody.checkCollision.down = true
      ballBody.checkCollision.left = true
      ballBody.checkCollision.right = true

      this.ball.setCollideWorldBounds(true)
      this.ball.setBounce(1, 1)
      ballBody.setMaxVelocity(400, 400)

      const angle = Phaser.Math.DegToRad(-70)
      ballBody.setVelocity(
        Math.cos(angle) * this.ballSpeed,
        Math.sin(angle) * this.ballSpeed,
      )

      this.bricks = this.physics.add.staticGroup()
      const cols = 8
      const rows = 5
      const bw = Math.min(64, (W - 48) / cols)
      const bh = 22
      const topY = 70
      const startX = (W - cols * (bw + 6)) / 2 + bw / 2

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * (bw + 6)
          const y = topY + r * (bh + 6)
          const color = this.brickColors[r % this.brickColors.length]!
          const b = this.add.rectangle(x, y, bw, bh, color)
          this.physics.add.existing(b, true)
          this.bricks.add(b)
        }
      }

      this.physics.add.collider(
        this.ball,
        this.paddle,
        () => {
          const dx = this.ball.x - this.paddle.x
          const max = this.paddle.displayWidth / 2
          const n = Phaser.Math.Clamp(dx / max, -1, 1)
          const bounceAngle = Phaser.Math.DegToRad(-90 + n * 60)
          const v = Math.hypot(this.ball.body.velocity.x, this.ball.body.velocity.y) || this.ballSpeed
          this.ball.body.setVelocity(Math.cos(bounceAngle) * v, Math.sin(bounceAngle) * v)
        },
        undefined,
        this,
      )

      this.scoreText = this.add.text(12, 10, 'Score: 0', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      this.scoreText.setDepth(50)
      this.scoreText.setScrollFactor(0)

      if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys()
        this.keyA = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.A)
        this.keyD = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.D)
        this.keyR = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.R)
      }
    }

    private winGame() {
      if (this.won || this.gameOver) return
      this.won = true
      this.gameOver = true
      this.physics.pause()
      const { width: W, height: H } = this.p
      this.add
        .text(W / 2, H / 2 - 10, 'YOU WIN!', {
          fontSize: '32px',
          color: '#00ff88',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(200)
      this.add
        .text(W / 2, H / 2 + 36, 'Nhấn R để chơi lại', {
          fontSize: '16px',
          color: '#cccccc',
        })
        .setOrigin(0.5)
        .setDepth(200)
    }

    private hitBrick(
      ball: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
      brick: Phaser.GameObjects.Rectangle,
    ) {
      if (this.gameOver) return
      const body = ball.body as Phaser.Physics.Arcade.Body
      const fromLeft = Math.abs(ball.x - brick.x - brick.width / 2)
      const fromTop = Math.abs(ball.y - brick.y - brick.height / 2)
      if (fromLeft > fromTop) body.velocity.x *= -1
      else body.velocity.y *= -1
      brick.destroy()
      this.score += 10
      this.scoreText.setText('Score: ' + this.score)
      if (this.bricks.countActive(true) === 0) {
        this.winGame()
      }
    }

    private loseGame() {
      if (this.gameOver) return
      this.gameOver = true
      this.physics.pause()
      const { width: W, height: H } = this.p
      this.add
        .text(W / 2, H / 2 - 16, 'GAME OVER', {
          fontSize: '28px',
          color: '#ff6666',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(200)
      this.add
        .text(W / 2, H / 2 + 22, 'Nhấn R để chơi lại', {
          fontSize: '16px',
          color: '#eeeeee',
        })
        .setOrigin(0.5)
        .setDepth(200)
    }

    update(_t: number, delta: number) {
      const { width: W, height: H } = this.p
      const dt = delta / 1000

      if (this.gameOver) {
        if (this.keyR && PhaserRef.Input.Keyboard.JustDown(this.keyR)) {
          this.physics.resume()
          this.scene.restart(this.p)
        }
        return
      }

      this.physics.overlap(
        this.ball,
        this.bricks,
        (o1, o2) => {
          this.hitBrick(
            o1 as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
            o2 as Phaser.GameObjects.Rectangle,
          )
        },
        undefined,
        this,
      )

      const speed = this.ballSpeed
      const vel = this.ball.body.velocity
      const currentSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y)
      if (currentSpeed > 0) {
        this.ball.body.velocity.x = (vel.x / currentSpeed) * speed
        this.ball.body.velocity.y = (vel.y / currentSpeed) * speed
      }

      let vx = 0
      if (this.cursors.left.isDown || this.keyA.isDown) vx = -this.paddleSpeed
      else if (this.cursors.right.isDown || this.keyD.isDown) vx = this.paddleSpeed

      if (this.input.activePointer.isDown) {
        const px = this.input.activePointer.x
        const target = Phaser.Math.Clamp(px, this.paddle.displayWidth / 2, W - this.paddle.displayWidth / 2)
        const dx = target - this.paddle.x
        this.paddle.x += Phaser.Math.Clamp(dx, -this.paddleSpeed * dt * 2, this.paddleSpeed * dt * 2)
      } else {
        this.paddle.x += vx * dt
      }
      this.paddle.x = Phaser.Math.Clamp(
        this.paddle.x,
        this.paddle.displayWidth / 2,
        W - this.paddle.displayWidth / 2,
      )
      ;(this.paddle.body as Phaser.Physics.Arcade.Body).updateFromGameObject()

      if (this.ball.y > H + 20) {
        this.loseGame()
      }
    }
  }
}
