import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const view = typeof params.view === 'string' ? params.view : undefined
  const targetBase = view === 'models'
    ? '/models'
    : view === 'evolution'
      ? '/evolution'
      : '/explorations'

  const targetParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (key === 'view' || value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        targetParams.append(key, item)
      }
      continue
    }
    targetParams.set(key, value)
  }

  const targetQuery = targetParams.toString()
  redirect(targetQuery ? `${targetBase}?${targetQuery}` : targetBase)
}
