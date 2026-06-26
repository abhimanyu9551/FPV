'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, RotateCcw, FileText } from 'lucide-react'

interface RuleRow {
  id: string
  name: string
  description: string | null
  category: string
  priority: number
  isActive: boolean
  startDate: string | null
  endDate: string | null
  allocationType: string
  allocationValue: number | null
  allocationPercent: number | null
  targetType: string
  targetId: string | null
  paymentResponsibility: string
  splits: Array<{ userId: string; percent: number; userName: string }>
  conditions: Array<{ conditionField: string; operator: string; value: number | null; valueB: number | null; stringValue: string | null }>
  notes: string | null
  incomeSourceId: string | null
  carryForward: boolean
  carryForwardTarget: string | null
  savingsGoalId: string | null
}

interface SessionRow {
  id: string
  sessionType: string
  processedAt: string
  year: number | null
  month: number | null
  status: string
  totalIncome: number
  totalAllocated: number
  remainingCash: number
  hasWarnings: boolean
}

interface Props {
  rules: RuleRow[]
  recentSessions: SessionRow[]
  incomeSources: Array<{ id: string; name: string }>
}

const CATEGORY_COLORS: Record<string, string> = {
  SAVINGS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  INVESTMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DEBT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CREDIT_CARD: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  EMI: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  RENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  MORTGAGE: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  UTILITIES: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  GROCERY: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  LEISURE: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  INSURANCE: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  INDIAN_ACCOUNT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  CUSTOM: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

function formatAllocation(rule: RuleRow) {
  if (rule.allocationType === 'FIXED_AMOUNT') return `£${(rule.allocationValue ?? 0).toFixed(2)}`
  if (rule.allocationType === 'PERCENTAGE') return `${(rule.allocationPercent ?? 0).toFixed(1)}%`
  return 'Remaining'
}

function formatMonth(month: number) {
  return new Date(2000, month - 1, 1).toLocaleString('en-GB', { month: 'long' })
}

export default function RulesPageClient({ rules, recentSessions }: Props) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [undoId, setUndoId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function handleDelete() {
    if (!deleteId) return
    await fetch(`/api/v1/rules/${deleteId}`, { method: 'DELETE' })
    setDeleteId(null)
    router.refresh()
  }

  async function handleUndo() {
    if (!undoId) return
    await fetch('/api/v1/salary/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: undoId }),
    })
    setUndoId(null)
    router.refresh()
  }

  async function handleToggle(id: string, currentActive: boolean) {
    setTogglingId(id)
    await fetch(`/api/v1/rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentActive }),
    })
    setTogglingId(null)
    router.refresh()
  }

  const activeRules = rules.filter((r) => r.isActive)
  const inactiveRules = rules.filter((r) => !r.isActive)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financial Rules"
        description="Define how income is automatically allocated across your accounts, savings, and expenses."
      >
        <Button variant="outline" asChild>
          <Link href="/rules/templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Link>
        </Button>
        <Button asChild>
          <Link href="/rules/new">
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Link>
        </Button>
      </PageHeader>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Rules', value: rules.length },
          { label: 'Active', value: activeRules.length },
          { label: 'Individual', value: rules.filter((r) => r.paymentResponsibility === 'INDIVIDUAL').length },
          { label: 'Shared', value: rules.filter((r) => r.paymentResponsibility === 'SHARED').length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active rules table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Rules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeRules.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground text-sm">
              No active rules yet.{' '}
              <Link href="/rules/new" className="text-primary underline-offset-4 hover:underline">
                Create your first rule
              </Link>{' '}
              or{' '}
              <Link href="/rules/templates" className="text-primary underline-offset-4 hover:underline">
                apply a template.
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-6">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Allocation</TableHead>
                  <TableHead>Responsibility</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="pl-6 text-muted-foreground font-mono text-xs">
                      {rule.priority}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{rule.name}</div>
                      {rule.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rule.description}</div>
                      )}
                      {rule.conditions.length > 0 && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          {rule.conditions.length} condition{rule.conditions.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[rule.category] ?? ''}`}>
                        {rule.category.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{formatAllocation(rule)}</TableCell>
                    <TableCell>
                      {rule.paymentResponsibility === 'SHARED' ? (
                        <div className="text-xs">
                          <Badge variant="secondary" className="text-xs">Shared</Badge>
                          <div className="mt-0.5 text-muted-foreground">
                            {rule.splits.map((s) => `${s.userName} ${s.percent}%`).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">Individual</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {rule.endDate ? rule.endDate : '—'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={rule.isActive}
                          disabled={togglingId === rule.id}
                          onCheckedChange={() => handleToggle(rule.id, rule.isActive)}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link href={`/rules/${rule.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(rule.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Inactive rules (collapsed) */}
      {inactiveRules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">
              Inactive Rules ({inactiveRules.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {inactiveRules.map((rule) => (
                  <TableRow key={rule.id} className="opacity-60">
                    <TableCell className="pl-6">
                      <div className="font-medium text-sm">{rule.name}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[rule.category] ?? ''}`}>
                        {rule.category.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{formatAllocation(rule)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={false}
                          disabled={togglingId === rule.id}
                          onCheckedChange={() => handleToggle(rule.id, rule.isActive)}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link href={`/rules/${rule.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent processing sessions */}
      {recentSessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Processing Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Period</TableHead>
                  <TableHead>Income</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Undo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6 text-sm">
                      {s.year && s.month ? `${formatMonth(s.month)} ${s.year}` : new Date(s.processedAt).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">£{s.totalIncome.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-sm">£{s.totalAllocated.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-sm">£{s.remainingCash.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'UNDONE' ? 'secondary' : s.hasWarnings ? 'destructive' : 'default'}>
                        {s.status === 'UNDONE' ? 'Undone' : s.hasWarnings ? 'With Warnings' : 'Completed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {s.status === 'COMPLETED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setUndoId(s.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Undo
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o: boolean) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Rule</AlertDialogTitle>
            <AlertDialogDescription>
              This rule will be deactivated and excluded from future processing runs. Historical ledger data is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Undo confirmation */}
      <AlertDialog open={!!undoId} onOpenChange={(o: boolean) => !o && setUndoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Processing Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all allocation ledger entries created during this session and mark the income entries as unprocessed. The session cannot be re-processed automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUndo} className="bg-destructive hover:bg-destructive/90">
              Undo Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
