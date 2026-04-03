import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { cn } from '../../../lib/utils'
import { useEditorStore, type GameEntity } from '../../../store/useEditorStore'
import {
  normalizeShape,
  resolveEntityColor,
  resolveEntityPosition,
  resolveEntitySize,
} from '../lib/entityView'
import { buildBreakoutScene } from '../templates/BreakoutScene'
import { buildFlappyScene } from '../templates/FlappyScene'
import { buildMemoryScene } from '../templates/MemoryScene'
import { buildPlatformerScene } from '../templates/PlatformerScene'
import { buildShooterScene } from '../templates/ShooterScene'
import { buildSnakeScene } from '../templates/SnakeScene'
import type { TemplateRuntimePayload } from '../templates/templateSceneUtils'
import {
  buildBehaviorScene,
  gameConfigUsesBehaviors,
  parseBehaviorLives,
  parseBehaviorRules,
  type BehaviorRuntimePayload,
} from './BehaviorRuntime'

type GameRuntimeProps = {
  className?: string
}

function hexToPhaserColor(hex: string | undefined, fallback: number): number {
  const raw = (hex && hex.trim()) || ''
  let t = raw.startsWith('#') ? raw.slice(1) : raw
  if (t.length === 3) {
    t = t[0]! + t[0]! + t[1]! + t[1]! + t[2]! + t[2]!
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(t)) return fallback
  return parseInt(t, 16)
}

function isPlayerEntity(e: GameEntity): boolean {
  return String(e.type ?? '')
    .trim()
    .toLowerCase() === 'player'
}

function isPlatformOrGroundEntity(e: GameEntity): boolean {
  const t = String(e.type ?? '')
    .trim()
    .toLowerCase()
  return t === 'platform' || t === 'ground'
}

function isCollectibleEntity(e: GameEntity): boolean {
  return String(e.type ?? '')
    .trim()
    .toLowerCase() === 'collectible'
}

function isGoalEntity(e: GameEntity): boolean {
  return String(e.type ?? '')
    .trim()
    .toLowerCase() === 'goal'
}

function isEnemyEntity(e: GameEntity): boolean {
  return String(e.type ?? '')
    .trim()
    .toLowerCase() === 'enemy'
}

function textureKeyForEntity(id: string): string {
  return `studio_ent_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`
}

/** URL dùng cho Phaser Loader: data/blob/http(s) giữ nguyên; `/uploads/...` → origin backend. */
function resolvePhaserImageUrl(url: string): string {
  const u = url.trim()
  if (u.startsWith('//')) {
    return `${window.location.protocol}${u}`
  }
  if (/^(https?:|data:|blob:)/i.test(u)) {
    return u
  }
  const path = u.startsWith('/') ? u : `/${u}`
  return `${window.location.protocol}//${window.location.hostname}:3001${path}`
}

type RuntimePayload = {
  width: number
  height: number
  backgroundColor: number
  entities: GameEntity[]
}

