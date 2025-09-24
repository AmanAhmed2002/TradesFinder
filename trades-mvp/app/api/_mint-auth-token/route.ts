// app/api/_mint-auth-token/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET() {
  const teamId = process.env.MAPKIT_TEAM_ID!;
  const keyId = process.env.MAPKIT_KEY_ID!;
  let pem = process.env.MAPKIT_PRIVATE_KEY!;
  pem = pem.replace(/\\n/g, "\n");

  const iat = Math.floor(Date.now()/1000);
  const exp = iat + 5*60;

  const token = jwt.sign({ iss: teamId, iat, exp }, pem, {
    algorithm: "ES256",
    keyid: keyId,
    header: { typ: "JWT" }
  });

  return new NextResponse(token, { status: 200, headers: { "Content-Type": "text/plain" }});
}

