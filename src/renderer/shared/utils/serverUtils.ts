export const getPingColor = (ping: number): string => {
  if (ping < 100) return 'text-emerald-400'
  if (ping < 200) return 'text-yellow-400'
  return 'text-red-400'
}

export const getFpsColor = (fps: number): string => {
  if (fps >= 55) return 'text-emerald-400'
  if (fps >= 30) return 'text-yellow-400'
  return 'text-red-400'
}
