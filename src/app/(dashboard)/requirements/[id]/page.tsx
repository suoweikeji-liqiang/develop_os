import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function RequirementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/explorations/${id}`)
}
