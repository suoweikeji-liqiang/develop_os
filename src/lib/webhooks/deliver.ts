export async function deliverWebhook(url: string, payload: object): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.error(`[webhook] delivery failed: ${url} -> ${res.status}`)
    }
  } catch (err) {
    console.error(`[webhook] delivery error: ${url}`, err)
  }
}
