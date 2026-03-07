import NewRequirementPage from '../../requirements/new/new-requirement-page'

export const dynamic = 'force-dynamic'

// Legacy wrapper: keep `/explorations/new` available, but route the real
// Requirement intake implementation through `requirements/new/*`.
export default NewRequirementPage