function buildRuntimeScene(PhaserRef: typeof Phaser): typeof Phaser.Scene {
  return class StudioRuntimeScene extends PhaserRef.Scene {
    private p!: RuntimePayload
    /** Vật thể điều khiển (entity `player` đầu tiên). */
    private playerGO: Phaser.GameObjects.GameObject | null = null
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private keyW!: Phaser.Input.Keyboard.Key
    private keyA!: Phaser.Input.Keyboard.Key
    private keyD!: Phaser.Input.Keyboard.Key
    private keyR?: Phaser.Input.Keyboard.Key
    private speed = 240
    private score = 0
    private scoreText!: Phaser.GameObjects.Text
    private gameOver = false

    constructor() {
      super({ key: 'studioRuntime' })
    }

    init(data: RuntimePayload) {
      this.p = data
      this.gameOver = false
    }

    preload() {
      const { entities } = this.p
      for (const e of entities) {
        const url = typeof e.assetUrl === 'string' ? e.assetUrl.trim() : ''
        if (!url) continue
        const key = textureKeyForEntity(e.id)
        this.load.image(key, resolvePhaserImageUrl(url))
      }
    }

    private createEntityTexture(
      id: string,
      w: number,
      h: number,
      color: number,
      shape: string,
    ): string {
      const key = `${textureKeyForEntity(id)}_shape`
      if (this.textures.exists(key)) {
        return key
      }

      const wi = Math.max(1, Math.round(w))
      const hi = Math.max(1, Math.round(h))
      const g = this.make.graphics({ x: 0, y: 0 }, false)
      g.fillStyle(color, 1)

      const s = normalizeShape(shape)
      if (s === 'circle') {
        const r = Math.min(wi, hi) / 2
        g.fillCircle(wi / 2, hi / 2, r)
      } else if (s === 'triangle') {
        g.fillTriangle(wi / 2, 0, 0, hi, wi, hi)
      } else {
        g.fillRect(0, 0, wi, hi)
      }

      g.generateTexture(key, wi, hi)
      g.destroy()
      return key
    }

    private addStaticTexturedSprite(
      group: Phaser.Physics.Arcade.StaticGroup,
      cx: number,
      cy: number,
      w: number,
      h: number,
      color: number,
      shapeStr: string,
      entityId: string,
      loadedTexKey: string,
      hasTex: boolean,
    ) {
      const shapeNorm = normalizeShape(shapeStr)
      const frameKey = hasTex
        ? loadedTexKey
        : this.createEntityTexture(entityId, w, h, color, shapeStr)
      const spr = this.physics.add.staticSprite(cx, cy, frameKey)
      if (hasTex) {
        spr.setDisplaySize(w, h)
      }
      spr.refreshBody()
      if (shapeNorm === 'circle') {
        const r = Math.max(4, Math.min(w, h) / 2)
        ;(spr.body as Phaser.Physics.Arcade.StaticBody).setCircle(r)
      }
      group.add(spr)
    }

    private triggerLose() {
      if (this.gameOver) return
      this.gameOver = true
      const { width: W, height: H } = this.p
      this.physics.pause()
      this.add
        .text(W / 2, H / 2, 'GAME OVER', {
          fontSize: '32px',
          color: '#cc0000',
        })
        .setOrigin(0.5)
        .setDepth(200)
      this.add
        .text(W / 2, H / 2 + 48, 'Nhấn R để chơi lại', {
          fontSize: '18px',
          color: '#666666',
        })
        .setOrigin(0.5)
        .setDepth(200)
    }

    create() {
      const { width: W, height: H, entities, backgroundColor } = this.p
      this.gameOver = false
      this.cameras.main.setBackgroundColor(backgroundColor)
      this.physics.world.setBounds(0, 0, W, H)

      const staticGroup = this.physics.add.staticGroup()
      const collectibleGroup = this.physics.add.staticGroup()
      const goalGroup = this.physics.add.staticGroup()
      const enemyGroup = this.physics.add.staticGroup()
      let primaryPlayerAssigned = false

      for (const e of entities) {
        const { x: xp, y: yp } = resolveEntityPosition(e)
        const { w, h } = resolveEntitySize(e)
        const cx = (xp / 100) * W
        const cy = (yp / 100) * H
        const color = hexToPhaserColor(resolveEntityColor(e), 0x94a3b8)
        const url = typeof e.assetUrl === 'string' ? e.assetUrl.trim() : ''
        const texKey = textureKeyForEntity(e.id)
        const hasTex = url.length > 0 && this.textures.exists(texKey)

        const isPrimaryPlayer = isPlayerEntity(e) && !primaryPlayerAssigned
        const shapeStr = String(e.shapeType ?? 'Square')

        if (isPrimaryPlayer) {
          primaryPlayerAssigned = true
          const frameKey = hasTex
            ? texKey
            : this.createEntityTexture(e.id, w, h, color, shapeStr)
          const spr = this.physics.add.sprite(cx, cy, frameKey)
          if (hasTex) {
            spr.setDisplaySize(w, h)
          }
          spr.setCollideWorldBounds(true)
          if (normalizeShape(shapeStr) === 'circle') {
            const r = Math.max(4, Math.min(w, h) / 2)
            ;(spr.body as Phaser.Physics.Arcade.Body).setCircle(r)
          }
          this.playerGO = spr
          continue
        }

        if (isCollectibleEntity(e)) {
          this.addStaticTexturedSprite(
            collectibleGroup,
            cx,
            cy,
            w,
            h,
            color,
            shapeStr,
            e.id,
            texKey,
            hasTex,
          )
          continue
        }

        if (isGoalEntity(e)) {
          this.addStaticTexturedSprite(
            goalGroup,
            cx,
            cy,
            w,
            h,
            color,
            shapeStr,
            e.id,
            texKey,
            hasTex,
          )
          continue
        }

        if (isEnemyEntity(e)) {
          this.addStaticTexturedSprite(
            enemyGroup,
            cx,
            cy,
            w,
            h,
            color,
            shapeStr,
            e.id,
            texKey,
            hasTex,
          )
          continue
        }

        this.addStaticTexturedSprite(
          staticGroup,
          cx,
          cy,
          w,
          h,
          color,
          shapeStr,
          e.id,
          texKey,
          hasTex,
        )
      }

      const hasPlatformOrGround = entities.some(isPlatformOrGroundEntity)
      if (!hasPlatformOrGround) {
        const ground = this.add.rectangle(W / 2, H - 10, W, 20, 0x000000)
        ground.setAlpha(0)
        this.physics.add.existing(ground, true)
        staticGroup.add(ground)
      }

      this.score = 0
      this.scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '20px',
        color: '#333333',
      })
      this.scoreText.setDepth(100)
      this.scoreText.setScrollFactor(0)

      if (this.playerGO) {
        this.physics.add.collider(this.playerGO, staticGroup)
        this.physics.add.overlap(
          this.playerGO,
          collectibleGroup,
          (_player, item) => {
            ;(item as Phaser.GameObjects.GameObject).destroy()
            this.score += 10
            this.scoreText.setText('Score: ' + this.score)
          },
        )
        this.physics.add.overlap(this.playerGO, goalGroup, () => {
          if (this.gameOver) return
          this.gameOver = true
          this.physics.pause()
          this.add
            .text(W / 2, H / 2, 'YOU WIN! 🎉', {
              fontSize: '32px',
              color: '#00aa00',
            })
            .setOrigin(0.5)
            .setDepth(200)
        })
        this.physics.add.overlap(this.playerGO, enemyGroup, () => {
          this.triggerLose()
        })
      }

      if (!this.input.keyboard) {
        return
      }
      this.cursors = this.input.keyboard.createCursorKeys()
      this.keyW = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.W)
      this.keyA = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.A)
      this.keyD = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.D)
      this.keyR = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.R)
    }

    update() {
      if (
        this.gameOver &&
        this.keyR &&
        Phaser.Input.Keyboard.JustDown(this.keyR)
      ) {
        this.scene.restart(this.p)
        return
      }

      const body = this.playerGO?.body as Phaser.Physics.Arcade.Body | undefined
      if (!body) return

      let vx = 0
      if (this.cursors.left.isDown || this.keyA.isDown) vx = -this.speed
      else if (this.cursors.right.isDown || this.keyD.isDown) vx = this.speed

      body.setVelocityX(vx)
      if (
        (this.cursors.up.isDown || this.keyW.isDown) &&
        body.blocked.down
      ) {
        body.setVelocityY(-500)
      }

      const { height: H } = this.p
      const py = (this.playerGO as Phaser.GameObjects.Sprite).y
      if (py > H + 50) {
        this.triggerLose()
      }
    }
  }
}

