import { randomUUID } from 'node:crypto'
import { hash } from 'bcrypt'
import { describe, beforeAll, afterAll, afterEach, expect, it } from 'vitest'
import { prisma } from '@/server/db/client'
import { appRouter } from '@/server/trpc/router'

type Role = 'PRODUCT' | 'DEV' | 'TEST' | 'UI' | 'EXTERNAL'

type SeedUser = {
  id: string
  email: string
  name: string
  isAdmin: boolean
  roles: Role[]
}

const runId = `api-${Date.now()}-${Math.floor(Math.random() * 10000)}`
const createdRequirementIds = new Set<string>()
const createdDocumentIds = new Set<string>()
const createdRepositoryIds = new Set<string>()

const users: {
  owner?: SeedUser
  product?: SeedUser
  dev?: SeedUser
  tester?: SeedUser
  ui?: SeedUser
  mentioned?: SeedUser
} = {}

function createCaller(user: SeedUser) {
  return appRouter.createCaller({
    session: {
      userId: user.id,
      isAdmin: user.isAdmin,
      roles: user.roles,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        roles: user.roles.map((role) => ({ role })),
      },
    },
  } as never)
}

async function upsertUser(name: string, roles: Role[] = []): Promise<SeedUser> {
  const email = `${runId}-${name.toLowerCase()}@example.com`
  const password = await hash('ApiPassw0rd!', 10)
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password,
      isAdmin: false,
      updatedAt: new Date(),
    },
    create: {
      email,
      name,
      password,
      isAdmin: false,
    },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
    },
  })

  for (const role of roles) {
    await prisma.userRole.upsert({
      where: {
        userId_role: {
          userId: user.id,
          role,
        },
      },
      update: {},
      create: {
        userId: user.id,
        role,
      },
    })
  }

  return {
    ...user,
    roles,
  }
}

async function cleanupRequirementArtifacts(requirementId: string) {
  await prisma.notification.deleteMany({ where: { requirementId } })
  await prisma.mention.deleteMany({ where: { comment: { requirementId } } })
  await prisma.comment.deleteMany({ where: { requirementId } })
  await prisma.reviewSignoff.deleteMany({ where: { requirementId } })
  await prisma.requirementVersion.deleteMany({ where: { requirementId } })
  await prisma.conversationMessage.deleteMany({ where: { requirementId } })
  await prisma.requirement.deleteMany({ where: { id: requirementId } })
}

