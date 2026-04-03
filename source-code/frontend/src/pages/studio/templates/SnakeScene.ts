import type { TemplateRuntimePayload } from './templateSceneUtils'
import { cfgHex, cfgNum, hexToPhaserColor } from './templateSceneUtils'

type GridPoint = { gx: number; gy: number }

export function buildSnakeScene(PhaserRef: typeof import('phaser')): typeof Phaser.Scene {
  return class SnakeScene extends PhaserRef.Scene {
    private p!: TemplateRuntimePayload
    private cellPx = 20
    private moveIntervalMs = 150
    private cols = 0
    private rows = 0
    private offsetX = 0
    private offsetY = 0
    private snake: GridPoint[] = []
    private dir: GridPoint = { gx: 1, gy: 0 }
    private nextDir: GridPoint = { gx: 1, gy: 0 }
    private food: GridPoint = { gx: 0, gy: 0 }
    private snakeColor = 0x00ff88
    private foodColor = 0xff4444
    private bgColor = 0x1a1a2e
    private moveAcc = 0
    private score = 0
    private scoreText!: Phaser.GameObjects.Text
    private goText?: Phaser.GameObjects.Text
    private subText?: Phaser.GameObjects.Text
    private gameOver = false
    private graphics!: Phaser.GameObjects.Graphics
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private keyW!: Phaser.Input.Keyboard.Key
    private keyA!: Phaser.Input.Keyboard.Key
    private keyS!: Phaser.Input.Keyboard.Key
    private keyD!: Phaser.Input.Keyboard.Key
    private keyR?: Phaser.Input.Keyboard.Key

    constructor() {
      super({ key: 'studioSnake' })
    }

    init(data: TemplateRuntimePayload) {
      this.p = data
      const tc = data.templateConfig
      this.cellPx = Math.max(8, Math.round(cfgNum(tc.gridSize, 20)))
      this.moveIntervalMs = Math.max(40, cfgNum(tc.speed, 150))
      this.snakeColor = hexToPhaserColor(cfgHex(tc.snakeColor, '#00ff88'), 0x00ff88)
      this.foodColor = hexToPhaserColor(cfgHex(tc.foodColor, '#ff4444'), 0xff4444)
      this.bgColor = hexToPhaserColor(cfgHex(tc.backgroundColor, '#1a1a2e'), 0x1a1a2e)
    }

    create() {
      const { width: W, height: H } = this.p
      this.gameOver = false
      this.moveAcc = 0
      this.score = 0
      this.goText?.destroy()
      this.subText?.destroy()
      this.goText = undefined
      this.subText = undefined

      this.cameras.main.setBackgroundColor(this.bgColor)
      this.cols = Math.floor(W / this.cellPx)
      this.rows = Math.floor(H / this.cellPx)
      this.offsetX = (W - this.cols * this.cellPx) / 2
      this.offsetY = (H - this.rows * this.cellPx) / 2

      const mx = Math.floor(this.cols / 2)
      const my = Math.floor(this.rows / 2)
      this.snake = [
        { gx: mx - 1, gy: my },
        { gx: mx - 2, gy: my },
        { gx: mx - 3, gy: my },
      ]
      this.dir = { gx: 1, gy: 0 }
      this.nextDir = { ...this.dir }
      this.spawnFood()

      this.graphics = this.add.graphics()
      this.graphics.setDepth(1)

      this.scoreText = this.add.text(12, 10, 'Score: 0', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      this.scoreText.setDepth(50)
      this.scoreText.setScrollFactor(0)

      if (!this.input.keyboard) return
      this.cursors = this.input.keyboard.createCursorKeys()
      this.keyW = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.W)
      this.keyA = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.A)
      this.keyS = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.S)
      this.keyD = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.D)
      this.keyR = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.R)

      this.drawAll()
    }

    private tryTurn(dx: number, dy: number) {
      if (this.dir.gx === -dx && this.dir.gy === -dy) return
      this.nextDir = { gx: dx, gy: dy }
    }

    private pollInput() {
      if (!this.input.keyboard) return
      const K = PhaserRef.Input.Keyboard
      if (K.JustDown(this.cursors.left) || K.JustDown(this.keyA)) this.tryTurn(-1, 0)
      else if (K.JustDown(this.cursors.right) || K.JustDown(this.keyD)) this.tryTurn(1, 0)
      else if (K.JustDown(this.cursors.up) || K.JustDown(this.keyW)) this.tryTurn(0, -1)
      else if (K.JustDown(this.cursors.down) || K.JustDown(this.keyS)) this.tryTurn(0, 1)
    }

    private spawnFood() {
      const taken = new Set(this.snake.map((s) => `${s.gx},${s.gy}`))
      let tries = 0
      while (tries++ < this.cols * this.rows * 2) {
        const gx = Phaser.Math.Between(0, this.cols - 1)
        const gy = Phaser.Math.Between(0, this.rows - 1)
        if (!taken.has(`${gx},${gy}`)) {
          this.food = { gx, gy }
          return
        }
      }
      this.food = { gx: 0, gy: 0 }
    }

    private gridToPx(gx: number, gy: number): { x: number; y: number } {
      return {
        x: this.offsetX + gx * this.cellPx + this.cellPx / 2,
        y: this.offsetY + gy * this.cellPx + this.cellPx / 2,
      }
    }

    private drawAll() {
      const g = this.graphics
      g.clear()
      const pad = 1
      const s = this.cellPx - pad * 2

      for (const seg of this.snake) {
        const { x, y } = this.gridToPx(seg.gx, seg.gy)
        g.fillStyle(this.snakeColor, 1)
        g.fillRect(
          x - this.cellPx / 2 + pad,
          y - this.cellPx / 2 + pad,
          s,
          s,
        )
      }

      const f = this.gridToPx(this.food.gx, this.food.gy)
      g.fillStyle(this.foodColor, 1)
      g.fillRect(
        f.x - this.cellPx / 2 + pad,
        f.y - this.cellPx / 2 + pad,
        s,
        s,
      )
    }

    private step() {
      this.dir = { ...this.nextDir }
      const head = this.snake[0]!
      const nx = head.gx + this.dir.gx
      const ny = head.gy + this.dir.gy

      if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
        this.endGame()
        return
      }

      if (this.snake.some((s) => s.gx === nx && s.gy === ny)) {
        this.endGame()
        return
      }

      const newHead: GridPoint = { gx: nx, gy: ny }
      const ate = nx === this.food.gx && ny === this.food.gy
      this.snake.unshift(newHead)
      if (ate) {
        this.score += 10
        this.scoreText.setText(`Score: ${this.score}`)
        this.spawnFood()
      } else {
        this.snake.pop()
      }
      this.drawAll()
    }

    private endGame() {
      if (this.gameOver) return
      this.gameOver = true
      const { width: W, height: H } = this.p
      this.goText = this.add
        .text(W / 2, H / 2 - 20, 'GAME OVER', {
          fontSize: '28px',
          color: '#ff6666',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(200)
      this.subText = this.add
        .text(W / 2, H / 2 + 22, 'Nhấn R để chơi lại', {
          fontSize: '16px',
          color: '#eeeeee',
        })
        .setOrigin(0.5)
        .setDepth(200)
    }

    update(_t: number, delta: number) {
      if (this.gameOver) {
        if (this.keyR && PhaserRef.Input.Keyboard.JustDown(this.keyR)) {
          this.scene.restart(this.p)
        }
        return
      }

      this.pollInput()
      this.moveAcc += delta
      while (this.moveAcc >= this.moveIntervalMs) {
        this.moveAcc -= this.moveIntervalMs
        this.step()
        if (this.gameOver) break
      }
    }
  }
}
