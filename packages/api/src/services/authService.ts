import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto'
import { jwtVerify, SignJWT } from 'jose'
import { config, files, session } from '../config'
import { authFileSchema, type UserRecord } from '../schemas/auth'
import { readJsonFile } from '../storage/jsonFile'

const keyLength = 64
const scryptOptions: ScryptOptions = { N: 16384, r: 8, p: 1 }

export type AccessTokenClaims = {
  userId: string
  scopes: string[]
  csrfToken: string
}

function deriveKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, scryptOptions, (error, key) =>
      error ? reject(error) : resolve(key),
    )
  })
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const key = await deriveKey(password, salt)
  return { salt, passwordHash: key.toString('hex') }
}

const decoyCredentials = hashPassword(randomBytes(16).toString('hex'))

async function verifyPassword(
  password: string,
  salt: string,
  passwordHash: string,
) {
  const expected = Buffer.from(passwordHash, 'hex')
  const actual = await deriveKey(password, salt)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function authenticate(username: string, password: string) {
  const { users } = await readJsonFile(files.auth, authFileSchema, {
    users: [],
  })
  const user = users.find((candidate) => candidate.username === username)
  if (!user) {
    const decoy = await decoyCredentials
    await verifyPassword(password, decoy.salt, decoy.passwordHash)
    return null
  }
  const isValid = await verifyPassword(password, user.salt, user.passwordHash)
  return isValid ? user : null
}

export async function createAccessToken(user: UserRecord) {
  const csrfToken = randomBytes(32).toString('hex')
  const token = await new SignJWT({ scopes: user.scopes, csrfToken })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer(session.issuer)
    .setIssuedAt()
    .setExpirationTime(`${session.lifetimeSeconds}s`)
    .sign(config.jwtSecret)
  return { token, csrfToken }
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: session.issuer,
    })
    if (!payload.sub) return null
    return {
      userId: payload.sub,
      scopes: payload.scopes as string[],
      csrfToken: payload.csrfToken as string,
    }
  } catch {
    return null
  }
}
