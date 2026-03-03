import { verifySession } from '@/lib/dal'
import { ExplorationForm } from './exploration-form'

export const dynamic = 'force-dynamic'

export default async function NewExplorationPage() {
  await verifySession()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Start New Exploration</h1>
      <ExplorationForm />
    </div>
  )
}
