'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createFinancialRuleSchema } from '@/lib/validators/financial-rule.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, AlertCircle } from 'lucide-react'

type FormValues = z.infer<typeof createFinancialRuleSchema>

interface UserOption { id: string; fullName: string; email: string }
interface IncomeSourceOption { id: string; name: string }
interface AccountOption { id: string; name: string; accountType: string }
interface SavingsGoalOption { id: string; name: string; targetAmount: number; currentAmount: number }
interface DebtOption { id: string; name: string }

interface Props {
  defaultValues?: Partial<FormValues>
  ruleId?: string
  users: UserOption[]
  incomeSources: IncomeSourceOption[]
  accounts: AccountOption[]
  savingsGoals: SavingsGoalOption[]
  debts: DebtOption[]
}

const CATEGORIES = [
  'SAVINGS', 'INVESTMENT', 'DEBT', 'CREDIT_CARD', 'EMI',
  'RENT', 'MORTGAGE', 'UTILITIES', 'GROCERY', 'LEISURE',
  'INSURANCE', 'INDIAN_ACCOUNT', 'CUSTOM',
] as const

const ALLOCATION_TYPES = ['FIXED_AMOUNT', 'PERCENTAGE', 'REMAINING'] as const
const TARGET_TYPES = ['ACCOUNT', 'SAVINGS_GOAL', 'DEBT', 'REMITTANCE_CATEGORY', 'BUDGET_CATEGORY'] as const
const OPERATORS = ['GT', 'GTE', 'LT', 'LTE', 'EQ', 'BETWEEN', 'MONTH_IS', 'INCOME_SOURCE_IS'] as const
const CONDITION_FIELDS = [
  { value: 'salary', label: 'Salary amount' },
  { value: 'month', label: 'Month (1-12)' },
  { value: 'year', label: 'Year' },
  { value: 'income_source', label: 'Income source' },
]
const CARRY_FORWARD_TARGETS = ['LEAVE_IN_ACCOUNT', 'MOVE_TO_SAVINGS', 'MOVE_TO_INVESTMENT', 'MOVE_TO_GOAL'] as const

