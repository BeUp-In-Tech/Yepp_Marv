import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";
import { JwtPayload } from "jsonwebtoken";
import env from "../../config/env";

export interface AppleTokenExchangeResponse  {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
};


type AppleIdentityTokenPayload = JwtPayload & {
  sub?: string;
  email?: string;
};

export const generateAppleClientSecret = async (clientId: string) => {
  const privateKey = await importPKCS8(
    env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    'ES256'
  );

  return await new SignJWT({
    iss: env.APPLE_TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 180,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  })
    .setProtectedHeader({ alg: 'ES256', kid: env.APPLE_KEY_ID })
    .sign(privateKey);
};

export const appleJWKS = createRemoteJWKSet(
  new URL('https://appleid.apple.com/auth/keys')
);

export async function verifyAppleIdToken(identityToken: string, audience: string) {
  const { payload } = await jwtVerify(identityToken, appleJWKS, {
    issuer: 'https://appleid.apple.com',
    audience,
  });
  return payload as AppleIdentityTokenPayload;
}
