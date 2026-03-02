import { CheckCircle2, Clock, Loader2, XCircle, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '待处理',
  IN_REVIEW: '评审中',
  CONSENSUS: '已达成共识',
  IMPLEMENTING: '实现中',
  DONE: '已完成',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  DRAFT: <Clock className="h-8 w-8 text-gray-400" />,
  IN_REVIEW: <Loader2 className="h-8 w-8 text-blue-500" />,
  CONSENSUS: <CheckCircle2 className="h-8 w-8 text-green-500" />,
  IMPLEMENTING: <Loader2 className="h-8 w-8 text-purple-500" />,
  DONE: <CheckCircle2 className="h-8 w-8 text-green-600" />,
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  DRAFT: '您的需求已收到，正在等待团队处理。',
  IN_REVIEW: '需求正在由团队各角色进行评审。',
  CONSENSUS: '团队已就需求达成共识，准备进入实现阶段。',
  IMPLEMENTING: '需求正在开发实现中。',
  DONE: '需求已完成实现。',
}

interface StatusData {
  title: string
  status: string
  updatedAt: string
  submitterName: string
}

async function fetchStatus(token: string): Promise<StatusData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const input = encodeURIComponent(JSON.stringify({ json: { token } }))

  try {
    const res = await fetch(`${baseUrl}/api/trpc/external.status?input=${input}`, {
      cache: 'no-store',
    })

    if (!res.ok) return null

    const data = await res.json()
    return data?.result?.data?.json ?? null
  } catch {
    return null
  }
}

export default async function StatusPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const submission = await fetchStatus(token)

  if (!submission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4">
          <div className="rounded-lg border bg-white p-8 shadow-sm text-center space-y-4">
            <XCircle className="h-12 w-12 text-red-400 mx-auto" />
            <h1 className="text-xl font-semibold text-gray-800">未找到该提交记录</h1>
            <p className="text-sm text-gray-500">
              跟踪码无效或已过期，请确认链接是否完整。
            </p>
            <a
              href="/submit"
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              重新提交需求
            </a>
          </div>
        </div>
      </div>
    )
  }

  const statusLabel = STATUS_LABELS[submission.status] ?? submission.status
  const statusIcon = STATUS_ICONS[submission.status] ?? <AlertCircle className="h-8 w-8 text-gray-400" />
  const statusDescription = STATUS_DESCRIPTIONS[submission.status] ?? ''

  const updatedAt = new Date(submission.updatedAt)
  const formattedDate = updatedAt.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-lg px-4 py-12">
        <div className="rounded-lg border bg-white p-8 shadow-sm space-y-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">需求标题</p>
            <h1 className="text-xl font-semibold text-gray-900">{submission.title}</h1>
          </div>

          <div className="flex items-start gap-4 rounded-md bg-gray-50 border p-5">
            <div className="mt-0.5">{statusIcon}</div>
            <div>
              <p className="font-semibold text-lg text-gray-800">{statusLabel}</p>
              <p className="text-sm text-gray-500 mt-1">{statusDescription}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">提交人</p>
              <p className="text-gray-700 mt-0.5">{submission.submitterName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">最后更新</p>
              <p className="text-gray-700 mt-0.5">{formattedDate}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-400">
              此页面显示实时处理状态。刷新页面以获取最新进度。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