export default function RuleForm({
  defaultValues,
  ruleId,
  users,
  incomeSources,
  accounts,
  savingsGoals,
  debts,
}: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!ruleId

  const form = useForm<FormValues>({
    resolver: zodResolver(createFinancialRuleSchema),
    defaultValues: {
      name: '',
      category: 'CUSTOM',
      priority: 10,
      isActive: true,
      allocationType: 'FIXED_AMOUNT',
      targetType: 'ACCOUNT',
      paymentResponsibility: 'INDIVIDUAL',
      carryForward: false,
      splits: [],
      conditions: [],
      ...defaultValues,
    },
  })

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form

  const allocationType = watch('allocationType')
  const paymentResp = watch('paymentResponsibility')
  const targetType = watch('targetType')
  const carryForward = watch('carryForward')
  const splits = watch('splits')
  const conditions = watch('conditions')

  function addSplit() {
    setValue('splits', [...splits, { userId: users[0]?.id ?? '', percent: 50 }])
  }
  function removeSplit(i: number) {
    setValue('splits', splits.filter((_, idx) => idx !== i))
  }
  function addCondition() {
    setValue('conditions', [...conditions, {
      conditionField: 'salary',
      operator: 'GT' as const,
      value: null,
      valueB: null,
      stringValue: null,
    }])
  }
  function removeCondition(i: number) {
    setValue('conditions', conditions.filter((_, idx) => idx !== i))
  }

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const method = isEditing ? 'PATCH' : 'POST'
    const url = isEditing ? `/api/v1/rules/${ruleId}` : '/api/v1/rules'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!res.ok) {
      setServerError(data.error ?? 'Failed to save rule')
      return
    }
    router.push('/rules')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {serverError}
        </div>
      )}

      {/* Core details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Rule Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Rule Name *</Label>
              <Input id="name" placeholder="e.g. Monthly Rent" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category *</Label>
              <Select defaultValue={defaultValues?.category ?? 'CUSTOM'} onValueChange={(v) => setValue('category', v as typeof CATEGORIES[number])}>
                <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="Brief description (optional)" {...register('description')} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority (lower = runs first) *</Label>
              <Input id="priority" type="number" min={1} {...register('priority', { valueAsNumber: true })} />
              {errors.priority && <p className="text-xs text-destructive">{errors.priority.message}</p>}
            </div>
            <div className="flex items-center justify-between pt-6">
              <Label htmlFor="isActive">Active</Label>
              <Switch id="isActive" defaultChecked={defaultValues?.isActive ?? true}
                onCheckedChange={(v) => setValue('isActive', v)} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End Date (auto-expires)</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocation */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Allocation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Allocation Type *</Label>
              <Select defaultValue={allocationType} onValueChange={(v) => setValue('allocationType', v as typeof ALLOCATION_TYPES[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED_AMOUNT">Fixed Amount (£)</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="REMAINING">Remaining Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {allocationType === 'FIXED_AMOUNT' && (
              <div className="space-y-1.5">
                <Label htmlFor="allocationValue">Amount (£) *</Label>
                <Input id="allocationValue" type="number" step="0.01" placeholder="0.00"
                  {...register('allocationValue', { valueAsNumber: true })} />
                {errors.allocationValue && <p className="text-xs text-destructive">{errors.allocationValue.message}</p>}
              </div>
            )}

            {allocationType === 'PERCENTAGE' && (
              <div className="space-y-1.5">
                <Label htmlFor="allocationPercent">Percentage (%) *</Label>
                <Input id="allocationPercent" type="number" step="0.1" max="100" placeholder="0.0"
                  {...register('allocationPercent', { valueAsNumber: true })} />
                {errors.allocationPercent && <p className="text-xs text-destructive">{errors.allocationPercent.message}</p>}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="minAmount">Minimum Amount (£)</Label>
              <Input id="minAmount" type="number" step="0.01" placeholder="Optional floor"
                {...register('minAmount', { valueAsNumber: true, setValueAs: (v) => v === '' ? null : Number(v) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxAmount">Maximum Amount (£)</Label>
              <Input id="maxAmount" type="number" step="0.01" placeholder="Optional ceiling"
                {...register('maxAmount', { valueAsNumber: true, setValueAs: (v) => v === '' ? null : Number(v) })} />
            </div>
          </div>

          <Separator />

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Target Type *</Label>
              <Select defaultValue={targetType} onValueChange={(v) => setValue('targetType', v as typeof TARGET_TYPES[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACCOUNT">Account</SelectItem>
                  <SelectItem value="SAVINGS_GOAL">Savings Goal</SelectItem>
                  <SelectItem value="DEBT">Debt</SelectItem>
                  <SelectItem value="REMITTANCE_CATEGORY">Remittance Category</SelectItem>
                  <SelectItem value="BUDGET_CATEGORY">Budget Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === 'ACCOUNT' && accounts.length > 0 && (
              <div className="space-y-1.5">
                <Label>Account</Label>
                <Select onValueChange={(v) => setValue('targetId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.accountType})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetType === 'SAVINGS_GOAL' && savingsGoals.length > 0 && (
              <div className="space-y-1.5">
                <Label>Savings Goal</Label>
                <Select onValueChange={(v) => setValue('targetId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger>
                  <SelectContent>
                    {savingsGoals.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} (£{g.currentAmount.toFixed(0)} / £{g.targetAmount.toFixed(0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetType === 'DEBT' && debts.length > 0 && (
              <div className="space-y-1.5">
                <Label>Debt</Label>
                <Select onValueChange={(v) => setValue('targetId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select debt" /></SelectTrigger>
                  <SelectContent>
                    {debts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {incomeSources.length > 0 && (
            <div className="space-y-1.5">
              <Label>Apply to Income Source</Label>
              <Select defaultValue="all" onValueChange={(v) => setValue('incomeSourceId', v === 'all' ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All income sources</SelectItem>
                  {incomeSources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Responsibility */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Payment Responsibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              type="button"
              variant={paymentResp === 'INDIVIDUAL' ? 'default' : 'outline'}
              onClick={() => setValue('paymentResponsibility', 'INDIVIDUAL')}
            >
              Individual
            </Button>
            <Button
              type="button"
              variant={paymentResp === 'SHARED' ? 'default' : 'outline'}
              onClick={() => setValue('paymentResponsibility', 'SHARED')}
            >
              Shared
            </Button>
          </div>

          {paymentResp === 'SHARED' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Total:{' '}
                  <span className={splits.reduce((s, sp) => s + sp.percent, 0) === 100 ? 'text-emerald-600 font-medium' : 'text-destructive font-medium'}>
                    {splits.reduce((s, sp) => s + sp.percent, 0).toFixed(1)}%
                  </span>
                  {' '}/ 100%
                </p>
                <Button type="button" variant="outline" size="sm" onClick={addSplit}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add person
                </Button>
              </div>
              {errors.splits && (
                <p className="text-xs text-destructive">{errors.splits.message ?? errors.splits.root?.message}</p>
              )}
              {splits.map((split, i) => (
                <div key={i} className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Person</Label>
                    <Select value={split.userId} onValueChange={(v) => {
                      const newSplits = [...splits]
                      newSplits[i] = { ...newSplits[i], userId: v }
                      setValue('splits', newSplits)
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28 space-y-1.5">
                    <Label className="text-xs">Share (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      value={split.percent}
                      onChange={(e) => {
                        const newSplits = [...splits]
                        newSplits[i] = { ...newSplits[i], percent: Number(e.target.value) }
                        setValue('splits', newSplits)
                      }}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeSplit(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Conditions (Optional)</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addCondition}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add condition
            </Button>
          </div>
        </CardHeader>
        {conditions.length > 0 && (
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">All conditions must be true for the rule to execute.</p>
            {conditions.map((cond, i) => (
              <div key={i} className="flex gap-3 items-end flex-wrap">
                <div className="space-y-1.5 min-w-36">
                  <Label className="text-xs">Field</Label>
                  <Select value={cond.conditionField} onValueChange={(v) => {
                    const c = [...conditions]; c[i] = { ...c[i], conditionField: v }; setValue('conditions', c)
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITION_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-32">
                  <Label className="text-xs">Operator</Label>
                  <Select value={cond.operator} onValueChange={(v) => {
                    const c = [...conditions]; c[i] = { ...c[i], operator: v as typeof OPERATORS[number] }; setValue('conditions', c)
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {!['MONTH_IS', 'INCOME_SOURCE_IS'].includes(cond.operator) ? (
                  <>
                    <div className="space-y-1.5 w-28">
                      <Label className="text-xs">Value</Label>
                      <Input type="number" step="0.01" value={cond.value ?? ''} onChange={(e) => {
                        const c = [...conditions]; c[i] = { ...c[i], value: e.target.value ? Number(e.target.value) : null }; setValue('conditions', c)
                      }} />
                    </div>
                    {cond.operator === 'BETWEEN' && (
                      <div className="space-y-1.5 w-28">
                        <Label className="text-xs">To</Label>
                        <Input type="number" step="0.01" value={cond.valueB ?? ''} onChange={(e) => {
                          const c = [...conditions]; c[i] = { ...c[i], valueB: e.target.value ? Number(e.target.value) : null }; setValue('conditions', c)
                        }} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1.5 w-36">
                    <Label className="text-xs">{cond.operator === 'MONTH_IS' ? 'Month (1-12)' : 'Source ID'}</Label>
                    <Input value={cond.stringValue ?? ''} onChange={(e) => {
                      const c = [...conditions]; c[i] = { ...c[i], stringValue: e.target.value }; setValue('conditions', c)
                    }} />
                  </div>
                )}
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeCondition(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Carry forward */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Carry Forward</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable carry forward</p>
              <p className="text-xs text-muted-foreground mt-0.5">Move unspent allocation to another bucket at end of period</p>
            </div>
            <Switch defaultChecked={defaultValues?.carryForward ?? false}
              onCheckedChange={(v) => setValue('carryForward', v)} />
          </div>
          {carryForward && (
            <div className="space-y-1.5">
              <Label>Carry Forward To</Label>
              <Select defaultValue={defaultValues?.carryForwardTarget ?? 'LEAVE_IN_ACCOUNT'}
                onValueChange={(v) => setValue('carryForwardTarget', v as typeof CARRY_FORWARD_TARGETS[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARRY_FORWARD_TARGETS.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Any additional notes about this rule..." rows={3} {...register('notes')} />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Rule' : 'Create Rule'}
        </Button>
      </div>
    </form>
  )
}
