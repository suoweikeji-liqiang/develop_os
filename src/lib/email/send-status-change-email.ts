import { render } from '@react-email/components'
import { StatusChangeEmailTemplate } from './templates/status-change-email'

interface StatusChangeEmailParams {
  to: string
  requirementTitle: string
  fromStatus: string
  toStatus: string
  changedBy: string
  requirementUrl: string
}

export async function sendStatusChangeEmail(params: StatusChangeEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('[DEV] Status change email (no RESEND_API_KEY):', params)
    return
  }
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const html = await render(StatusChangeEmailTemplate(params))
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
      to: params.to,
      subject: `需求状态变更: ${params.requirementTitle}`,
      html,
    })
    if (error) console.error('[email] send-status-change-email failed:', error)
  } catch (err) {
    console.error('[email] send-status-change-email error:', err)
  }
}
