import { ExplorationIndexPage } from './exploration-index-page'

export const dynamic = 'force-dynamic'

export default async function ExplorationsPage() {
  return <ExplorationIndexPage listView="explorations" />
}
