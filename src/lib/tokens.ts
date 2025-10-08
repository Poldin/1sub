import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');

export interface TokenClaims extends JWTPayload {
  sub: string;
  email?: string;
  scope?: string[];
}

export async function mintJwt(claims: TokenClaims): Promise<string> {
  return await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

export async function verifyJwt(token: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, secret);
  return payload as TokenClaims;
}


