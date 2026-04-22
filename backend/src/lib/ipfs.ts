const PINATA_JWT = process.env["PINATA_JWT"] ?? "";
const PINATA_FILE_API = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/* App URL for "View full profile" link — prefer explicit env var,
   then Replit dev domain, then final production ENS gateway */
const APP_URL =
  process.env["APP_URL"] ??
  (process.env["REPLIT_DEV_DOMAIN"]
    ? `https://${process.env["REPLIT_DEV_DOMAIN"]}/subframe`
    : null);

export interface SubframeProfile {
  name: string;
  ensFullName: string;
  walletAddress: string;
  bio: string | null;
  avatarUrl: string | null;
  claimedAt: string;
  platform: "subframe.eth";
  version: "1.0";
}

function generateProfileHTML(profile: SubframeProfile): string {
  const { name, ensFullName, walletAddress, bio, avatarUrl, claimedAt } = profile;
  const claimDate = new Date(claimedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const shortAddr = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
  const etherscanUrl = `https://etherscan.io/address/${walletAddress}`;
  const profileLink = APP_URL ? `${APP_URL}/profile/${name}` : null;
  const avatarTag = avatarUrl
    ? `<img src="${avatarUrl}" alt="${name}" class="avatar-img" />`
    : `<div class="avatar-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="#CBFF4D"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${ensFullName} | Subframe Protocol</title>
  <meta name="description" content="${bio ?? `${ensFullName} - Web3 identity on Subframe Protocol`}" />
  <meta property="og:title" content="${ensFullName}" />
  <meta property="og:description" content="${bio ?? `${ensFullName} on Subframe Protocol`}" />
  <meta property="og:type" content="profile" />
  ${avatarUrl ? `<meta property="og:image" content="${avatarUrl}" />` : ""}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0C0C0C;
      --surface: #111111;
      --border: rgba(255,255,255,0.07);
      --accent: #CBFF4D;
      --accent-dim: rgba(203,255,77,0.12);
      --text: #ffffff;
      --muted: rgba(255,255,255,0.3);
      --subtle: rgba(255,255,255,0.08);
    }
    html, body { min-height: 100vh; background: var(--bg); color: var(--text); }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px 48px;
      gap: 0;
    }
    /* top bar */
    .topbar {
      width: 100%;
      max-width: 480px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .logo { font-size: 15px; font-weight: 800; letter-spacing: -0.02em; }
    .logo em { color: var(--accent); font-style: normal; }
    .badge {
      font-size: 11px;
      font-weight: 700;
      background: var(--accent-dim);
      color: var(--accent);
      border: 1px solid rgba(203,255,77,0.2);
      padding: 3px 10px;
      border-radius: 99px;
      letter-spacing: 0.04em;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    /* card */
    .card {
      width: 100%;
      max-width: 480px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      overflow: hidden;
      position: relative;
    }
    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(203,255,77,0.3), transparent);
    }
    .card-body { padding: 28px 24px; }
    /* avatar */
    .avatar {
      width: 72px; height: 72px;
      border-radius: 16px;
      border: 2px solid rgba(203,255,77,0.2);
      overflow: hidden;
      margin-bottom: 18px;
      background: #1a1a1a;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 20px rgba(203,255,77,0.1);
    }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
    /* name */
    .ens-name {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.03em;
      margin-bottom: 4px;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .ens-name em { color: var(--accent); font-style: normal; }
    .bio {
      font-size: 14px;
      color: rgba(255,255,255,0.5);
      line-height: 1.55;
      margin-top: 10px;
      margin-bottom: 0;
    }
    /* divider */
    .divider { height: 1px; background: var(--border); margin: 20px 0; }
    /* wallet row */
    .wallet-row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .wallet-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
    .wallet-addr {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 13px;
      color: rgba(255,255,255,0.6);
    }
    .etherscan-btn {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 700;
      background: var(--subtle);
      color: rgba(255,255,255,0.4);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 8px;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .etherscan-btn:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
    /* stats row */
    .stats-row { display: flex; gap: 20px; margin-top: 16px; }
    .stat { font-size: 11px; color: var(--muted); }
    .stat strong { color: rgba(255,255,255,0.5); font-weight: 600; display: block; font-size: 12px; }
    /* action btn */
    .action-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%;
      background: var(--accent);
      color: #0C0C0C;
      font-size: 14px;
      font-weight: 800;
      padding: 13px;
      border-radius: 12px;
      text-decoration: none;
      margin-top: 20px;
      letter-spacing: -0.01em;
      transition: opacity 0.15s;
    }
    .action-btn:hover { opacity: 0.85; }
    /* verified badge */
    .verified-row {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: rgba(203,255,77,0.6);
      font-weight: 700;
      margin-top: 12px;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .dot-live {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--accent);
    }
    /* footer */
    .footer {
      margin-top: 32px;
      font-size: 11px;
      color: rgba(255,255,255,0.15);
      text-align: center;
    }
    .footer a { color: rgba(203,255,77,0.3); text-decoration: none; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="logo">Sub<em>frame</em></div>
    <span class="badge">ENS</span>
  </div>

  <div class="card">
    <div class="card-body">
      <div class="avatar">${avatarTag}</div>

      <div class="ens-name">${name}<em>.subframe.eth</em></div>
      ${bio ? `<p class="bio">${bio}</p>` : ""}

      <div class="divider"></div>

      <div class="wallet-row">
        <div>
          <div class="wallet-label">Wallet</div>
          <div class="wallet-addr">${shortAddr}</div>
        </div>
        <a href="${etherscanUrl}" target="_blank" rel="noopener" class="etherscan-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Etherscan
        </a>
      </div>

      <div class="stats-row">
        <div class="stat"><strong>${claimDate}</strong>Claimed</div>
        <div class="stat"><strong>Subframe</strong>Protocol</div>
      </div>

      ${
        profileLink
          ? `<a href="${profileLink}" class="action-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        View Full Profile
      </a>`
          : ""
      }

      <div class="verified-row">
        <span class="dot-live"></span>
        Identity verified on-chain
      </div>
    </div>
  </div>

  <div class="footer">
    Hosted on IPFS via <a href="https://www.pinata.cloud/" target="_blank">Pinata</a>
    &nbsp;·&nbsp; Resolved by <a href="https://eth.limo" target="_blank">eth.limo</a>
  </div>
</body>
</html>`;
}

export async function uploadProfileToIPFS(profile: SubframeProfile): Promise<string | null> {
  if (!PINATA_JWT) {
    console.warn("PINATA_JWT not set, skipping IPFS upload");
    return null;
  }

  try {
    const html = generateProfileHTML(profile);
    const blob = new Blob([html], { type: "text/html" });

    const formData = new FormData();
    formData.append("file", blob, "index.html");
    formData.append(
      "pinataMetadata",
      JSON.stringify({
        name: `subframe-${profile.name}`,
        keyvalues: {
          ens: profile.ensFullName,
          wallet: profile.walletAddress,
        },
      })
    );
    formData.append(
      "pinataOptions",
      JSON.stringify({ cidVersion: 1, wrapWithDirectory: true })
    );

    const res = await fetch(PINATA_FILE_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Pinata upload failed:", res.status, text);
      return null;
    }

    const data = await res.json() as { IpfsHash?: string };
    return data.IpfsHash ?? null;
  } catch (err) {
    console.error("IPFS upload error:", err);
    return null;
  }
}

export function ipfsGatewayUrl(cid: string): string {
  return `${IPFS_GATEWAY}/${cid}`;
}

export async function uploadAvatarToIPFS(imageBase64: string, mimeType: string): Promise<string | null> {
  if (!PINATA_JWT) {
    console.warn("PINATA_JWT not set, skipping avatar upload");
    return null;
  }

  try {
    const buffer = Buffer.from(imageBase64, "base64");
    const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const blob = new Blob([buffer], { type: mimeType });

    const formData = new FormData();
    formData.append("file", blob, `avatar-${Date.now()}.${ext}`);
    formData.append(
      "pinataMetadata",
      JSON.stringify({ name: `subframe-avatar-${Date.now()}` })
    );
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const res = await fetch(PINATA_FILE_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Pinata avatar upload failed:", res.status, text);
      return null;
    }

    const data = await res.json() as { IpfsHash?: string };
    if (!data.IpfsHash) return null;

    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
  } catch (err) {
    console.error("Avatar IPFS upload error:", err);
    return null;
  }
}

export function limoUrl(ensFullName: string): string {
  return `https://${ensFullName}.limo`;
}

/* Upload a redirect SPA for subframe.eth (parent domain).
   Creates a directory with index.html + _redirects so that
   subframe.eth.limo/profile/test routes correctly to the app. */
export async function uploadParentAppToIPFS(): Promise<string | null> {
  if (!PINATA_JWT) {
    console.warn("PINATA_JWT not set, skipping parent IPFS upload");
    return null;
  }

  const appUrl = APP_URL ?? "https://subframe.eth.limo";

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Subframe Protocol</title>
  <meta name="description" content="Claim your ENS subdomain on subframe.eth" />
  <style>
    body { margin:0; background:#0C0C0C; display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:monospace; }
    .wrap { text-align:center; }
    .dot { width:10px; height:10px; border-radius:50%; background:#CBFF4D; display:inline-block; animation:pulse 1.2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
    p { color:#ffffff40; font-size:12px; margin-top:12px; }
  </style>
  <script>
    // Redirect to app while preserving path (e.g. /profile/test -> app/profile/test)
    var base = "${appUrl}";
    var path = window.location.pathname;
    var search = window.location.search;
    window.location.replace(base + path + search);
  </script>
</head>
<body>
  <div class="wrap">
    <div class="dot"></div>
    <p>Redirecting to Subframe Protocol...</p>
  </div>
</body>
</html>`;

  // _redirects: serve index.html for all paths (SPA pattern)
  // eth.limo's Kubo node respects this file for subdomain gateways
  const redirectsContent = `/*  /index.html  200`;

  try {
    const formData = new FormData();
    // Pinata directory upload: each file name must include the folder prefix
    formData.append("file", new Blob([indexHtml], { type: "text/html" }), "subframe-app/index.html");
    formData.append("file", new Blob([redirectsContent], { type: "text/plain" }), "subframe-app/_redirects");
    formData.append("pinataMetadata", JSON.stringify({ name: "subframe-eth-parent-app" }));
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1, wrapWithDirectory: false }));

    const res = await fetch(PINATA_FILE_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Pinata parent upload failed:", res.status, text);
      return null;
    }

    const data = await res.json() as { IpfsHash?: string };
    return data.IpfsHash ?? null;
  } catch (err) {
    console.error("Parent IPFS upload error:", err);
    return null;
  }
}
