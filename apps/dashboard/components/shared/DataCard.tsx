import { cn } from '@/lib/utils'

interface DataCardProps {
  children: React.ReactNode
  className?: string
}

export function DataCard({ children, className }: DataCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-border bg-card shadow-[var(--card-shadow)] p-5',
      className
    )}>
      {children}
    </div>
  )
}
