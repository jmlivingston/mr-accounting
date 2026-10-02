import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { config, files, session } from '../config';
import type { UserRecord } from '../schemas/auth';
import { useTempDataDir } from '../test/tempDataDir';
import { writeJsonFile } from '../storage/jsonFile';
import { authenticate, createAccessToken, hashPassword, verifyAccessToken } from './authService';

useTempDataDir();

async function createUser(password = 'correct horse'): Promise<UserRecord> {
  const user = {
    id: 'f3b1c0de-7a54-4c2e-9d0a-5b8e1f6a2c11',
    username: 'alice',
    scopes: ['transactions:read'],
    ...(await hashPassword(password)),
  };
  await writeJsonFile(files.auth, { users: [user] });
  return user;
}

describe('hashPassword', () => {
  it('uses a unique salt each time', async () => {
    const [a, b] = await Promise.all([hashPassword('secret'), hashPassword('secret')]);
    expect(a.salt).not.toBe(b.salt);
    expect(a.passwordHash).not.toBe(b.passwordHash);
  });

  it('does not contain the plaintext password', async () => {
    const { passwordHash } = await hashPassword('plaintext-password');
    expect(passwordHash).not.toContain('plaintext-password');
  });
});

describe('authenticate', () => {
  it('returns the user for correct credentials', async () => {
    const user = await createUser();
    expect(await authenticate('alice', 'correct horse')).toEqual(user);
  });

  it('returns null for a wrong password', async () => {
    await createUser();
    expect(await authenticate('alice', 'wrong')).toBeNull();
  });

  it('returns null for an unknown user', async () => {
    await createUser();
    expect(await authenticate('bob', 'correct horse')).toBeNull();
  });

  it('returns null when no users have been seeded', async () => {
    expect(await authenticate('alice', 'anything')).toBeNull();
  });
});

describe('access tokens', () => {
  it('round-trips the claims', async () => {
    const user = await createUser();
    const { token, csrfToken } = await createAccessToken(user);
    expect(await verifyAccessToken(token)).toEqual({ userId: user.id, scopes: user.scopes, csrfToken });
  });

  it('issues a different CSRF token for every login', async () => {
    const user = await createUser();
    const [a, b] = await Promise.all([createAccessToken(user), createAccessToken(user)]);
    expect(a.csrfToken).not.toBe(b.csrfToken);
  });

  it('rejects garbage', async () => {
    expect(await verifyAccessToken('not-a-jwt')).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const { token } = await createAccessToken(await createUser());
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'attacker', scopes: ['transactions:write'], csrfToken: 'x' }));
    expect(await verifyAccessToken(`${header}.${forged.toString('base64url')}.${signature}`)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await new SignJWT({ scopes: [], csrfToken: 'x' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user')
      .setIssuer(session.issuer)
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('some-other-secret-value-1234567890'));
    expect(await verifyAccessToken(token)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await new SignJWT({ scopes: [], csrfToken: 'x' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user')
      .setIssuer(session.issuer)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(config.jwtSecret);
    expect(await verifyAccessToken(token)).toBeNull();
  });

  it('rejects a token from another issuer', async () => {
    const token = await new SignJWT({ scopes: [], csrfToken: 'x' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user')
      .setIssuer('someone-else')
      .setExpirationTime('1h')
      .sign(config.jwtSecret);
    expect(await verifyAccessToken(token)).toBeNull();
  });

  it('rejects a token without a subject', async () => {
    const token = await new SignJWT({ scopes: [], csrfToken: 'x' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(session.issuer)
      .setExpirationTime('1h')
      .sign(config.jwtSecret);
    expect(await verifyAccessToken(token)).toBeNull();
  });
});
