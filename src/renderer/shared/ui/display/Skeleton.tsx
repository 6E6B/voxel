import React from 'react'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return <div className={`animate-pulse rounded-md bg-neutral-800/50 ${className}`} {...props} />
}

export default Skeleton
