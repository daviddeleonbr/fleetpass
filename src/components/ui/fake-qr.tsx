interface FakeQRProps {
  data: string
  size?: number
}

/**
 * Visually convincing QR-code placeholder generated deterministically
 * from `data`. Not a real scannable QR — used for UI mockups only.
 */
export function FakeQR({ data, size = 160 }: FakeQRProps) {
  const N = 21
  const cell = size / N

  // Seeded xorshift32 from data string
  let h = 0
  for (let i = 0; i < data.length; i++) {
    h = (Math.imul(31, h) + data.charCodeAt(i)) | 0
  }
  const rand = () => {
    h ^= h << 13
    h ^= h >> 17
    h ^= h << 5
    return (h >>> 0) / 0xffffffff
  }
  for (let i = 0; i < 30; i++) rand() // burn-in

  const bits: boolean[][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => rand() > 0.48)
  )

  // Returns true/false for finder pattern cells, null for data cells
  const finderDark = (r: number, c: number): boolean | null => {
    const check = (or: number, oc: number): boolean | null => {
      const fr = r - or
      const fc = c - oc
      if (fr < 0 || fr > 6 || fc < 0 || fc > 6) return null
      if (fr === 0 || fr === 6 || fc === 0 || fc === 6) return true
      if (fr >= 2 && fr <= 4 && fc >= 2 && fc <= 4) return true
      return false
    }
    const tl = check(0, 0)
    if (tl !== null) return tl
    const tr = check(0, 14)
    if (tr !== null) return tr
    const bl = check(14, 0)
    if (bl !== null) return bl
    return null
  }

  const cells: [number, number][] = []
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const fd = finderDark(r, c)
      if (fd !== null ? fd : bits[r][c]) cells.push([r, c])
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
    >
      <rect width={size} height={size} fill="white" />
      {cells.map(([r, c]) => (
        <rect
          key={`${r}-${c}`}
          x={c * cell + 0.5}
          y={r * cell + 0.5}
          width={cell - 1}
          height={cell - 1}
          rx={0.8}
          fill="#111827"
        />
      ))}
    </svg>
  )
}
