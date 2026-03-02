import { eventBus } from '@/server/events/bus'
import { getSession } from '@/server/auth/session'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const userId = session.userId
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const handler = (event: { userId: string; [key: string]: unknown }) => {
        if (event.userId === userId) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          } catch {
            // Controller may be closed
          }
        }
      }

      eventBus.on('notification.created', handler)

      req.signal.addEventListener('abort', () => {
        eventBus.off('notification.created', handler)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
