export function VoxelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M32 4L56 18V46L32 60L8 46V18L32 4Z" fill="currentColor" />
      <path d="M32 4L56 18L32 32L8 18L32 4Z" fill="currentColor" opacity={0.8} />
      <path d="M32 32V60L8 46V18L32 32Z" fill="currentColor" opacity={0.6} />
      <path d="M32 32V60L56 46V18L32 32Z" fill="currentColor" opacity={0.4} />
      <path d="M24 22L40 31V49L24 40V22Z" fill="var(--color-surface-strong)" />
    </svg>
  )
}
