'use server'

import { prisma } from '@/server/db/client'
import { redirect } from 'next/navigation'
import { LoginSchema, RegisterSchema } from '@/lib/definitions'
import { hashPassword, verifyPassword } from '@/server/auth/password'
import { createSession, deleteSession } from '@/server/auth/session'
import { validateInvite, markInviteUsed } from '@/server/auth/invite'
import { Role } from '@/generated/prisma/client'

export async function login(_prevState: unknown, formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: '请输入有效的邮箱和密码' }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
    return { error: '邮箱或密码错误' }
  }

  await createSession(user.id)
  redirect('/dashboard')
}

export async function registerFirstUser(_prevState: unknown, formData: FormData) {
  const parsed = RegisterSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
  })
  if (!parsed.success) return { error: '请填写所有必填字段' }

  const hashed = await hashPassword(parsed.data.password)

  try {
    const user = await prisma.$transaction(async (tx) => {
      const count = await tx.user.count()
      if (count > 0) throw new Error('INVITE_ONLY')
      return tx.user.create({
        data: { email: parsed.data.email, password: hashed, name: parsed.data.name, isAdmin: true },
      })
    })
    await createSession(user.id)
  } catch (e) {
    if (e instanceof Error && e.message === 'INVITE_ONLY') {
      return { error: '仅限邀请注册' }
    }
    throw e
  }

  redirect('/dashboard')
}

export async function registerWithInvite(_prevState: unknown, formData: FormData) {
  const token = formData.get('token') as string
  const parsed = RegisterSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
  })
  if (!parsed.success) return { error: '请填写所有必填字段' }

  const invite = await validateInvite(token)
  if (!invite) return { error: '邀请链接无效或已过期' }

  const hashed = await hashPassword(parsed.data.password)
  const user = await prisma.user.create({
    data: { email: parsed.data.email, password: hashed, name: parsed.data.name },
  })

  if (invite.roles.length > 0) {
    await prisma.userRole.createMany({
      data: invite.roles.map((role: Role) => ({ userId: user.id, role })),
    })
  }

  await markInviteUsed(invite.id)
  await createSession(user.id)
  redirect('/dashboard')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
