import 'server-only'
import { hash, compare } from 'bcrypt'

export async function hashPassword(password: string) {
  return hash(password, 10)
}

export async function verifyPassword(password: string, hashed: string) {
  return compare(password, hashed)
}
