import { RequirementIndexPage, type ListView } from '../requirements/requirement-index-page'

interface Props {
  listView: ListView
}

// Legacy wrapper: keep the historical exploration entry available, but route
// the actual Requirement list implementation through `requirements/*`.
export async function ExplorationIndexPage({ listView }: Props) {
  return <RequirementIndexPage listView={listView} />
}
