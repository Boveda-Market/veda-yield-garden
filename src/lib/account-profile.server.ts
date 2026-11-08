import { createRemoteJWKSet, jwtVerify } from "jose";

export async function verifiedPrivyId(token: string) {
  const appId = "cmw6ftcf900ge0hl0jyw3rc75";
  const keys = createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`), { timeoutDuration: 5000 });
  const { payload } = await jwtVerify(token, keys, { issuer: "privy.io", audience: appId, algorithms: ["ES256"] });
  if (!payload.sub?.startsWith("did:privy:") || !payload.exp) throw new Error("Acceso no válido");
  return payload.sub;
}