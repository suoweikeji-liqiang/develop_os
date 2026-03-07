import RequirementDetailPage from '../../requirements/[id]/page'

export const dynamic = 'force-dynamic'

// Legacy route alias: keep `/explorations/[id]` available, but the Requirement
// detail implementation now lives under `/requirements/[id]`.
export default RequirementDetailPage