/**
 * Chế độ Play: Phaser 3 Arcade — đọc `gameConfig` từ store (không đổi `useEditorStore`).
 * Player: `type === "player"` + WASD/mũi tên; còn lại: static body va chạm.
 */
export function GameRuntime({ className }: GameRuntimeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const gameConfig = useEditorStore((s) => s.gameConfig)

  const [size, setSize] = useState({ w: 0, h: 0 })

  const entities = Array.isArray(gameConfig.entities) ? gameConfig.entities : []
  const bgHex =
    typeof gameConfig.theme?.background === 'string' ? gameConfig.theme.background : '#F0F8FF'
  const templateIdRaw =
    typeof gameConfig.templateId === 'string' ? gameConfig.templateId.trim().toLowerCase() : ''
  const templateDefaults =
    gameConfig.templateDefaults &&
    typeof gameConfig.templateDefaults === 'object' &&
    !Array.isArray(gameConfig.templateDefaults)
      ? (gameConfig.templateDefaults as Record<string, unknown>)
      : {}

  const templateRuntimeIds = [
    'snake',
    'flappy',
    'breakout',
    'platformer',
    'shooter',
    'memory',
  ] as const
  const isTemplateRuntime = (templateRuntimeIds as readonly string[]).includes(templateIdRaw)
  const useBehaviorRuntime = !isTemplateRuntime && gameConfigUsesBehaviors(gameConfig)
  const behaviorRules = parseBehaviorRules(gameConfig)
  const behaviorLives = parseBehaviorLives(gameConfig)
  const behaviorLevelRaw = (gameConfig as Record<string, unknown>).level
  const behaviorLevel =
    typeof behaviorLevelRaw === 'number' &&
    Number.isFinite(behaviorLevelRaw) &&
    behaviorLevelRaw >= 1
      ? Math.floor(behaviorLevelRaw)
      : 1

  const configKey = isTemplateRuntime
    ? JSON.stringify({
        mode: 'template',
        t: templateIdRaw,
        td: templateDefaults,
      })
    : useBehaviorRuntime
      ? JSON.stringify({
          mode: 'behavior',
          e: entities.map((x) => ({
            id: x.id,
            t: x.type,
            s: x.shapeType,
            p: x.position,
            w: x.width,
            h: x.height,
            c: x.colorHex ?? x.color,
            u: x.assetUrl,
            bh: (x as Record<string, unknown>).behaviors,
          })),
          rules: behaviorRules,
          lives: behaviorLives,
          lv: behaviorLevel,
          b: bgHex,
        })
      : JSON.stringify({
          e: entities.map((x) => ({
            id: x.id,
            t: x.type,
            s: x.shapeType,
            p: x.position,
            w: x.width,
            h: x.height,
            c: x.colorHex ?? x.color,
            u: x.assetUrl,
          })),
          b: bgHex,
        })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      const w = Math.max(0, Math.floor(cr.width))
      const h = Math.max(0, Math.floor(cr.height))
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el || size.w < 8 || size.h < 8) return

    const entityPayload: RuntimePayload = {
      width: size.w,
      height: size.h,
      backgroundColor: hexToPhaserColor(bgHex, 0xf0f8ff),
      entities,
    }

    const templatePayload: TemplateRuntimePayload = {
      width: size.w,
      height: size.h,
      templateConfig: templateDefaults,
    }

    const behaviorPayload: BehaviorRuntimePayload = {
      width: size.w,
      height: size.h,
      backgroundColor: entityPayload.backgroundColor,
      entities,
      rules: behaviorRules,
      lives: behaviorLives,
      level: behaviorLevel,
    }

    const tid = templateIdRaw
    const useTemplate = isTemplateRuntime

    class BootScene extends Phaser.Scene {
      constructor() {
        super({ key: '_studioBoot' })
      }

      create() {
        if (useBehaviorRuntime) {
          this.scene.start('studioBehavior', behaviorPayload)
        } else if (tid === 'snake') {
          this.scene.start('studioSnake', templatePayload)
        } else if (tid === 'flappy') {
          this.scene.start('studioFlappy', templatePayload)
        } else if (tid === 'breakout') {
          this.scene.start('studioBreakout', templatePayload)
        } else if (tid === 'platformer') {
          this.scene.start('studioPlatformer', templatePayload)
        } else if (tid === 'shooter') {
          this.scene.start('studioShooter', templatePayload)
        } else if (tid === 'memory') {
          this.scene.start('studioMemory', templatePayload)
        } else {
          this.scene.start('studioRuntime', entityPayload)
        }
      }
    }

    const MainScene = useTemplate
      ? tid === 'snake'
        ? buildSnakeScene(Phaser)
        : tid === 'flappy'
          ? buildFlappyScene(Phaser)
          : tid === 'platformer'
            ? buildPlatformerScene(Phaser)
            : tid === 'shooter'
              ? buildShooterScene(Phaser)
              : tid === 'memory'
                ? buildMemoryScene(Phaser)
                : buildBreakoutScene(Phaser)
      : useBehaviorRuntime
        ? buildBehaviorScene(Phaser)
        : buildRuntimeScene(Phaser)

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: el,
      width: size.w,
      height: size.h,
      backgroundColor: entityPayload.backgroundColor,
      ...(tid === 'memory' ? { input: { activePointers: 1 } } : {}),
      physics: {
        default: 'arcade',
        arcade: {
          gravity: {
            x: 0,
            y:
              useTemplate && (tid === 'flappy' || tid === 'shooter' || tid === 'memory')
                ? 0
                : 600,
          },
          debug: false,
        },
      },
      scene: [BootScene, MainScene],
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    })

    gameRef.current = game

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [size.w, size.h, configKey, bgHex, templateIdRaw, isTemplateRuntime])

  return (
    <div
      ref={containerRef}
      className={cn('relative h-full min-h-[180px] w-full overflow-hidden rounded-3xl', className)}
      role="application"
      aria-label="Play mode — Phaser runtime"
    />
  )
}
