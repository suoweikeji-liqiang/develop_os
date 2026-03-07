import { ExplorationIndexPage } from './exploration-index-page'

export const dynamic = 'force-dynamic'

// Legacy route alias: keep `/explorations` available, but the primary entry is `/requirements`.
export default async function ExplorationsPage() {
  return <ExplorationIndexPage listView="explorations" />
}
