import { SubmitForm } from './submit-form'

export const dynamic = 'force-dynamic'

export default function ExternalSubmitPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-2xl px-4 py-12">
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold">提交需求</h1>
          <p className="mb-6 text-sm text-gray-500">
            填写以下表单提交需求，无需注册账号。提交成功后请保存您的跟踪链接。
          </p>
          <SubmitForm />
        </div>
      </div>
    </div>
  )
}
