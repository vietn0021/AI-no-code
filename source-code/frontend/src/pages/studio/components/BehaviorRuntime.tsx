import Phaser from 'phaser'
import type { EditorGameConfig, GameEntity } from '../../../store/useEditorStore'
import {
  normalizeShape,
  resolveEntityColor,
  resolveEntityPosition,
  resolveEntitySize,
} from '../lib/entityView'

export type BehaviorRule = { trigger: string; value?: number; action: string }

export type BehaviorRuntimePayload = {
  width: number
  height: number
  backgroundColor: number
  entities: GameEntity[]
  rules: BehaviorRule[]
  lives: number
  level: number
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

function textureKeyForEntity(id: string): string {
  return `studio_ent_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`
}

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

type Beh = Record<string, unknown>

function getBehaviors(e: GameEntity): Beh[] {
  const b = (e as Record<string, unknown>).behaviors
  if (!Array.isArray(b)) return []
  return b.filter((x): x is Beh => x != null && typeof x === 'object')
}

function behNum(b: Beh, key: string, fallback: number): number {
  const v = b[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function behStr(b: Beh, key: string, fallback: string): string {
  const v = b[key]
  return typeof v === 'string' ? v : fallback
}

export function gameConfigUsesBehaviors(gc: EditorGameConfig): boolean {
  const tid = typeof gc.templateId === 'string' ? gc.templateId.trim() : ''
  if (tid.length > 0) return false
  const ents = Array.isArray(gc.entities) ? gc.entities : []
  return ents.some((e) => {
    const b = (e as Record<string, unknown>).behaviors
    return Array.isArray(b) && b.length > 0
  })
}

export function parseBehaviorRules(gc: EditorGameConfig): BehaviorRule[] {
  const r = (gc as Record<string, unknown>).rules
  if (!Array.isArray(r)) return []
  const out: BehaviorRule[] = []
  for (const o of r) {
    if (!o || typeof o !== 'object') continue
    const x = o as Record<string, unknown>
    if (typeof x.trigger !== 'string' || typeof x.action !== 'string') continue
    const rule: BehaviorRule = { trigger: x.trigger, action: x.action }
    if (typeof x.value === 'number' && Number.isFinite(x.value)) rule.value = x.value
    out.push(rule)
  }
  return out
}

export function parseBehaviorLives(gc: EditorGameConfig): number {
  const l = (gc as Record<string, unknown>).lives
  if (typeof l === 'number' && Number.isFinite(l) && l >= 0) return Math.floor(l)
  return 3
}

type InstancePlan = {
  instanceId: string
  xPct: number
  yPct: number
  template: GameEntity
  behaviors: Beh[]
}

function planInstancesForEntity(e: GameEntity, rng: Phaser.Math.RandomDataGenerator): InstancePlan[] {
  const behaviors = getBehaviors(e).filter((b) => b.type !== 'spawnOnTimer')
  const spawn = behaviors.find((b) => b.type === 'spawnRandom')
  const count = spawn ? Math.max(1, Math.floor(behNum(spawn, 'count', 1))) : 1
  const basePos = resolveEntityPosition(e)
  const restBehaviors = behaviors.filter((b) => b.type !== 'spawnRandom')

  const plans: InstancePlan[] = []
  for (let i = 0; i < count; i++) {
    const xPct = count > 1 ? rng.realInRange(12, 88) : basePos.x
    const yPct = count > 1 ? rng.realInRange(12, 88) : basePos.y
    plans.push({
      instanceId: count > 1 ? `${e.id}__${i}` : e.id,
      xPct,
      yPct,
      template: e,
      behaviors: restBehaviors,
    })
  }
  return plans
}

type EntityBodyMeta = {
  template: GameEntity
  hasShoot: boolean
  moveSpeed: number
  jumpForce: number
  patrolRange: number
  patrolSpeed: number
  patrolOriginX: number
  patrolDir: number
  followSpeed: number
  circularR: number
  circularSpeed: number
  circularCx: number
  circularCy: number
  circularAngle: number
  shootCd: number
  shootBulletSpeed: number
  shootBulletColor: number
  lastShot: number
  float: boolean
  bounce: boolean
  onCollide: { target: string; action: string; value?: number }[]
  onCollect?: { action: string; value?: number }
  isPlayer: boolean
}

export function buildBehaviorScene(PhaserRef: typeof Phaser): typeof Phaser.Scene {
  return class BehaviorScene extends PhaserRef.Scene {
    private p!: BehaviorRuntimePayload
    private playerGroup!: Phaser.Physics.Arcade.Group
    private enemyGroup!: Phaser.Physics.Arcade.Group
    private collectibleGroup!: Phaser.Physics.Arcade.StaticGroup
    private platformGroup!: Phaser.Physics.Arcade.StaticGroup
    private bulletGroup!: Phaser.Physics.Arcade.Group

    private playerSprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null
    private score = 0
    private lives = 3
    private gameOver = false
    private won = false

    private scoreText!: Phaser.GameObjects.Text
    private livesText!: Phaser.GameObjects.Text
    private timerText?: Phaser.GameObjects.Text
    private timerRemaining = 0
    private hasTimerRule = false

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private keyW!: Phaser.Input.Keyboard.Key
    private keyA!: Phaser.Input.Keyboard.Key
    private keyD!: Phaser.Input.Keyboard.Key
    private spaceKey!: Phaser.Input.Keyboard.Key
    private keyR?: Phaser.Input.Keyboard.Key

    private initialCollectibleCount = 0
    private rng!: Phaser.Math.RandomDataGenerator
    private spawnTimers: { acc: number; interval: number; template: GameEntity; behaviors: Beh[] }[] =
      []
    private playerHitInvulnUntil = 0

    constructor() {
      super({ key: 'studioBehavior' })
    }

    init(data: BehaviorRuntimePayload) {
      this.p = data
      this.gameOver = false
      this.won = false
    }

    preload() {
      for (const e of this.p.entities) {
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
      if (this.textures.exists(key)) return key

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

    private applyWorldGravityFromBehaviors() {
      let found = false
      let gY = 0
      for (const e of this.p.entities) {
        for (const b of getBehaviors(e)) {
          if (b.type === 'gravity') {
            found = true
            gY = Math.max(gY, behNum(b, 'force', 600))
          }
        }
      }
      this.physics.world.gravity.y = found ? gY : 600
    }

    private buildMetaFromBehaviors(
      e: GameEntity,
      behaviors: Beh[],
      worldX: number,
    ): EntityBodyMeta {
      const isPlayer =
        String(e.type ?? '')
          .trim()
          .toLowerCase() === 'player'
      let moveSpeed = 0
      let jumpForce = 500
      let patrolRange = 120
      let patrolSpeed = 80
      let followSpeed = 100
      let circularR = 60
      let circularSpeed = 2
      let shootCd = 400
      let shootBulletSpeed = 400
      let shootBulletColor = 0xffffff
      let float = false
      let bounce = false
      const onCollide: { target: string; action: string; value?: number }[] = []
      let onCollect: { action: string; value?: number } | undefined
      let hasShoot = false

      for (const b of behaviors) {
        const t = b.type
        if (t === 'shoot') hasShoot = true
        if (t === 'move') moveSpeed = behNum(b, 'speed', 200)
        if (t === 'jump') jumpForce = behNum(b, 'force', 500)
        if (t === 'patrol') {
          patrolRange = behNum(b, 'range', 120)
          patrolSpeed = behNum(b, 'speed', 80)
        }
        if (t === 'follow') followSpeed = behNum(b, 'speed', 100)
        if (t === 'circular') {
          circularR = behNum(b, 'radius', 60)
          circularSpeed = behNum(b, 'speed', 2)
        }
        if (t === 'float') float = true
        if (t === 'bounce') bounce = true
        if (t === 'shoot') {
          shootCd = behNum(b, 'cooldown', 400)
          shootBulletSpeed = behNum(b, 'bulletSpeed', 400)
          shootBulletColor = hexToPhaserColor(behStr(b, 'bulletColor', '#ffffff'), 0xffffff)
        }
        if (t === 'onCollide') {
          onCollide.push({
            target: behStr(b, 'target', 'player'),
            action: behStr(b, 'action', ''),
            value: typeof b.value === 'number' ? b.value : undefined,
          })
        }
        if (t === 'onCollect') {
          onCollect = {
            action: behStr(b, 'action', 'addScore'),
            value: typeof b.value === 'number' ? b.value : undefined,
          }
        }
      }

      return {
        template: e,
        hasShoot,
        moveSpeed,
        jumpForce,
        patrolRange,
        patrolSpeed,
        patrolOriginX: worldX,
        patrolDir: 1,
        followSpeed,
        circularR,
        circularSpeed,
        circularCx: worldX,
        circularCy: 0,
        circularAngle: 0,
        shootCd,
        shootBulletSpeed,
        shootBulletColor,
        lastShot: 0,
        float,
        bounce,
        onCollide,
        onCollect,
        isPlayer,
      }
    }

    private executeAction(action: string, value?: number) {
      if (this.gameOver || this.won) return
      switch (action) {
        case 'addScore': {
          const v = value ?? 10
          this.score += v
          this.scoreText.setText(`Score: ${this.score}`)
          this.checkScoreRule()
          break
        }
        case 'loseLife': {
          this.lives = Math.max(0, this.lives - 1)
          this.livesText.setText(`Lives: ${this.lives}`)
          if (this.p.rules.some((r) => r.trigger === 'livesZero' && r.action === 'gameOver')) {
            if (this.lives <= 0) this.triggerGameOver()
          } else if (this.lives <= 0) {
            this.triggerGameOver()
          }
          break
        }
        case 'gameOver':
          this.triggerGameOver()
          break
        case 'winGame':
          this.triggerWin()
          break
        case 'nextLevel':
          this.scene.restart({ ...this.p, level: this.p.level + 1 })
          break
        default:
          break
      }
    }

    private checkScoreRule() {
      for (const r of this.p.rules) {
        if (r.trigger === 'scoreReach' && r.value != null && this.score >= r.value) {
          if (r.action === 'winGame') this.triggerWin()
          else if (r.action === 'nextLevel')
            this.scene.restart({ ...this.p, level: this.p.level + 1 })
        }
      }
    }

    private triggerGameOver() {
      if (this.gameOver || this.won) return
      this.gameOver = true
      this.physics.pause()
      const { width: W, height: H } = this.p
      this.add
        .text(W / 2, H / 2, 'GAME OVER', { fontSize: '32px', color: '#cc3333' })
        .setOrigin(0.5)
        .setDepth(200)
      this.add
        .text(W / 2, H / 2 + 44, 'Nhấn R để chơi lại', { fontSize: '16px', color: '#666666' })
        .setOrigin(0.5)
        .setDepth(200)
    }

    private triggerWin() {
      if (this.gameOver || this.won) return
      this.won = true
      this.physics.pause()
      const { width: W, height: H } = this.p
      this.add
        .text(W / 2, H / 2, 'YOU WIN! 🎉', { fontSize: '32px', color: '#22aa55' })
        .setOrigin(0.5)
        .setDepth(200)
    }

    private addSpriteForPlan(plan: InstancePlan, W: number, H: number) {
      const e = plan.template
      const { w, h } = resolveEntitySize(e)
      const cx = (plan.xPct / 100) * W
      const cy = (plan.yPct / 100) * H
      const color = hexToPhaserColor(resolveEntityColor(e), 0x94a3b8)
      const shapeStr = String(e.shapeType ?? 'Square')
      const url = typeof e.assetUrl === 'string' ? e.assetUrl.trim() : ''
      const texKey = textureKeyForEntity(e.id)
      const hasTex = url.length > 0 && this.textures.exists(texKey)
      const frameKey = hasTex ? texKey : this.createEntityTexture(plan.instanceId, w, h, color, shapeStr)

      const t = String(e.type ?? '')
        .trim()
        .toLowerCase()
      const isPlatform = t === 'platform' || t === 'ground'
      const isCollectible = t === 'collectible'
      const isEnemy = t === 'enemy'
      const isPlayer = t === 'player'

      const meta = this.buildMetaFromBehaviors(e, plan.behaviors, cx)
      meta.circularCy = cy

      if (isPlatform) {
        const spr = this.physics.add.staticSprite(cx, cy, frameKey)
        if (hasTex) spr.setDisplaySize(w, h)
        spr.refreshBody()
        this.platformGroup.add(spr)
        return
      }

      if (isCollectible) {
        const spr = this.physics.add.staticSprite(cx, cy, frameKey)
        if (hasTex) spr.setDisplaySize(w, h)
        spr.refreshBody()
        if (normalizeShape(shapeStr) === 'circle') {
          const r = Math.max(4, Math.min(w, h) / 2)
          ;(spr.body as Phaser.Physics.Arcade.StaticBody).setCircle(r)
        }
        spr.setData('eb', meta)
        this.collectibleGroup.add(spr)
        return
      }

      const spr = this.physics.add.sprite(cx, cy, frameKey)
      if (hasTex) spr.setDisplaySize(w, h)
      const body = spr.body as Phaser.Physics.Arcade.Body
      if (meta.float) body.setAllowGravity(false)
      if (meta.bounce) {
        body.setBounce(1, 1)
        spr.setCollideWorldBounds(true)
      } else if (isPlayer) {
        spr.setCollideWorldBounds(true)
      }
      if (normalizeShape(shapeStr) === 'circle') {
        const r = Math.max(4, Math.min(w, h) / 2)
        body.setCircle(r)
      }
      spr.setData('eb', meta)

      if (isPlayer) {
        this.playerGroup.add(spr)
        if (!this.playerSprite) this.playerSprite = spr
      } else if (isEnemy) {
        this.enemyGroup.add(spr)
      } else {
        this.physics.add.existing(spr, false)
        this.enemyGroup.add(spr)
      }
    }

    create() {
      const { width: W, height: H, backgroundColor, entities, rules, lives } = this.p
      this.gameOver = false
      this.won = false
      this.score = 0
      this.lives = lives
      this.spawnTimers = []
      this.rng = new PhaserRef.Math.RandomDataGenerator([
        String(Date.now()),
        String(W),
        String(H),
      ])

      this.cameras.main.setBackgroundColor(backgroundColor)
      this.physics.world.setBounds(0, 0, W, H)
      this.applyWorldGravityFromBehaviors()

      this.playerGroup = this.physics.add.group()
      this.enemyGroup = this.physics.add.group()
      this.collectibleGroup = this.physics.add.staticGroup()
      this.platformGroup = this.physics.add.staticGroup()
      this.bulletGroup = this.physics.add.group()

      for (const e of entities) {
        const behaviors = getBehaviors(e)
        const timerBeh = behaviors.find((b) => b.type === 'spawnOnTimer')
        if (timerBeh) {
          this.spawnTimers.push({
            acc: 0,
            interval: Math.max(500, behNum(timerBeh, 'interval', 2000)),
            template: e,
            behaviors: behaviors.filter(
              (b) => b.type !== 'spawnRandom' && b.type !== 'spawnOnTimer',
            ),
          })
        }
      }

      const plans: InstancePlan[] = []
      for (const e of entities) {
        plans.push(...planInstancesForEntity(e, this.rng))
      }

      for (const plan of plans) {
        this.addSpriteForPlan(plan, W, H)
      }

      this.initialCollectibleCount = this.collectibleGroup.getChildren().length

      if (this.playerSprite) {
        this.physics.add.collider(this.playerSprite, this.platformGroup)
        this.physics.add.collider(this.enemyGroup, this.platformGroup)
        this.physics.add.collider(this.bulletGroup, this.platformGroup)

        this.physics.add.overlap(
          this.playerSprite,
          this.enemyGroup,
          (_player, enemy) => {
            const now = this.time.now
            if (now < this.playerHitInvulnUntil) return
            const en = enemy as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
            const meta = en.getData('eb') as EntityBodyMeta | undefined
            if (!meta) return
            for (const oc of meta.onCollide) {
              if (oc.target.toLowerCase() === 'player') {
                this.executeAction(oc.action, oc.value)
                if (oc.action === 'loseLife') {
                  this.playerHitInvulnUntil = now + 900
                }
              }
            }
          },
        )

        this.physics.add.overlap(
          this.playerSprite,
          this.collectibleGroup,
          (_p, col) => {
            const c = col as Phaser.Physics.Arcade.Sprite
            const meta = c.getData('eb') as EntityBodyMeta | undefined
            c.destroy()
            if (meta?.onCollect) {
              this.executeAction(meta.onCollect.action, meta.onCollect.value)
            } else {
              this.executeAction('addScore', 10)
            }
            this.checkAllCollected()
          },
        )

        this.physics.add.overlap(this.bulletGroup, this.enemyGroup, (_b, en) => {
          ;(en as Phaser.GameObjects.GameObject).destroy()
          this.executeAction('addScore', 10)
        })
      }

      this.scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '18px',
        color: '#1e293b',
        fontStyle: 'bold',
      })
      this.scoreText.setScrollFactor(0).setDepth(100)

      this.livesText = this.add
        .text(W - 16, 16, `Lives: ${this.lives}`, {
          fontSize: '18px',
          color: '#1e293b',
          fontStyle: 'bold',
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(100)

      const timerRule = rules.find((r) => r.trigger === 'timer')
      if (timerRule && timerRule.value != null) {
        this.hasTimerRule = true
        this.timerRemaining = timerRule.value
        this.timerText = this.add
          .text(W / 2, 16, `Time: ${Math.ceil(this.timerRemaining)}`, {
            fontSize: '18px',
            color: '#1e293b',
            fontStyle: 'bold',
          })
          .setOrigin(0.5, 0)
          .setScrollFactor(0)
          .setDepth(100)
      }

      if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys()
        this.keyW = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.W)
        this.keyA = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.A)
        this.keyD = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.D)
        this.spaceKey = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.SPACE)
        this.keyR = this.input.keyboard.addKey(PhaserRef.Input.Keyboard.KeyCodes.R)
      }
    }

    private checkAllCollected() {
      const left = this.collectibleGroup.getChildren().filter((c) => c.active).length
      if (this.initialCollectibleCount > 0 && left === 0) {
        for (const r of this.p.rules) {
          if (r.trigger === 'allCollected' && r.action === 'winGame') {
            this.triggerWin()
            return
          }
        }
      }
    }

    private tryShootPlayer() {
      if (!this.playerSprite || this.gameOver || this.won) return
      const meta = this.playerSprite.getData('eb') as EntityBodyMeta | undefined
      if (!meta) return
      const now = this.time.now
      if (now - meta.lastShot < meta.shootCd) return
      meta.lastShot = now
      this.playerSprite.setData('eb', meta)

      const ptr = this.input.activePointer
      const angle = Phaser.Math.Angle.Between(
        this.playerSprite.x,
        this.playerSprite.y,
        ptr.worldX,
        ptr.worldY,
      )
      const bx = this.playerSprite.x
      const by = this.playerSprite.y
      const g = this.make.graphics({ x: 0, y: 0 }, false)
      g.fillStyle(meta.shootBulletColor, 1)
      g.fillCircle(4, 4, 4)
      const key = `_bb_${now}`
      g.generateTexture(key, 8, 8)
      g.destroy()
      const bullet = this.physics.add.sprite(bx, by, key)
      this.bulletGroup.add(bullet)
      const b = bullet.body as Phaser.Physics.Arcade.Body
      b.setAllowGravity(false)
      bullet.setRotation(angle)
      b.setVelocity(
        Math.cos(angle) * meta.shootBulletSpeed,
        Math.sin(angle) * meta.shootBulletSpeed,
      )
      this.time.delayedCall(2500, () => {
        if (bullet.active) bullet.destroy()
      })
    }

    update(_t: number, dt: number) {
      if (this.keyR && PhaserRef.Input.Keyboard.JustDown(this.keyR) && (this.gameOver || this.won)) {
        this.scene.restart(this.p)
        return
      }
      if (this.gameOver || this.won) return

      const dtSec = dt / 1000

      if (this.hasTimerRule && this.timerText) {
        this.timerRemaining -= dtSec
        if (this.timerRemaining <= 0) {
          this.timerRemaining = 0
          this.timerText.setText('Time: 0')
          for (const r of this.p.rules) {
            if (r.trigger === 'timerEnd' && r.action === 'gameOver') {
              this.triggerGameOver()
              return
            }
          }
          this.triggerGameOver()
          return
        }
        this.timerText.setText(`Time: ${Math.ceil(this.timerRemaining)}`)
      }

      for (const st of this.spawnTimers) {
        st.acc += dt
        if (st.acc >= st.interval) {
          st.acc = 0
          const W = this.p.width
          const H = this.p.height
          const plan: InstancePlan = {
            instanceId: `${st.template.id}_spawn_${this.time.now}`,
            xPct: this.rng.realInRange(15, 85),
            yPct: this.rng.realInRange(15, 85),
            template: st.template,
            behaviors: st.behaviors,
          }
          this.addSpriteForPlan(plan, W, H)
        }
      }

      if (this.playerSprite) {
        const meta = this.playerSprite.getData('eb') as EntityBodyMeta | undefined
        const body = this.playerSprite.body as Phaser.Physics.Arcade.Body
        if (meta?.moveSpeed) {
          let vx = 0
          if (this.cursors.left.isDown || this.keyA.isDown) vx = -meta.moveSpeed
          else if (this.cursors.right.isDown || this.keyD.isDown) vx = meta.moveSpeed
          body.setVelocityX(vx)
        }
        const wantJump =
          PhaserRef.Input.Keyboard.JustDown(this.spaceKey) ||
          PhaserRef.Input.Keyboard.JustDown(this.cursors.up) ||
          PhaserRef.Input.Keyboard.JustDown(this.keyW)
        if (meta && meta.jumpForce > 0 && wantJump && body.blocked.down) {
          body.setVelocityY(-Math.abs(meta.jumpForce))
        }
        if (meta?.hasShoot) {
          if (this.input.activePointer.leftButtonDown()) {
            this.tryShootPlayer()
          }
        }
      }

      this.enemyGroup.children.iterate((ch) => {
        const spr = ch as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null
        if (!spr || !spr.active) return true
        const meta = spr.getData('eb') as EntityBodyMeta | undefined
        if (!meta || meta.isPlayer) return true
        const body = spr.body as Phaser.Physics.Arcade.Body

        if (meta.patrolSpeed > 0 && meta.patrolRange > 0) {
          body.setVelocityX(meta.patrolDir * meta.patrolSpeed)
          if (Math.abs(spr.x - meta.patrolOriginX) > meta.patrolRange) {
            meta.patrolDir *= -1
            spr.setData('eb', meta)
          }
        }

        if (meta.followSpeed > 0 && this.playerSprite) {
          const a = Phaser.Math.Angle.Between(spr.x, spr.y, this.playerSprite.x, this.playerSprite.y)
          body.setVelocity(Math.cos(a) * meta.followSpeed, Math.sin(a) * meta.followSpeed)
        }

        if (meta.circularSpeed > 0 && meta.circularR > 0) {
          meta.circularAngle += meta.circularSpeed * dtSec
          spr.setPosition(
            meta.circularCx + Math.cos(meta.circularAngle) * meta.circularR,
            meta.circularCy + Math.sin(meta.circularAngle) * meta.circularR,
          )
          body.setVelocity(0, 0)
          spr.setData('eb', meta)
        }

        return true
      })

      const { width: W, height: H } = this.p
      this.bulletGroup.children.iterate((ch) => {
        const b = ch as Phaser.Physics.Arcade.Sprite
        if (!b?.active) return true
        if (b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) b.destroy()
        return true
      })
    }
  }
}
