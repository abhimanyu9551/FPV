import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

type KpiVariant = 'primary' | 'success' | 'destructive' | 'warning'

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon?: LucideIcon
  variant?: KpiVariant
  className?: string
}

const variantStyles: Record<KpiVariant, { icon: string; border: string }> = {
  primary: {
    icon: 'bg-primary/10 text-primary',
    border: 'border-primary/20',
  },
  success: {
    icon: 'bg-success/10 text-success',
    border: 'border-success/20',
  },
  destructive: {
    icon: 'bg-destructive/10 text-destructive',
    border: 'border-destructive/20',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
    border: 'border-warning/20',
  },
}

export function KpiCard({ label, value, sub, icon: Icon, variant = 'primary', className }: KpiCardProps) {
  const styles = variantStyles[variant]

  return (
    <Card className={cn(
      'gap-3 px-5 py-4',
      styles.border,
      className
    )}>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', styles.icon)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="text-foreground text-2xl font-bold font-heading">{value}</p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
    </Card>
  )
}
