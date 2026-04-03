/** MIME dùng cho kéo asset từ sidebar vào Preview. */
export const STUDIO_ASSET_DRAG_MIME = 'application/x-studio-asset'

export type StudioSampleAsset = {
  id: string
  label: string
  assetUrl: string
}

function svgDataUrl(label: string, fill: string): string {
  const safe = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect fill="${fill}" width="96" height="96" rx="12"/><text x="48" y="54" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#0f172a">${safe}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/** Thư viện ảnh mẫu (SVG data URL — không phụ thuộc CDN). */
export const STUDIO_SAMPLE_ASSETS: StudioSampleAsset[] = [
  { id: 'player', label: 'Player', assetUrl: svgDataUrl('Player', '#87CEEB') },
  { id: 'enemy', label: 'Enemy', assetUrl: svgDataUrl('Enemy', '#FCA5A5') },
  { id: 'tree', label: 'Tree', assetUrl: svgDataUrl('Tree', '#86EFAC') },
  { id: 'coin', label: 'Coin', assetUrl: svgDataUrl('Coin', '#FDE047') },
  { id: 'star', label: 'Star', assetUrl: svgDataUrl('Star', '#C4B5FD') },
  { id: 'heart', label: 'Heart', assetUrl: svgDataUrl('Heart', '#F9A8D4') },
]
