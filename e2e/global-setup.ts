import 'dotenv/config'
import { hash } from 'bcrypt'
import { randomUUID } from 'crypto'
import { Client } from 'pg'

async function globalSetup() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for E2E tests')
  }

  const client = new Client({ connectionString })
  await client.connect()

  const email = process.env.E2E_EMAIL ?? 'e2e@example.com'
  const password = process.env.E2E_PASSWORD ?? 'E2ePassw0rd!'
  const hashedPassword = await hash(password, 10)
  const id = randomUUID()

  const userResult = await client.query<{ id: string }>(
    `INSERT INTO "User" (id, email, password, name, "isAdmin", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (email)
     DO UPDATE SET
       password = EXCLUDED.password,
       name = EXCLUDED.name,
       "updatedAt" = NOW()
     RETURNING id`,
    [id, email, hashedPassword, 'E2E User', false],
  )
  const userId = userResult.rowCount ? userResult.rows[0].id : (
    await client.query<{ id: string }>('SELECT id FROM "User" WHERE email = $1 LIMIT 1', [email])
  ).rows[0].id

  // Keep E2E runs deterministic by removing previous E2E user's KB artifacts.
  await client.query(
    `DELETE FROM "KnowledgeChunk"
     WHERE "sourceId" IN (SELECT id FROM "KnowledgeDocument" WHERE "uploadedBy" = $1)
        OR "sourceId" IN (SELECT id FROM "CodeRepository" WHERE "addedBy" = $1)`,
    [userId],
  )
  await client.query(`DELETE FROM "KnowledgeDocument" WHERE "uploadedBy" = $1`, [userId])
  await client.query(`DELETE FROM "CodeRepository" WHERE "addedBy" = $1`, [userId])

  const requirementId = 'e2e-requirement-citations'
  const model = {
    goal: {
      summary: 'Validate citation rendering in requirement detail page',
      before: 'No citation section is visible in an E2E seeded requirement',
      after: 'Citation section is visible with seeded citation entries',
      metrics: ['Sources section rendered', 'Citation card displays source name'],
    },
    assumption: {
      items: [
        {
          content: 'Citation rendering relies on Requirement.citations JSON field',
          confidence: 'high',
          rationale: 'The component casts citations and renders cards when length > 0',
        },
      ],
    },
    behavior: {
      actors: ['tester'],
      actions: [
        {
          actor: 'tester',
          action: 'open seeded requirement detail page',
          precondition: 'seed data exists',
          postcondition: 'citation cards are visible',
        },
      ],
    },
    scenario: {
      normal: [
        {
          name: 'View seeded requirement',
          steps: ['Login', 'Navigate to seeded requirement detail', 'Observe Sources section'],
        },
      ],
      edge: [],
      error: [],
    },
    verifiability: {
      automated: [
        {
          criterion: 'Sources heading and seeded citation are visible',
          method: 'Playwright assertion on requirement detail page',
        },
      ],
      manual: [],
    },
  }
  const citations = [
    {
      chunkId: 'e2e-chunk-1',
      sourceName: 'E2E Spec Document',
      sourceType: 'document',
      excerpt: 'Seeded excerpt for end-to-end citation rendering verification.',
    },
  ]

  await client.query(
    `INSERT INTO "Requirement"
      (id, title, "rawInput", model, citations, confidence, status, tags, attempts, version, "createdBy", "createdAt", "updatedAt")
     VALUES
      ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, 'DRAFT', ARRAY['e2e'], 1, 1, $7, NOW(), NOW())
     ON CONFLICT (id)
     DO UPDATE SET
      title = EXCLUDED.title,
      "rawInput" = EXCLUDED."rawInput",
      model = EXCLUDED.model,
      citations = EXCLUDED.citations,
      confidence = EXCLUDED.confidence,
      status = EXCLUDED.status,
      tags = EXCLUDED.tags,
      "createdBy" = EXCLUDED."createdBy",
      "updatedAt" = NOW()`,
    [
      requirementId,
      'E2E Requirement With Citations',
      'Seeded requirement for E2E citation visibility checks.',
      JSON.stringify(model),
      JSON.stringify(citations),
      JSON.stringify({ goal: 0.92 }),
      userId,
    ],
  )

  await client.end()
}

export default globalSetup
