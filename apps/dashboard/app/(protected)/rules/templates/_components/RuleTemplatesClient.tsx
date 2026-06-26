'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  profileType: string
  rules: Array<Record<string, unknown>>
}

interface Props {
  templates: Template[]
}

const PROFILE_COLORS: Record<string, string> = {
  'Single Professional': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Married Couple': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Indian Expat': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'FIRE Strategy': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'Debt Payoff': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default function RuleTemplatesClient({ templates }: Props) {
  const router = useRouter()
  const [applying, setApplying] = useState<string | null>(null)
  const [applied, setApplied] = useState<Set<string>>(new Set())

  async function applyTemplate(template: Template) {
    setApplying(template.id)
    try {
      for (const ruleDef of template.rules) {
        await fetch('/api/v1/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ruleDef),
        })
      }
      setApplied((prev) => new Set([...prev, template.id]))
    } finally {
      setApplying(null)
    }
  }

  const byProfile = templates.reduce<Record<string, Template[]>>((acc, t) => {
    if (!acc[t.profileType]) acc[t.profileType] = []
    acc[t.profileType].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rule Templates"
        description="Apply a pre-built set of rules to get started quickly. You can edit any rule after applying."
      >
        <Button variant="outline" asChild>
          <Link href="/rules">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Rules
          </Link>
        </Button>
      </PageHeader>

      {templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No templates available. Run the seed command to add default templates.
        </div>
      ) : (
        Object.entries(byProfile).map(([profile, profileTemplates]) => (
          <div key={profile}>
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PROFILE_COLORS[profile] ?? 'bg-gray-100 text-gray-800'}`}>
                {profile}
              </span>
              <span className="text-sm text-muted-foreground">{profileTemplates.length} template{profileTemplates.length > 1 ? 's' : ''}</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profileTemplates.map((t) => (
                <Card key={t.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    {t.description && (
                      <CardDescription className="text-xs">{t.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-xs text-muted-foreground mb-2">
                      {t.rules.length} rule{t.rules.length > 1 ? 's' : ''} will be created:
                    </p>
                    <ul className="space-y-1">
                      {t.rules.slice(0, 5).map((r, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs">
                          <span className="w-1 h-1 rounded-full bg-muted-foreground shrink-0" />
                          {String(r.name)}
                          {r.allocationType === 'FIXED_AMOUNT' && (
                            <span className="text-muted-foreground">£{String(r.allocationValue ?? 0)}</span>
                          )}
                          {r.allocationType === 'PERCENTAGE' && (
                            <span className="text-muted-foreground">{String(r.allocationPercent ?? 0)}%</span>
                          )}
                          {r.allocationType === 'REMAINING' && (
                            <span className="text-muted-foreground">remaining</span>
                          )}
                        </li>
                      ))}
                      {t.rules.length > 5 && (
                        <li className="text-xs text-muted-foreground pl-2.5">+{t.rules.length - 5} more</li>
                      )}
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-3">
                    {applied.has(t.id) ? (
                      <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Applied
                      </div>
                    ) : (
                      <Button
                        className="w-full"
                        size="sm"
                        disabled={applying === t.id}
                        onClick={() => applyTemplate(t)}
                      >
                        {applying === t.id ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Applying...</>
                        ) : (
                          'Apply Template'
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {[...applied].length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => router.push('/rules')}>View My Rules</Button>
        </div>
      )}
    </div>
  )
}
