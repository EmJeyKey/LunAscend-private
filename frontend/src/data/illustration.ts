// Artwork geometry in SVG pixels only. No DEM, lunar projection or geographic data.
export const artworkCraters = [
  { x: 430, y: 300, r: 151, squash: 0.78, angle: -20 },
  { x: 765, y: 140, r: 112, squash: 0.8, angle: -20 },
  { x: 172, y: 160, r: 63, squash: 0.8, angle: -20 },
  { x: 820, y: 445, r: 79, squash: 0.72, angle: -20 },
  { x: 110, y: 440, r: 127, squash: 0.76, angle: -20 },
  { x: 640, y: 468, r: 32, squash: 0.8, angle: -20 },
]

export function contourPath(radius: number, variation: number) {
  return Array.from({ length: 91 }, (_, index) => {
    const angle = index * Math.PI * 2 / 90
    const r = radius * (1 + 0.022 * Math.sin(angle * 7 + variation) + 0.015 * Math.cos(angle * 11))
    return `${index === 0 ? 'M' : 'L'}${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`
  }).join(' ') + ' Z'
}
