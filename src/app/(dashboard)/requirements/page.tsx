import { ExplorationIndexPage } from '../explorations/exploration-index-page'

export const dynamic = 'force-dynamic'

export default async function RequirementsPage() {
  return <ExplorationIndexPage listView="explorations" />
}
