import { expect, test, type Page } from '@playwright/test'

const email = process.env.E2E_EMAIL ?? 'e2e@example.com'
const password = process.env.E2E_PASSWORD ?? 'E2ePassw0rd!'

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/')
}

function readTrpcJson<T>(payload: unknown): T | undefined {
  if (Array.isArray(payload)) {
    const first = payload[0] as { result?: { data?: { json?: T } } } | undefined
    return first?.result?.data?.json as T | undefined
  }
  const result = payload as { result?: { data?: { json?: T } } }
  return result.result?.data?.json as T | undefined
}

function findRepositoryId(payload: unknown, owner: string, repo: string): string | undefined {
  const stack: unknown[] = [payload]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    if (Array.isArray(current)) {
      stack.push(...current)
      continue
    }
    if (typeof current !== 'object') continue
    const candidate = current as Record<string, unknown>
    if (
      typeof candidate.id === 'string'
      && candidate.owner === owner
      && candidate.repo === repo
    ) {
      return candidate.id
    }
    stack.push(...Object.values(candidate))
  }
  return undefined
}

test('redirects unauthenticated user to login from protected route', async ({ page }) => {
  await page.goto('/requirements')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('input[name="email"]')).toBeVisible()
})

test('allows seeded user to login and reach dashboard', async ({ page }) => {
  await login(page)
  await expect(page.locator('a[href="/requirements"]').first()).toBeVisible()
})

test('supports creating requirement and finding it in list', async ({ page }) => {
  await login(page)

  const title = `e2e-requirement-${Date.now()}`
  const rawInput = 'E2E business flow requirement created from UI form.'
  const createResult = await page.evaluate(async ({ title, rawInput }) => {
    const response = await fetch('/api/trpc/requirement.create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, rawInput }),
    })
    return { ok: response.ok, text: await response.text() }
  }, { title, rawInput })
  expect(createResult.ok, createResult.text).toBeTruthy()

  const createPayload = JSON.parse(createResult.text) as unknown
  const createdId =
    readTrpcJson<{ id: string }>(createPayload)?.id
    ?? (createPayload as { result?: { data?: { id?: string } } })?.result?.data?.id
  expect(createdId).toBeTruthy()

  await page.goto(`/requirements/${createdId as string}`)
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible()

  await page.goto('/requirements')
  await expect(page.locator('a').filter({ hasText: title }).first()).toBeVisible()
})

test('renders knowledge base page sections for authenticated user', async ({ page }) => {
  await login(page)
  await page.goto('/knowledge')

  await expect(page.getByRole('heading', { name: 'Knowledge Base', exact: true, level: 1 })).toBeVisible()
  await expect(page.locator('input[type="file"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Repositories' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'How Knowledge Base Works' })).toBeVisible()
})

test('supports document upload and delete in knowledge base', async ({ page }) => {
  await login(page)
  await page.goto('/knowledge')

  const fileName = `e2e-doc-${Date.now()}.txt`
  const fileInput = page.locator('main input[type="file"]').first()
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: 'text/plain',
    buffer: Buffer.from('E2E upload content for knowledge document pipeline.'),
  })
  const uploadButton = page.getByRole('button', { name: 'Upload' })
  await expect(uploadButton).toBeEnabled()

  const [uploadResponse] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes('/api/upload') && response.request().method() === 'POST',
    ),
    uploadButton.click(),
  ])
  expect(uploadResponse.ok()).toBeTruthy()
  const uploadPayload = await uploadResponse.json()
  const uploaded = uploadPayload as { id?: string; status?: string }
  expect(typeof uploaded.id).toBe('string')
  expect(uploaded.status).toBe('PROCESSING')

  const deleteResult = await page.evaluate(async (id) => {
    const response = await fetch('/api/trpc/knowledgeDocument.delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    return { ok: response.ok, text: await response.text() }
  }, uploaded.id as string)
  expect(deleteResult.ok, deleteResult.text).toBeTruthy()
})

test('supports repository connect and delete flow', async ({ page }) => {
  await login(page)
  await page.goto('/knowledge')

  const owner = `e2e-owner-${Date.now()}`
  const repo = 'e2e-repo'

  await page.getByPlaceholder('Owner').fill(owner)
  await page.getByPlaceholder('Repository').fill(repo)
  await page.getByPlaceholder('GitHub Token').fill('ghp_e2eFakeTokenForFlowValidation')
  const connectButton = page.getByRole('button', { name: 'Connect Repository' })
  await expect(connectButton).toBeEnabled()
  const [connectResponse] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes('/api/trpc/codeRepository.add') && response.request().method() === 'POST',
    ),
    connectButton.click(),
  ])
  const connectBody = await connectResponse.text()
  expect(connectResponse.ok(), connectBody).toBeTruthy()

  const connectPayload = JSON.parse(connectBody) as unknown
  let repoId: string | null =
    findRepositoryId(connectPayload, owner, repo)
    ?? readTrpcJson<{ id: string }>(connectPayload)?.id
    ?? (connectPayload as { id?: string })?.id
    ?? null

  if (!repoId) {
    await expect.poll(async () => {
      const listResult = await page.evaluate(async () => {
        const response = await fetch('/api/trpc/codeRepository.list')
        return {
          ok: response.ok,
          body: await response.text(),
        }
      })
      if (!listResult.ok) return null

      const listPayload = JSON.parse(listResult.body) as unknown
      repoId =
        findRepositoryId(listPayload, owner, repo)
        ?? readTrpcJson<Array<{ id: string; owner: string; repo: string }>>(listPayload)
          ?.find((item) => item.owner === owner && item.repo === repo)
          ?.id
        ?? null
      return repoId
    }).not.toBeNull()
  }
  expect(repoId).toBeTruthy()

  const deleteResult = await page.evaluate(async (id) => {
    const response = await fetch('/api/trpc/codeRepository.delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    return { ok: response.ok, text: await response.text() }
  }, repoId as string)
  expect(deleteResult.ok, deleteResult.text).toBeTruthy()
})

test('shows seeded citations on requirement detail page', async ({ page }) => {
  await login(page)
  await page.goto('/requirements/e2e-requirement-citations')
  await expect(page.getByRole('heading', { name: 'E2E Requirement With Citations', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
  await expect(page.getByText('E2E Spec Document')).toBeVisible()
})
