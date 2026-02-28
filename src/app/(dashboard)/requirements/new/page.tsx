import { verifySession } from '@/lib/dal'
import { RequirementForm } from './form'

export const dynamic = 'force-dynamic'

export default async function NewRequirementPage() {
  await verifySession()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">新建需求</h1>
      <RequirementForm />
    </div>
  )
}
