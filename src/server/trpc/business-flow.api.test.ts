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
const runDatabaseSuite = process.env.RUN_DB_TESTS === '1'

const users: {
  owner?: SeedUser
  admin?: SeedUser
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

async function upsertUser(name: string, roles: Role[] = [], isAdmin = false): Promise<SeedUser> {
  const email = `${runId}-${name.toLowerCase()}@example.com`
  const password = await hash('ApiPassw0rd!', 10)
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password,
      isAdmin,
      updatedAt: new Date(),
    },
    create: {
      email,
      name,
      password,
      isAdmin,
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

describe.skipIf(!runDatabaseSuite).sequential('API business flow', () => {
  beforeAll(async () => {
    users.owner = await upsertUser('Owner')
    users.admin = await upsertUser('Admin', [], true)
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

  it('covers workflow actor permissions and signoff consensus flow', async () => {
    const ownerCaller = createCaller(users.owner!)
    const adminCaller = createCaller(users.admin!)
    const productCaller = createCaller(users.product!)
    const requirement = await ownerCaller.requirement.create({
      title: `${runId}-flow-${randomUUID()}`,
      rawInput: 'Validate requirement lifecycle gating through API integration tests.',
    })
    createdRequirementIds.add(requirement.id)

    await expect(
      ownerCaller.requirement.transitionStatus({ id: requirement.id, to: 'IN_REVIEW' }),
    ).rejects.toHaveProperty('code', 'FORBIDDEN')

    await productCaller.requirement.transitionStatus({ id: requirement.id, to: 'IN_REVIEW' })

    await expect(
      adminCaller.requirement.transitionStatus({ id: requirement.id, to: 'CONSENSUS' }),
    ).rejects.toHaveProperty('code', 'PRECONDITION_FAILED')

    const checklist = [{ key: 'done', label: 'all checked', checked: true }]
    await createCaller(users.product!).signoff.submit({ requirementId: requirement.id, role: 'PRODUCT', checklist })
    await createCaller(users.dev!).signoff.submit({ requirementId: requirement.id, role: 'DEV', checklist })
    await createCaller(users.tester!).signoff.submit({ requirementId: requirement.id, role: 'TEST', checklist })
    await createCaller(users.ui!).signoff.submit({ requirementId: requirement.id, role: 'UI', checklist })

    await adminCaller.requirement.transitionStatus({ id: requirement.id, to: 'CONSENSUS' })
    const signoffs = await adminCaller.signoff.list({ requirementId: requirement.id })
    expect(signoffs).toHaveLength(4)

    await adminCaller.requirement.transitionStatus({ id: requirement.id, to: 'IN_REVIEW' })
    const signoffsAfterRollback = await adminCaller.signoff.list({ requirementId: requirement.id })
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

  it('covers requirement evolution phase-one flow', async () => {
    const ownerCaller = createCaller(users.owner!)

    const requirement = await ownerCaller.requirement.create({
      title: `${runId}-evolution-${randomUUID()}`,
      rawInput: 'Validate requirement evolution phase-one object flow.',
    })
    createdRequirementIds.add(requirement.id)

    await ownerCaller.requirement.updateModel({
      id: requirement.id,
      changeSource: 'manual',
      model: {
        goal: {
          summary: '用户可完成手机号注册并自动登录',
          before: '用户尚未拥有账号',
          after: '用户注册成功并进入系统首页',
          metrics: ['注册完成率提升', '首次登录成功率可追踪'],
        },
        assumption: {
          items: [
            {
              content: '手机号可正常接收验证码',
              confidence: 'medium',
              rationale: '依赖短信通道稳定性',
            },
          ],
        },
        behavior: {
          actors: ['用户', '系统'],
          actions: [
            {
              actor: '用户',
              action: '输入手机号并提交验证码请求',
            },
            {
              actor: '系统',
              action: '校验验证码并创建账号',
              postcondition: '新账号可用于登录',
            },
          ],
        },
        scenario: {
          normal: [
            {
              name: '手机号注册主流程',
              steps: ['输入手机号', '接收验证码', '完成注册', '自动登录'],
            },
          ],
          edge: [
            {
              name: '验证码发送慢',
              trigger: '短信通道响应延迟',
              steps: ['用户等待', '页面展示重试入口'],
            },
          ],
          error: [
            {
              name: '验证码错误',
              steps: ['系统拒绝注册请求', '提示重新输入验证码'],
              recovery: '允许重新发起验证码流程',
            },
          ],
        },
        verifiability: {
          automated: [
            {
              criterion: '验证码正确时注册成功',
              method: '接口自动化测试',
            },
          ],
          manual: [
            {
              criterion: '短信文案符合预期',
              reason: '依赖外部短信渠道展示',
            },
          ],
        },
      },
    })

    const updatedRequirement = await ownerCaller.requirement.updateStability({
      requirementId: requirement.id,
      stabilityLevel: 'S2_MAIN_FLOW_CLEAR',
      stabilityScore: 60,
      stabilityReason: '主流程已明确，但异常路径仍需补充',
    })
    expect(updatedRequirement.stabilityLevel).toBe('S2_MAIN_FLOW_CLEAR')

    const bootstrapResult = await ownerCaller.requirementUnit.bootstrapFromModel({
      requirementId: requirement.id,
    })
    expect(bootstrapResult.created).toBeGreaterThan(0)

    const createdUnit = await ownerCaller.requirementUnit.create({
      requirementId: requirement.id,
      title: '注册异常补充',
      summary: '单独追踪验证码错误和重试边界。',
      layer: 'exception',
    })

    const units = await ownerCaller.requirementUnit.listByRequirement({ requirementId: requirement.id })
    expect(units.length).toBeGreaterThanOrEqual(2)

    await ownerCaller.requirementUnit.update({
      requirementUnitId: createdUnit.id,
      title: '注册异常与重试边界',
      summary: '补充错误验证码、重试次数和短信延迟策略。',
      layer: 'exception',
    })

    await ownerCaller.requirementUnit.updateStatus({
      requirementUnitId: createdUnit.id,
      status: 'REFINING',
    })

    await ownerCaller.requirementUnit.updateStability({
      requirementUnitId: createdUnit.id,
      stabilityLevel: 'S1_ROUGHLY_DEFINED',
      stabilityScore: 35,
      stabilityReason: '已有异常项，但仍缺明确约束',
    })

    const issue = await ownerCaller.issueUnit.create({
      requirementId: requirement.id,
      primaryRequirementUnitId: createdUnit.id,
      type: 'risk',
      severity: 'HIGH',
      title: '短信通道不稳定',
      description: '验证码发送超时会直接影响主流程完成率。',
      blockDev: true,
      suggestedResolution: '明确重试和降级策略。',
    })

    await ownerCaller.issueUnit.update({
      issueUnitId: issue.id,
      primaryRequirementUnitId: createdUnit.id,
      type: 'risk',
      severity: 'CRITICAL',
      title: '短信通道高风险',
      description: '验证码发送超时会阻断注册主流程。',
      blockDev: true,
      suggestedResolution: '增加重试、兜底和告警。',
    })

    await ownerCaller.issueUnit.updateStatus({
      issueUnitId: issue.id,
      status: 'IN_PROGRESS',
    })

    const session = await prisma.clarificationSession.create({
      data: { requirementId: requirement.id },
    })
    const scopeQuestion = await prisma.clarificationQuestion.create({
      data: {
        sessionId: session.id,
        category: 'SCOPE',
        questionText: '注册是否必须绑定手机号，还是允许邮箱注册？',
      },
    })
    const question = await prisma.clarificationQuestion.create({
      data: {
        sessionId: session.id,
        category: 'RISK',
        questionText: '如果短信服务失败，是否允许语音验证码兜底？',
      },
    })

    await expect(
      ownerCaller.clarification.createIssue({
        questionId: scopeQuestion.id,
      }),
    ).rejects.toHaveProperty('code', 'PRECONDITION_FAILED')

    await ownerCaller.clarification.updateQuestionStatus({
      questionId: scopeQuestion.id,
      status: 'SKIPPED',
    })

    const createdIssue = await ownerCaller.clarification.createIssue({
      questionId: question.id,
      blockDev: true,
    })
    expect(createdIssue.created).toBe(true)

    const skippedClarificationIssue = await ownerCaller.clarification.createIssue({
      questionId: scopeQuestion.id,
    })
    expect(skippedClarificationIssue.created).toBe(true)

    const clarificationList = await ownerCaller.clarification.list({
      requirementId: requirement.id,
    })
    expect(clarificationList?.questions.find((item) => item.id === question.id)?.issueProjection?.id).toBe(createdIssue.issueId)
    expect(clarificationList?.questions.find((item) => item.id === scopeQuestion.id)?.queueEligible).toBe(true)
    expect(clarificationList?.questions.find((item) => item.id === question.id)?.queueStatus.label).toBe('Issue Queue 跟踪中')

    await ownerCaller.issueUnit.updateStatus({
      issueUnitId: skippedClarificationIssue.issueId,
      status: 'RESOLVED',
    })

    const callbackClarificationList = await ownerCaller.clarification.list({
      requirementId: requirement.id,
    })
    expect(callbackClarificationList?.questions.find((item) => item.id === scopeQuestion.id)?.queueStatus.callbackNeeded).toBe(true)
    expect(callbackClarificationList?.questions.find((item) => item.id === scopeQuestion.id)?.queueStatus.label).toBe('待回源确认')

    await ownerCaller.clarification.updateQuestionStatus({
      questionId: scopeQuestion.id,
      status: 'RESOLVED',
    })

    const resolvedCallbackClarificationList = await ownerCaller.clarification.list({
      requirementId: requirement.id,
    })
    expect(resolvedCallbackClarificationList?.questions.find((item) => item.id === scopeQuestion.id)?.queueStatus.label).toBe('回源已确认')

    await prisma.requirementConflict.create({
      data: {
        requirementId: requirement.id,
        fingerprint: randomUUID(),
        scope: 'INTERNAL',
        severity: 'HIGH',
        title: '注册主流程与异常兜底描述冲突',
        summary: '主流程要求短信验证码必达，但异常流程允许直接跳过验证。',
        rationale: '同一 Requirement 中对验证码失败后的处理给出了相互矛盾的要求。',
        recommendedAction: '统一验证码失败后的兜底策略，再确认是否允许语音验证码。',
        evidence: ['主流程要求短信验证码必达', '异常流程允许直接跳过验证'],
      },
    })

    const queue = await ownerCaller.issueUnit.listByRequirement({ requirementId: requirement.id })
    expect(queue.some((item) => item.queueKind === 'issue')).toBe(true)
    expect(queue.some((item) => item.queueKind === 'conflict')).toBe(true)
    expect(queue.find((item) => item.entityId === createdIssue.issueId)?.sourceLabel).toBe('Clarification')
    expect(queue.find((item) => item.entityId === createdIssue.issueId)?.sourceStatusLabel).toBe('待回答')
    expect(queue.find((item) => item.entityId === createdIssue.issueId)?.lifecycle.requiresSourceFollowup).toBe(true)
    expect(queue.find((item) => item.entityId === skippedClarificationIssue.issueId)?.sourceStatusLabel).toBe('已收敛')
    expect(queue.find((item) => item.queueKind === 'conflict')?.lifecycle.closeMeaning).toContain('同步原 Conflict')

    const createdChange = await ownerCaller.changeUnit.create({
      requirementId: requirement.id,
      title: '注册异常处理策略变更',
      reason: '短信通道高风险，需要正式引入重试、降级和兜底策略。',
      changeScope: '注册主流程中的验证码发送、超时提示和语音验证码兜底。',
      impactSummary: '影响注册原型、测试用例和验证码服务实现。',
      riskLevel: 'HIGH',
      requiresResignoff: true,
      affectsTests: true,
      affectsPrototype: true,
      affectsCode: true,
      requirementUnitIds: [createdUnit.id],
      issueUnitIds: [issue.id],
    })
    expect(createdChange.changeKey).toBe('CHG-01')

    await ownerCaller.changeUnit.update({
      changeUnitId: createdChange.id,
      title: '注册异常与兜底策略变更',
      reason: '需要补齐验证码重试、超时提示和语音验证码兜底方案。',
      changeScope: '注册流程、验证码服务、异常提示逻辑。',
      impactSummary: '影响测试、原型与服务实现，需要重新确认评审意见。',
      riskLevel: 'CRITICAL',
      requiresResignoff: true,
      affectsTests: true,
      affectsPrototype: true,
      affectsCode: true,
      requirementUnitIds: [createdUnit.id],
      issueUnitIds: [issue.id, createdIssue.issueId],
    })

    await ownerCaller.changeUnit.updateStatus({
      changeUnitId: createdChange.id,
      status: 'UNDER_REVIEW',
    })
    await ownerCaller.changeUnit.updateStatus({
      changeUnitId: createdChange.id,
      status: 'APPROVED',
    })
    const appliedChange = await ownerCaller.changeUnit.updateStatus({
      changeUnitId: createdChange.id,
      status: 'APPLIED',
    })
    expect(appliedChange.appliedAt).toBeTruthy()

    const changeQueue = await ownerCaller.changeUnit.listByRequirement({ requirementId: requirement.id })
    expect(changeQueue).toHaveLength(1)
    expect(changeQueue[0]?.issueUnits).toHaveLength(2)

    const searched = await ownerCaller.requirement.search({
      stabilityLevel: 'S2_MAIN_FLOW_CLEAR',
      hasBlockingIssues: true,
    })
    expect(searched.some((item) => item.id === requirement.id)).toBe(true)
    expect(searched.find((item) => item.id === requirement.id)?.requirementUnitCount).toBeGreaterThan(0)
    expect(searched.find((item) => item.id === requirement.id)?.blockingIssueCount).toBeGreaterThan(0)
    expect(searched.find((item) => item.id === requirement.id)?.openChangeCount).toBe(0)
    expect(searched.find((item) => item.id === requirement.id)?.highRiskChangeCount).toBe(0)

    const pendingChange = await ownerCaller.changeUnit.create({
      requirementId: requirement.id,
      title: '注册流程补充监控告警',
      reason: '需要补充变更后的告警策略。',
      riskLevel: 'HIGH',
      affectsCode: true,
      requirementUnitIds: [createdUnit.id],
      issueUnitIds: [issue.id],
    })
    expect(pendingChange.status).toBe('PROPOSED')

    const searchedWithOpenChange = await ownerCaller.requirement.search({
      stabilityLevel: 'S2_MAIN_FLOW_CLEAR',
      hasBlockingIssues: true,
    })
    expect(searchedWithOpenChange.find((item) => item.id === requirement.id)?.openChangeCount).toBe(1)
    expect(searchedWithOpenChange.find((item) => item.id === requirement.id)?.highRiskChangeCount).toBe(1)

    const gateHints = await ownerCaller.requirement.getGateHints({
      requirementId: requirement.id,
    })
    expect(gateHints.blockingIssueCount).toBeGreaterThan(0)
    expect(gateHints.highRiskChangeCount).toBeGreaterThan(0)
    expect(gateHints.hints.length).toBeGreaterThan(0)

    await ownerCaller.clarification.answer({
      questionId: question.id,
      answerText: '短信服务失败时允许语音验证码兜底，并需要补充超时告警。',
      changeUnitId: pendingChange.id,
    })

    const refreshedQueue = await ownerCaller.changeUnit.listByRequirement({ requirementId: requirement.id })
    const tracedChange = refreshedQueue.find((item) => item.id === pendingChange.id)
    expect(tracedChange?.linkedRequirementVersionCount).toBeGreaterThan(0)
    expect(tracedChange?.linkedModelChangeLogCount).toBeGreaterThan(0)
    expect(tracedChange?.latestAppliedTrace).toBeTruthy()

    const versionList = await ownerCaller.version.list({ requirementId: requirement.id })
    expect(versionList.versions.some((item) => item.changeUnit?.id === pendingChange.id)).toBe(true)
    expect(versionList.currentTrace?.changeUnit?.id).toBe(pendingChange.id)
  }, 60000)
})
