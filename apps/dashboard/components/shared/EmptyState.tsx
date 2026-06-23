import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  href?: string
  cta?: string
  className?: string
  children?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, href, cta, className, children }: EmptyStateProps) {
  return (
    <div className={cn(
      'rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center',
      className
    )}>
      {Icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <p className="text-foreground font-medium">{title}</p>
      <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">{description}</p>
      {href && cta && (
        <Button asChild className="mt-4">
          <Link href={href}>{cta}</Link>
        </Button>
      )}
      {children}
    </div>
  )
}
