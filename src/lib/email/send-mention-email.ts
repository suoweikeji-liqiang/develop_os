import { render } from '@react-email/components'
import { MentionEmailTemplate } from './templates/mention-email'

interface MentionEmailParams {
  to: string
  mentionedBy: string
  requirementTitle: string
  commentPreview: string
  requirementUrl: string
}

export async function sendMentionEmail(params: MentionEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('[DEV] Mention email (no RESEND_API_KEY):', params)
    return
  }
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const html = await render(MentionEmailTemplate(params))
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
      to: params.to,
      subject: `${params.mentionedBy} 在需求中提到了你`,
      html,
    })
    if (error) console.error('[email] send-mention-email failed:', error)
  } catch (err) {
    console.error('[email] send-mention-email error:', err)
  }
}
