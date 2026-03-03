import 'dotenv/config'

if (!process.env.NODE_ENV) {
  ;(process.env as Record<string, string>)['NODE_ENV'] = 'test'
}
process.env.SESSION_SECRET ??= 'dev-test-session-secret'
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000'
if (!process.env.ENCRYPTION_KEY || !/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY)) {
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
}
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@127.0.0.1:5432/devos?schema=public'