describe.sequential('API business flow', () => {
  beforeAll(async () => {
    users.owner = await upsertUser('Owner')
    users.product = await upsertUser('Product', ['PRODUCT'])
    users.dev = await upsertUser('Dev', ['DEV'])
    users.tester = await upsertUser('Tester', ['TEST'])
    users.ui = await upsertUser('UI', ['UI'])
    users.mentioned = await upsertUser('Mentioned')
  })

  afterEach(async () => {
    for (const requirementId of createdRequirementIds) {
      await cleanupRequirementArtifacts(requirementId)
    }
    createdRequirementIds.clear()

    for (const documentId of createdDocumentIds) {
      await prisma.$executeRaw`
        DELETE FROM "KnowledgeChunk"
        WHERE "sourceType" = 'document' AND "sourceId" = ${documentId}
      `
      await prisma.knowledgeDocument.deleteMany({ where: { id: documentId } })
    }
    createdDocumentIds.clear()

    for (const repositoryId of createdRepositoryIds) {
      await prisma.$executeRaw`
        DELETE FROM "KnowledgeChunk"
        WHERE "sourceType" = 'code' AND "sourceId" = ${repositoryId}
      `
      await prisma.codeRepository.deleteMany({ where: { id: repositoryId } })
    }
    createdRepositoryIds.clear()
  })

  afterAll(async () => {
    const allUserIds = Object.values(users)
      .filter((item): item is SeedUser => Boolean(item))
      .map((item) => item.id)

    if (allUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: allUserIds } } })
    }

    await prisma.$disconnect()
  })

  it('covers requirement status gating and signoff consensus flow', async () => {
    const ownerCaller = createCaller(users.owner!)
    const requirement = await ownerCaller.requirement.create({
      title: `${runId}-flow-${randomUUID()}`,
      rawInput: 'Validate requirement lifecycle gating through API integration tests.',
    })
    createdRequirementIds.add(requirement.id)

    await ownerCaller.requirement.transitionStatus({ id: requirement.id, to: 'IN_REVIEW' })

    await expect(
      ownerCaller.requirement.transitionStatus({ id: requirement.id, to: 'CONSENSUS' }),
    ).rejects.toHaveProperty('code', 'PRECONDITION_FAILED')

    const checklist = [{ key: 'done', label: 'all checked', checked: true }]
    await createCaller(users.product!).signoff.submit({ requirementId: requirement.id, role: 'PRODUCT', checklist })
    await createCaller(users.dev!).signoff.submit({ requirementId: requirement.id, role: 'DEV', checklist })
    await createCaller(users.tester!).signoff.submit({ requirementId: requirement.id, role: 'TEST', checklist })
    await createCaller(users.ui!).signoff.submit({ requirementId: requirement.id, role: 'UI', checklist })

    await ownerCaller.requirement.transitionStatus({ id: requirement.id, to: 'CONSENSUS' })
    const signoffs = await ownerCaller.signoff.list({ requirementId: requirement.id })
    expect(signoffs).toHaveLength(4)

    await ownerCaller.requirement.transitionStatus({ id: requirement.id, to: 'IN_REVIEW' })
    const signoffsAfterRollback = await ownerCaller.signoff.list({ requirementId: requirement.id })
    expect(signoffsAfterRollback).toHaveLength(0)
  })

  it('creates comments with mentions and emits mention notifications', async () => {
    const ownerCaller = createCaller(users.owner!)
    const mentionedCaller = createCaller(users.mentioned!)

    const requirement = await ownerCaller.requirement.create({
      title: `${runId}-comment-${randomUUID()}`,
      rawInput: 'Validate mention extraction and notification creation.',
    })
    createdRequirementIds.add(requirement.id)

    const unreadBefore = await mentionedCaller.notification.unreadCount()
    const mentionContent = `Please review this @[${users.mentioned!.name}](${users.mentioned!.id})`

    await ownerCaller.comment.create({
      requirementId: requirement.id,
      content: mentionContent,
    })

    const comments = await ownerCaller.comment.list({ requirementId: requirement.id })
    expect(comments).toHaveLength(1)
    expect(comments[0].content).toContain(users.mentioned!.id)

    const unreadAfter = await mentionedCaller.notification.unreadCount()
    expect(unreadAfter).toBeGreaterThan(unreadBefore)
  })

  it('deletes knowledge document and related chunks', async () => {
    const ownerCaller = createCaller(users.owner!)

    const document = await prisma.knowledgeDocument.create({
      data: {
        name: `${runId}-doc.txt`,
        mimeType: 'text/plain',
        status: 'READY',
        chunkCount: 1,
        uploadedBy: users.owner!.id,
      },
    })
    createdDocumentIds.add(document.id)

    await prisma.$executeRaw`
      INSERT INTO "KnowledgeChunk" (id, "sourceType", "sourceId", "sourceName", content, embedding, metadata, "createdAt")
      VALUES (
        ${`chunk-${randomUUID()}`},
        'document',
        ${document.id},
        ${document.name},
        'api test chunk',
        array_fill(0::real, ARRAY[1536])::vector,
        '{}'::jsonb,
        NOW()
      )
    `

    await ownerCaller.knowledgeDocument.delete({ id: document.id })
    createdDocumentIds.delete(document.id)

    const remainingDocument = await prisma.knowledgeDocument.count({ where: { id: document.id } })
    const chunkRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM "KnowledgeChunk"
      WHERE "sourceType" = 'document' AND "sourceId" = ${document.id}
    `

    expect(remainingDocument).toBe(0)
    expect(Number(chunkRows[0].count)).toBe(0)
  })

  it('covers code repository add/list/delete API flow', async () => {
    const ownerCaller = createCaller(users.owner!)
    const owner = `${runId}-owner`
    const repo = 'api-flow-repo'

    const created = await ownerCaller.codeRepository.add({
      owner,
      repo,
      githubToken: 'ghp_apiFlowFakeToken',
    })
    createdRepositoryIds.add(created.id)

    const listAfterAdd = await ownerCaller.codeRepository.list()
    expect(listAfterAdd.some((item) => item.id === created.id && item.owner === owner && item.repo === repo)).toBeTruthy()

    await ownerCaller.codeRepository.delete({ id: created.id })
    createdRepositoryIds.delete(created.id)

    const listAfterDelete = await ownerCaller.codeRepository.list()
    expect(listAfterDelete.some((item) => item.id === created.id)).toBeFalsy()
  })
})
