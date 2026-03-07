import { RequirementIndexPage } from './requirement-index-page'

export const dynamic = 'force-dynamic'

export default async function RequirementsPage() {
  return <RequirementIndexPage listView="requirements" />
}
