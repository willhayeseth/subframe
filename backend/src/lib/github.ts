import { createSign } from "crypto";
import { db, subdomainsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const OWNER = "willhayeseth";
const REPO = "subframe";
const INSTALLATION_ID = "126135137";
const AUTHOR_NAME = "Will Hayes";
const AUTHOR_EMAIL = "278034540+willhayeseth@users.noreply.github.com";
const REGISTRY_PATH = "registry.json";

function makeJwt(): string {
  const appId = process.env["GITHUB_APP_ID"];
  const rawPem = process.env["GITHUB_APP_PRIVATE_KEY"] ?? "";

  if (!appId || !rawPem) {
    throw new Error("GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY is not set");
  }

  const H = "-----BEGIN RSA PRIVATE KEY-----";
  const F = "-----END RSA PRIVATE KEY-----";
  const body = rawPem.replace(H, "").replace(F, "").replace(/\s+/g, "").trim();
  const pem = `${H}\n${body.match(/.{1,64}/g)!.join("\n")}\n${F}`;

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 600, iss: appId })).toString("base64url");
  const signing = `${header}.${payload}`;

  const sign = createSign("RSA-SHA256");
  sign.update(signing);
  return `${signing}.${sign.sign(pem, "base64url")}`;
}

async function ghFetch(path: string, opts: RequestInit & { jwt?: string; token?: string } = {}): Promise<unknown> {
  const { jwt, token, ...rest } = opts;
  const res = await fetch(`https://api.github.com${path}`, {
    ...rest,
    headers: {
      Authorization: jwt ? `Bearer ${jwt}` : `token ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "subframe-bot",
      "Content-Type": "application/json",
    },
  });
  return res.json();
}

async function getInstallationToken(): Promise<string> {
  const jwt = makeJwt();
  const res = await ghFetch(`/app/installations/${INSTALLATION_ID}/access_tokens`, {
    method: "POST",
    body: JSON.stringify({}),
    jwt,
  }) as { token?: string };

  if (!res.token) throw new Error(`Failed to get installation token: ${JSON.stringify(res)}`);
  return res.token;
}

interface RegistryMember {
  name: string;
  ensFullName: string;
  walletAddress: string;
  ipfsCid: string | null;
  linkedAt: string;
}

interface RegistryFile {
  updated: string;
  count: number;
  members: RegistryMember[];
}

export async function pushRegistryUpdate(newName: string): Promise<void> {
  try {
    const appId = process.env["GITHUB_APP_ID"];
    if (!appId) {
      console.log("[GITHUB] GITHUB_APP_ID not set, skipping registry push");
      return;
    }

    const token = await getInstallationToken();

    const linked = await db
      .select()
      .from(subdomainsTable)
      .where(eq(subdomainsTable.status, "linked"));

    const registry: RegistryFile = {
      updated: new Date().toISOString(),
      count: linked.length,
      members: linked.map((s) => ({
        name: s.name,
        ensFullName: s.ensFullName,
        walletAddress: s.walletAddress,
        ipfsCid: s.ipfsCid,
        linkedAt: s.updatedAt?.toISOString() ?? s.claimedAt.toISOString(),
      })),
    };

    const content = Buffer.from(JSON.stringify(registry, null, 2) + "\n").toString("base64");

    const existing = await ghFetch(`/repos/${OWNER}/${REPO}/contents/${REGISTRY_PATH}`, { token }) as { sha?: string };
    const sha = existing.sha;

    await ghFetch(`/repos/${OWNER}/${REPO}/contents/${REGISTRY_PATH}`, {
      method: "PUT",
      token,
      body: JSON.stringify({
        message: `feat(registry): add ${newName}.subframe.eth`,
        content,
        sha,
        author: { name: AUTHOR_NAME, email: AUTHOR_EMAIL },
      }),
    });

    console.log(`[GITHUB] Registry updated: ${newName}.subframe.eth added (${linked.length} total)`);
  } catch (err) {
    console.error("[GITHUB] Registry push failed (non-fatal):", err);
  }
}
