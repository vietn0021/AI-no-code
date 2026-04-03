import type { TemplateRuntimePayload } from './templateSceneUtils'
import { cfgHex, cfgNum, hexToPhaserColor } from './templateSceneUtils'

const COLS = 4
const ROWS = 4
const TOTAL = COLS * ROWS
const PAIRS = TOTAL / 2

type CardSlot = {
  rect: Phaser.GameObjects.Rectangle
  symbol: Phaser.GameObjects.Text
  matched: boolean
  faceUp: boolean
  flipping: boolean
  faceColor: number
}

export function buildMemoryScene(PhaserRef: typeof import('phaser')): typeof Phaser.Scene {
  return class MemoryScene extends PhaserRef.Scene {
    private p!: TemplateRuntimePayload
    private timeLimitSec = 60
    private bgColor = 0x2d3436
    private cardBackColor = 0x6c5ce7

    private cards: CardSlot[] = []
    private firstPick: CardSlot | null = null
    private secondPick: CardSlot | null = null
    private inputLocked = false
    private score = 0
    private timeLeft = 60
    private matchedPairs = 0
    private totalPairs = PAIRS
    private gameOver = false
    private won = false

    private scoreText!: Phaser.GameObjects.Text
    private timerText!: Phaser.GameObjects.Text
    private keyR?: Phaser.Input.Keyboard.Key

    private readonly memPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return
      const hits = this.input.hitTestPointer(pointer)
      const go = hits[0]
      if (!go) return
      const slot = go.getData('memoryCardSlot') as CardSlot | undefined
      if (slot) this.handleCardClick(slot)
    }

    constructor() {
      super({ key: 'studioMemory' })
    }

    init(data: TemplateRuntimePayload) {
      this.p = data
      const tc = data.templateConfig
      this.timeLimitSec = Math.max(10, cfgNum(tc.timeLimit, 60))
      this.bgColor = hexToPhaserColor(cfgHex(tc.backgroundColor, '#2d3436'), 0x2d3436)
      this.cardBackColor = hexToPhaserColor(cfgHex(tc.cardBackColor, '#6c5ce7'), 0x6c5ce7)
    }

    create() {
      const { width: W, height: H } = this.p
      this.gameOver = false
      this.won = false
      this.score = 0
      this.timeLeft = this.timeLimitSec
      this.matchedPairs = 0
      this.totalPairs = PAIRS
      this.firstPick = null
      this.secondPick = null
      this.inputLocked = false
      this.cards = []

      this.cameras.main.setBackgroundColor(this.bgColor)

      this.scoreText = this.add
        .text(16, 16, 'Score: 0', {
          fontSize: '18px',
          color: '#dfe6e9',
          fontStyle: 'bold',
        })
        .setDepth(100)

      this.timerText = this.add
        .text(W - 16, 16, `Time: ${Math.ceil(this.timeLeft)}`, {
          fontSize: '18px',
          color: '#dfe6e9',
          fontStyle: 'bold',
        })
        .setOrigin(1, 0)
        .setDepth(100)

      if (this.input.keyboard) {
        this.keyR = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.R)
      }

      this.input.on('pointerdown', this.memPointerDown, this)
      this.events.once(PhaserRef.Scenes.Events.SHUTDOWN, () => {
        this.input.off('pointerdown', this.memPointerDown, this)
      })

      const padding = 40
      const gap = 10
      const cardW = Math.max(
        24,
        Math.floor((W - padding * 2 - gap * (COLS - 1)) / COLS),
      )
      const cardH = Math.max(
        24,
        Math.floor((H - padding * 2 - gap * (ROWS - 1) - 60) / ROWS),
      )

      const colors = [
        0xe17055, 0x00b894, 0x0984e3, 0xfdcb6e, 0xe84393, 0x00cec9, 0xfd79a8, 0x55efc4,
      ]
      const cardColors = [...colors, ...colors]
      cardColors.sort(() => Math.random() - 0.5)

      const startX = padding + cardW / 2
      const startY = 60 + padding / 2 + cardH / 2

      for (let i = 0; i < TOTAL; i++) {
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const x = startX + col * (cardW + gap)
        const y = startY + row * (cardH + gap)
        const faceColor = cardColors[i]!
        const colorIndex = colors.indexOf(faceColor)
        const slot = this.makeCard(x, y, cardW, cardH, faceColor, colorIndex)
        this.cards.push(slot)
      }
    }

    private makeCard(
      x: number,
      y: number,
      cardW: number,
      cardH: number,
      faceColor: number,
      colorIndex: number,
    ): CardSlot {
      const symbol = String.fromCharCode(65 + (colorIndex >= 0 ? colorIndex : 0))

      const rect = this.add
        .rectangle(x, y, cardW, cardH, this.cardBackColor)
        .setStrokeStyle(3, 0xffffff, 0.35)
        .setInteractive({ useHandCursor: true })

      rect.setData('colorIndex', colorIndex)

      const sym = this.add
        .text(x, y, symbol, {
          fontSize: `${Math.max(14, Math.floor(Math.min(cardW, cardH) * 0.42))}px`,
          color: '#1a1a1a',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setVisible(false)
        .setDepth(rect.depth + 1)

      const slot: CardSlot = {
        rect,
        symbol: sym,
        matched: false,
        faceUp: false,
        flipping: false,
        faceColor,
      }
      rect.setData('memoryCardSlot', slot)
      return slot
    }

    private runFlipReveal(slot: CardSlot, onDone: () => void) {
      this.tweens.add({
        targets: slot.rect,
        scaleX: 0,
        duration: 100,
        onComplete: () => {
          slot.rect.setFillStyle(slot.faceColor, 1)
          slot.symbol.setVisible(true)
          this.tweens.add({
            targets: slot.rect,
            scaleX: 1,
            duration: 100,
            onComplete: onDone,
          })
        },
      })
    }

    private runFlipHide(slot: CardSlot, onDone: () => void) {
      this.tweens.add({
        targets: slot.rect,
        scaleX: 0,
        duration: 100,
        onComplete: () => {
          slot.rect.setFillStyle(this.cardBackColor, 1)
          slot.symbol.setVisible(false)
          this.tweens.add({
            targets: slot.rect,
            scaleX: 1,
            duration: 100,
            onComplete: onDone,
          })
        },
      })
    }

    private handleCardClick(slot: CardSlot) {
      if (this.gameOver || this.won || this.inputLocked) return
      if (slot.matched || slot.faceUp || slot.flipping) return

      slot.flipping = true
      this.runFlipReveal(slot, () => {
        slot.flipping = false
        slot.faceUp = true
        this.afterCardRevealed(slot)
      })
    }

    private afterCardRevealed(slot: CardSlot) {
      if (!this.firstPick) {
        this.firstPick = slot
        return
      }
      if (this.firstPick === slot) return

      this.secondPick = slot
      this.inputLocked = true

      const aIdx = this.firstPick.rect.getData('colorIndex') as number
      const bIdx = this.secondPick.rect.getData('colorIndex') as number
      const match =
        aIdx === bIdx && aIdx >= 0 && this.firstPick.faceColor === this.secondPick.faceColor

      if (match) {
        this.firstPick.matched = true
        this.secondPick.matched = true
        this.score += 20
        this.scoreText.setText(`Score: ${this.score}`)
        this.matchedPairs++
        this.firstPick = null
        this.secondPick = null
        this.inputLocked = false
        if (this.matchedPairs >= this.totalPairs) {
          this.triggerWin()
        }
      } else {
        const a = this.firstPick
        const b = this.secondPick
        this.time.delayedCall(1000, () => {
          let done = 0
          const finishHide = () => {
            done++
            if (done < 2) return
            a.faceUp = false
            b.faceUp = false
            this.firstPick = null
            this.secondPick = null
            this.inputLocked = false
          }
          this.runFlipHide(a, finishHide)
          this.runFlipHide(b, finishHide)
        })
      }
    }

    private triggerWin() {
      if (this.won || this.gameOver) return
      this.won = true
      const { width: W, height: H } = this.p
      this.add
        .text(W / 2, H / 2 - 16, 'YOU WIN! 🎉', {
          fontSize: '34px',
          color: '#55efc4',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(200)
      this.add
        .text(W / 2, H / 2 + 36, 'Nhấn R để chơi lại', {
          fontSize: '18px',
          color: '#b2bec3',
        })
        .setOrigin(0.5)
        .setDepth(200)
    }

    private triggerGameOver() {
      if (this.gameOver || this.won) return
      this.gameOver = true
      const { width: W, height: H } = this.p
      this.add
        .text(W / 2, H / 2 - 16, 'GAME OVER', {
          fontSize: '34px',
          color: '#ff7675',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(200)
      this.add
        .text(W / 2, H / 2 + 36, 'Hết giờ — Nhấn R để chơi lại', {
          fontSize: '18px',
          color: '#b2bec3',
        })
        .setOrigin(0.5)
        .setDepth(200)
    }

    update(_t: number, dt: number) {
      if (
        this.keyR &&
        PhaserRef.Input.Keyboard.JustDown(this.keyR) &&
        (this.gameOver || this.won)
      ) {
        this.scene.restart(this.p)
        return
      }

      if (this.gameOver || this.won) return

      this.timeLeft -= dt / 1000
      if (this.timeLeft <= 0) {
        this.timeLeft = 0
        this.timerText.setText('Time: 0')
        this.triggerGameOver()
        return
      }
      this.timerText.setText(`Time: ${Math.ceil(this.timeLeft)}`)
    }
  }
}
