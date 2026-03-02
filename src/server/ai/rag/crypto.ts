import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY
if (!ENCRYPTION_KEY_HEX || !/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY_HEX)) {
  throw new Error('ENCRYPTION_KEY must be set as a 64-character hex string (32 bytes)')
}

const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex')

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptToken(encrypted: string): string {
  const [ivHex, cipherHex] = encrypted.split(':')
  if (!ivHex || !cipherHex) {
    throw new Error('Invalid encrypted token format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const cipherText = Buffer.from(cipherHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()])
  return decrypted.toString('utf8')
}
