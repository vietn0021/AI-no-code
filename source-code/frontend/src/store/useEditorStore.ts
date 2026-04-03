import { create } from 'zustand'

/** Khớp gần với backend `GameConfig` / `EntitySchema` (có thể mở rộng thêm field). */
export type ShapeType = 'Square' | 'Circle' | 'Triangle'

export type GameEntity = {
  id: string
  type: string
  shapeType: ShapeType
  colorHex?: string
  /** Alias tùy chọn từ JSON (ưu tiên sau colorHex khi resolve màu). */
  color?: string
  position?: { x: number; y: number }
  /** Kích thước theo px trong preview canvas. */
  width?: number
  height?: number
  /** Khi `type === 'sprite'`, URL ảnh hiển thị trên canvas (Asset Module / thư viện mẫu). */
  assetUrl?: string
  settings?: Record<string, unknown>
} & Record<string, unknown>

export type EditorGameConfig = {
  source_color?: 'prompt' | 'palette_fallback'
  theme?: {
    primary: string
    background: string
    vibe: string
  } & Record<string, unknown>
  entities: GameEntity[]
  logic?: unknown[]
  /** Tuỳ chọn: metadata asset (sprite, url…) khi backend bổ sung. */
  assets?: unknown[]
  /** Play mode: scene Phaser theo mẫu (snake / flappy / breakout). */
  templateId?: string
  /** Tham số mặc định từ template (màu, tốc độ, …). */
  templateDefaults?: Record<string, unknown>
} & Record<string, unknown>

export type CurrentProject = {
  id: string
  name?: string
  description?: string
}

/** Mock: 1 khối vuông (player) + 1 hình tròn — đủ điều kiện có entity `type: player`. */
export const mockGameConfig: EditorGameConfig = {
  source_color: 'palette_fallback',
  theme: {
    primary: '#BDE0FE',
    background: '#F0F8FF',
    vibe: 'Sky pastel studio preview',
  },
  entities: [
    {
      id: 'mock-square-1',
      type: 'player',
      shapeType: 'Square',
      colorHex: '#9575CD',
      position: { x: 50, y: 75 },
      width: 14,
      height: 14,
    },
    {
      id: 'mock-circle-1',
      type: 'decoration',
      shapeType: 'Circle',
      colorHex: '#87CEEB',
      position: { x: 72, y: 35 },
      width: 12,
      height: 12,
    },
  ],
  logic: [],
  assets: [],
}

const MAX_HISTORY = 30

function cloneGameConfig(c: EditorGameConfig): EditorGameConfig {
  return JSON.parse(JSON.stringify(c)) as EditorGameConfig
}

function gameConfigEquals(a: EditorGameConfig, b: EditorGameConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

type EditorState = {
  gameConfig: EditorGameConfig
  currentProject: CurrentProject | null
  isLoading: boolean
  /** Entity đang chọn — đồng bộ Canvas + Layers + Inspector. */
  selectedEntityId: string | null
  history: EditorGameConfig[]
  historyIndex: number

  setGameConfig: (config: EditorGameConfig) => void
  updateEntity: (id: string, data: Partial<GameEntity>) => void
  setCurrentProject: (project: CurrentProject | null) => void
  setLoading: (loading: boolean) => void
  setSelectedEntityId: (id: string | null) => void
  /** Xóa entity khỏi scene; bỏ chọn nếu đang chọn đúng id đó. */
  removeEntity: (id: string) => void
  /** Thêm entity (ví dụ kéo asset vào Preview). */
  addEntity: (entity: GameEntity) => void
  resetToMock: () => void
  undo: () => void
  redo: () => void
  /** Gắn / gỡ template runtime (snake, flappy, …) trên gameConfig hiện tại. */
  setTemplateId: (id: string | null) => void
}

function applyHistoryAfterMutation(
  state: EditorState,
  nextGameConfig: EditorGameConfig,
): Pick<EditorState, 'gameConfig' | 'history' | 'historyIndex'> {
  let hist = [...state.history.slice(0, state.historyIndex + 1)]
  const cur = cloneGameConfig(state.gameConfig)
  const last = hist.length > 0 ? hist[hist.length - 1] : null
  if (last === null || !gameConfigEquals(last, cur)) {
    hist.push(cur)
  }
  hist.push(cloneGameConfig(nextGameConfig))
  let idx = hist.length - 1
  while (hist.length > MAX_HISTORY) {
    hist.shift()
    idx--
  }
  return { gameConfig: nextGameConfig, history: hist, historyIndex: idx }
}

export const useEditorStore = create<EditorState>((set) => ({
  gameConfig: mockGameConfig,
  currentProject: null,
  isLoading: false,
  selectedEntityId: null,
  history: [],
  historyIndex: -1,

  setGameConfig: (config) =>
    set({
      gameConfig: config,
      selectedEntityId: null,
      history: [cloneGameConfig(config)],
      historyIndex: 0,
    }),

  updateEntity: (id, data) =>
    set((state) => {
      const nextGameConfig: EditorGameConfig = {
        ...state.gameConfig,
        entities: state.gameConfig.entities.map((entity) =>
          entity.id === id ? ({ ...entity, ...data } as GameEntity) : entity,
        ),
      }
      return applyHistoryAfterMutation(state, nextGameConfig)
    }),

  setCurrentProject: (project) => set({ currentProject: project }),

  setLoading: (loading) => set({ isLoading: loading }),

  setSelectedEntityId: (id) => set({ selectedEntityId: id }),

  removeEntity: (id) =>
    set((state) => {
      const nextGameConfig: EditorGameConfig = {
        ...state.gameConfig,
        entities: state.gameConfig.entities.filter((e) => e.id !== id),
      }
      return {
        ...applyHistoryAfterMutation(state, nextGameConfig),
        selectedEntityId: state.selectedEntityId === id ? null : state.selectedEntityId,
      }
    }),

  addEntity: (entity) =>
    set((state) => {
      const nextGameConfig: EditorGameConfig = {
        ...state.gameConfig,
        entities: [...state.gameConfig.entities, entity],
      }
      return {
        ...applyHistoryAfterMutation(state, nextGameConfig),
        selectedEntityId: entity.id,
      }
    }),

  resetToMock: () =>
    set({
      gameConfig: mockGameConfig,
      selectedEntityId: null,
      history: [cloneGameConfig(mockGameConfig)],
      historyIndex: 0,
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return {}
      const nextIdx = state.historyIndex - 1
      return {
        gameConfig: cloneGameConfig(state.history[nextIdx]),
        historyIndex: nextIdx,
      }
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return {}
      const nextIdx = state.historyIndex + 1
      return {
        gameConfig: cloneGameConfig(state.history[nextIdx]),
        historyIndex: nextIdx,
      }
    }),

  setTemplateId: (id) =>
    set((state) => {
      const currentRaw = state.gameConfig.templateId
      const current =
        typeof currentRaw === 'string' && currentRaw.trim() ? currentRaw.trim() : null
      const nextId = id != null && String(id).trim() ? String(id).trim() : null
      if (current === nextId) return {}
      const nextGameConfig: EditorGameConfig = { ...state.gameConfig }
      if (nextId == null) {
        delete (nextGameConfig as Record<string, unknown>).templateId
      } else {
        nextGameConfig.templateId = nextId
      }
      return applyHistoryAfterMutation(state, nextGameConfig)
    }),
}))
