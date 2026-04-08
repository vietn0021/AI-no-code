const BASE_URL =
  'https://iucvtrnfioplajjkxiov.supabase.co/storage/v1/object/public/sprites'

export type SpriteItem = {
  id: string
  name: string
  url: string
}

export const SPRITE_CATEGORIES = {
  platformer: {
    label: 'Platformer',
    baseUrl: `${BASE_URL}/platformer`,
    sprites: Array.from({ length: 112 }, (_, i) => ({
      id: `platformer_${i + 1}`,
      name: `platformIndustrial_${String(i + 1).padStart(3, '0')}`,
      url: `${BASE_URL}/platformer/platformIndustrial_${String(i + 1).padStart(3, '0')}.png`,
    })),
  },
} as const

/** Danh sách phẳng để hiển thị / lọc (mở rộng thêm category sau này). */
export const SPRITE_LIBRARY_ALL: readonly SpriteItem[] =
  SPRITE_CATEGORIES.platformer.sprites
