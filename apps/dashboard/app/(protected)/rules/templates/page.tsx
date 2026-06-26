import { getCurrentUserProfile } from '@/lib/auth'
import { db } from '@/lib/db'
import RuleTemplatesClient from './_components/RuleTemplatesClient'

export default async function RuleTemplatesPage() {
  await getCurrentUserProfile()
  const templates = await db.ruleTemplate.findMany({ orderBy: { profileType: 'asc' } })

  return (
    <RuleTemplatesClient
      templates={templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        profileType: t.profileType,
        rules: t.rules as Array<Record<string, unknown>>,
      }))}
    />
  )
}
