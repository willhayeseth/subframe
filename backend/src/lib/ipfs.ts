import { eq } from "drizzle-orm";
import { db, artVariationsTable } from "@workspace/db";

const PINATA_JWT = process.env["PINATA_JWT"] ?? "";
const PINATA_FILE_API = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_V3_API   = "https://uploads.pinata.cloud/v3/files";
const IPFS_GATEWAY = "https://ipfs.io/ipfs";

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
  <link rel="icon" type="image/png" href="https://subframe.network/favicon.png" />
  <link rel="shortcut icon" href="https://subframe.network/favicon.png" />
  <link rel="apple-touch-icon" href="https://subframe.network/favicon.png" />
  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="Subframe Protocol" />
  <meta property="og:title" content="${ensFullName} | Subframe Protocol" />
  <meta property="og:description" content="${bio ?? `${ensFullName} - Web3 identity on Subframe Protocol`}" />
  <meta property="og:image" content="${avatarUrl ?? "https://subframe.network/favicon.png"}" />
  <meta property="og:image:width" content="1024" />
  <meta property="og:image:height" content="1024" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:site" content="@subframeeth" />
  <meta name="twitter:title" content="${ensFullName} | Subframe Protocol" />
  <meta name="twitter:description" content="${bio ?? `${ensFullName} - Web3 identity on Subframe Protocol`}" />
  <meta name="twitter:image" content="${avatarUrl ?? "https://subframe.network/favicon.png"}" />
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
    /* action buttons row */
    .action-row { display: flex; gap: 8px; margin-top: 10px; }
    .half-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); color: rgba(255,255,255,.45); font-size: 13px; font-weight: 700; padding: 11px 8px; border-radius: 10px; cursor: pointer; transition: all .15s; font-family: inherit; }
    .half-btn:hover { border-color: rgba(203,255,77,.25); background: rgba(203,255,77,.04); color: rgba(255,255,255,.85); }
    /* modal */
    .modal-overlay { display: none; position: fixed; inset: 0; z-index: 100; align-items: flex-end; justify-content: center; padding: 16px; background: rgba(0,0,0,.78); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
    .modal-overlay.open { display: flex; }
    @media(min-width: 480px){ .modal-overlay { align-items: center; } }
    .modal-box { width: 100%; max-width: 380px; background: #111; border: 1px solid rgba(255,255,255,.1); border-radius: 18px; overflow: hidden; position: relative; animation: slideUp .2s ease; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px) scale(.97); } to { opacity: 1; transform: none; } }
    .modal-top-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(203,255,77,.3), transparent); }
    .modal-inner { padding: 22px; }
    .modal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
    .modal-icon-wrap { display: flex; align-items: center; gap: 12px; }
    .modal-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(203,255,77,.1); border: 1px solid rgba(203,255,77,.2); display: flex; align-items: center; justify-content: center; }
    .modal-title { font-size: 15px; font-weight: 900; color: #fff; margin-bottom: 4px; }
    .cs-badge { display: inline-block; font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: rgba(203,255,77,.12); color: #CBFF4D; border: 1px solid rgba(203,255,77,.22); text-transform: uppercase; letter-spacing: .06em; }
    .modal-close { background: none; border: none; color: rgba(255,255,255,.3); cursor: pointer; font-size: 18px; line-height: 1; padding: 2px 6px; border-radius: 4px; }
    .modal-close:hover { color: #fff; }
    .modal-text { font-size: 13px; color: rgba(255,255,255,.4); line-height: 1.65; }
    .ct-amounts { display: flex; gap: 8px; margin: 14px 0; }
    .ct-amt { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); color: rgba(255,255,255,.4); font-size: 12px; font-weight: 900; font-family: monospace; cursor: pointer; transition: all .15s; }
    .ct-amt:hover { border-color: rgba(203,255,77,.3); }
    .ct-amt.active { border-color: rgba(203,255,77,.4); background: rgba(203,255,77,.1); color: #CBFF4D; }
    .ct-start { width: 100%; padding: 12px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); color: rgba(255,255,255,.22); font-size: 13px; font-weight: 700; cursor: not-allowed; margin-bottom: 8px; font-family: inherit; }
    .ct-note { font-size: 10px; color: rgba(255,255,255,.2); text-align: center; }
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

      <div class="action-row">
        <button class="half-btn" onclick="openModal('messages')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Messages
        </button>
        <button class="half-btn" onclick="openModal('copytrade')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          Copy Trade
        </button>
      </div>
    </div>
  </div>

  <div class="footer">
    Hosted on IPFS via <a href="https://www.pinata.cloud/" target="_blank">Pinata</a>
    &nbsp;·&nbsp; Resolved by <a href="https://eth.limo" target="_blank">eth.limo</a>
  </div>

  <!-- Coming Soon Modal -->
  <div id="cs-modal" class="modal-overlay" onclick="closeModal()">
    <div class="modal-box" onclick="event.stopPropagation()">
      <div class="modal-top-line"></div>
      <div class="modal-inner">
        <div class="modal-header">
          <div class="modal-icon-wrap">
            <div class="modal-icon" id="modal-icon"></div>
            <div>
              <div class="modal-title" id="modal-title"></div>
              <span class="cs-badge">Coming Soon</span>
            </div>
          </div>
          <button class="modal-close" onclick="closeModal()">&#x2715;</button>
        </div>
        <div id="modal-body"></div>
      </div>
    </div>
  </div>

  <script>
  function openModal(type) {
    var modal = document.getElementById('cs-modal');
    var icon = document.getElementById('modal-icon');
    var title = document.getElementById('modal-title');
    var body = document.getElementById('modal-body');
    if (type === 'messages') {
      icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CBFF4D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
      title.textContent = 'Messages';
      body.innerHTML = '<p class="modal-text">Send on-chain encrypted messages to this wallet. Powered by XMTP protocol, messages are stored decentrally and readable only by the recipient.</p>';
    } else {
      icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CBFF4D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
      title.textContent = 'Copy Trade';
      body.innerHTML = '<p class="modal-text">Auto-mirror every trade this wallet makes. Choose your position size and we handle execution.</p>' +
        '<div class="ct-amounts">' +
          '<button class="ct-amt active" onclick="selectAmt(this)">0.1 ETH</button>' +
          '<button class="ct-amt" onclick="selectAmt(this)">0.3 ETH</button>' +
          '<button class="ct-amt" onclick="selectAmt(this)">0.5 ETH</button>' +
        '</div>' +
        '<button class="ct-start">Start Copy Trade</button>' +
        '<p class="ct-note">Feature launching soon. Join waitlist via X.</p>';
    }
    modal.classList.add('open');
  }
  function closeModal() {
    document.getElementById('cs-modal').classList.remove('open');
  }
  function selectAmt(el) {
    var parent = el.parentNode;
    parent.querySelectorAll('.ct-amt').forEach(function(b){ b.classList.remove('active'); });
    el.classList.add('active');
  }
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeModal(); });
  </script>
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

/**
 * Upload art NFT metadata folder to Pinata (pinFileToIPFS V2, wrapWithDirectory=true).
 *
 * Reads all 69 art_variations for the given subdomainId from the database,
 * builds one JSON metadata file per variation (0.json … 68.json), uploads
 * them as a single Pinata folder and returns the base URI.
 *
 * Returns `ipfs://<folderCid>/` on success, or null if Pinata is unavailable
 * or fewer than 69 variations exist in the DB.
 */
export async function uploadArtMetadataFolder(
  subdomainId:   number,
  subdomainName: string,
  tokenName:     string,
): Promise<string | null> {
  if (!PINATA_JWT) {
    console.warn("[IPFS] PINATA_JWT not set — skipping art metadata upload");
    return null;
  }

  const rows = await db
    .select()
    .from(artVariationsTable)
    .where(eq(artVariationsTable.subdomainId, subdomainId))
    .orderBy(artVariationsTable.variationIndex);

  if (rows.length < 69) {
    console.error(`[IPFS] Only ${rows.length}/69 art variations in DB for subdomain ${subdomainId} — cannot upload`);
    return null;
  }

  const ensFullName = `${subdomainName}.subframe.eth`;
  const formData = new FormData();

  for (const row of rows) {
    const idx  = row.variationIndex;
    const cid  = row.ipfsCid ?? "";
    if (!cid) {
      console.warn(`[IPFS] Variation ${idx} has no ipfs_cid — skipping NFT metadata for it`);
      continue;
    }
    const metadata = {
      name:         `${tokenName} #${idx}`,
      description:  `${ensFullName} — NFT #${idx} (${row.style}). Subframe Protocol identity token.`,
      image:        `ipfs://${cid}`,
      external_url: `https://${ensFullName}`,
      attributes: [
        { trait_type: "Style",    value: row.style      },
        { trait_type: "Variation", value: idx            },
        { trait_type: "Protocol", value: "Subframe"      },
        { trait_type: "ENS",      value: ensFullName      },
      ],
    };
    // Pinata folder upload requires ALL files to share a common directory prefix
    formData.append(
      "file",
      new File([JSON.stringify(metadata, null, 2)], `metadata/${idx}.json`, { type: "application/json" }),
    );
  }

  // Add Pinata options to trigger folder (directory) pin
  formData.append("pinataOptions",  JSON.stringify({ cidVersion: 1, wrapWithDirectory: true }));
  formData.append("pinataMetadata", JSON.stringify({ name: `${subdomainName}-art-metadata` }));

  try {
    const res = await fetch(PINATA_FILE_API, {
      method:  "POST",
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body:    formData,
      signal:  AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[IPFS] Pinata folder upload failed ${res.status}: ${text.slice(0, 300)}`);
      return null;
    }
    const data = await res.json() as { IpfsHash?: string };
    const folderCid = data?.IpfsHash ?? null;
    if (!folderCid) {
      console.error(`[IPFS] Pinata response missing IpfsHash: ${JSON.stringify(data).slice(0, 300)}`);
      return null;
    }
    console.log(`[IPFS] Art metadata folder CID: ${folderCid}`);
    // Files are uploaded as metadata/${idx}.json so tokenURI(n) must resolve
    // to ipfs://<CID>/metadata/<n>.json — include the /metadata/ path segment.
    return `ipfs://${folderCid}/metadata/`;
  } catch (err) {
    console.error("[IPFS] Art metadata folder upload error:", err);
    return null;
  }
}

/* Upload a redirect SPA for subframe.eth (parent domain).
   Creates a directory with index.html + _redirects so that
   subframe.eth.limo/{name} routes correctly to subframe.network/{name}. */
export async function uploadParentAppToIPFS(): Promise<string | null> {
  if (!PINATA_JWT) {
    console.warn("PINATA_JWT not set, skipping parent IPFS upload");
    return null;
  }

  const API_BASE = process.env["API_URL"] ?? "https://subframe.network";

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Subframe Protocol</title>
  <meta name="description" content="Web3 identity on subframe.eth" />
  <link rel="icon" type="image/png" href="https://subframe.network/favicon.png" />
  <link rel="shortcut icon" href="https://subframe.network/favicon.png" />
  <link rel="apple-touch-icon" href="https://subframe.network/favicon.png" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Subframe Protocol" />
  <meta property="og:title" content="Subframe Protocol" />
  <meta property="og:description" content="Claim your permanent name.subframe.eth ENS subdomain. AI-powered wallet analysis and on-chain identity." />
  <meta property="og:image" content="https://subframe.network/favicon.png" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:site" content="@subframeeth" />
  <meta name="twitter:title" content="Subframe Protocol" />
  <meta name="twitter:image" content="https://subframe.network/favicon.png" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0C0C0C;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh}
    .loader{display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:12px}
    .dot{width:10px;height:10px;border-radius:50%;background:#CBFF4D;animation:pulse 1.2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
    .loader-text{color:#ffffff40;font-size:12px;font-family:monospace}
    .error{display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px;text-align:center;padding:24px}
    .error-name{font-family:monospace;color:rgba(203,255,77,.38);font-size:14px}
    .error-msg{color:#ffffff40;font-size:13px}
    .brand-link{color:#ffffff15;font-size:11px;text-decoration:none;margin-top:8px}
    .brand-link:hover{color:rgba(203,255,77,.3)}
    /* layout */
    .page{max-width:1200px;margin:0 auto;padding:28px 20px 40px;display:flex;flex-direction:column;gap:20px}
    /* profile card - full width */
    .pcard{background:#0e0e0e;border:1px solid rgba(255,255,255,.07);border-radius:18px;overflow:hidden;position:relative}
    .pcard-line{position:absolute;inset-x:0;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(203,255,77,.3),transparent)}
    .pcard-body{padding:24px}
    .profile-row{display:flex;align-items:center;gap:20px}
    .avatar-wrap{position:relative;flex-shrink:0}
    .avatar-glow{position:absolute;inset:-4px;border-radius:16px;background:rgba(203,255,77,.12);filter:blur(14px)}
    .avatar{position:relative;width:80px;height:80px;border-radius:16px;background:#111;border:1px solid rgba(203,255,77,.22);overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 0 24px rgba(203,255,77,.14)}
    .avatar img{width:100%;height:100%;object-fit:cover}
    .avatar-ph{font-size:34px}
    .profile-info{flex:1;min-width:0}
    .name-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:8px}
    .ens-name{font-size:28px;font-weight:900;font-family:monospace;color:#fff;word-break:break-all}
    .badge{font-size:11px;padding:3px 12px;border-radius:99px;border:1px solid;font-family:monospace}
    .badge-linked{color:#34d399;background:rgba(52,211,153,.08);border-color:rgba(52,211,153,.2)}
    .badge-pending{color:#fbbf24;background:rgba(251,191,36,.08);border-color:rgba(251,191,36,.2)}
    .badge-active{color:#22d3ee;background:rgba(34,211,238,.08);border-color:rgba(34,211,238,.2)}
    .wallet-row{display:flex;align-items:center;gap:6px}
    .wallet-addr{font-family:monospace;font-size:13px;color:rgba(255,255,255,.28)}
    .icon-btn{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.2);display:flex;align-items:center;padding:2px;border-radius:4px;transition:color .15s;text-decoration:none}
    .icon-btn:hover{color:#CBFF4D}
    .eth-block{flex-shrink:0;text-align:right;margin-left:auto}
    .eth-val{font-size:28px;font-weight:900;font-family:monospace;line-height:1;color:#fff}
    .eth-lbl{font-size:12px;color:#CBFF4D;font-weight:700;margin-top:3px}
    .eth-usd{font-size:11px;color:rgba(255,255,255,.25);margin-top:2px}
    .bio{font-size:14px;color:rgba(255,255,255,.48);line-height:1.65;margin-top:14px}
    .meta-row{display:flex;align-items:center;gap:16px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.05)}
    .ens-link{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#CBFF4D;text-decoration:none}
    .ens-link:hover{color:rgba(203,255,77,.8)}
    .pulse-dot{width:6px;height:6px;border-radius:50%;background:#CBFF4D;animation:pulse 1.5s ease-in-out infinite;flex-shrink:0}
    .tx-count-meta{font-size:11px;font-family:monospace;color:rgba(255,255,255,.22);margin-left:auto}
    /* two-column grid */
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
    .col-card{background:#0e0e0e;border:1px solid rgba(255,255,255,.07);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
    .col-card-ai{border-color:rgba(203,255,77,.1)}
    .col-head{padding:16px 20px 0;display:flex;align-items:center;gap:8px;flex-shrink:0}
    .col-title{font-size:11px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em}
    .sec-bar{width:4px;height:12px;border-radius:99px;background:rgba(203,255,77,.6);flex-shrink:0}
    /* AI analysis */
    .ai-inner{padding:16px 20px 20px;flex:1;overflow-y:auto}
    .ai-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
    .ai-icon{width:30px;height:30px;border-radius:8px;background:rgba(203,255,77,.1);border:1px solid rgba(203,255,77,.15);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
    .ai-type{font-weight:700;color:rgba(255,255,255,.85);font-size:14px}
    .risk-badge{font-size:11px;padding:3px 10px;border-radius:99px;border:1px solid;font-family:monospace;flex-shrink:0}
    .risk-low{color:#34d399;background:rgba(52,211,153,.08);border-color:rgba(52,211,153,.2)}
    .risk-medium{color:#fbbf24;background:rgba(251,191,36,.08);border-color:rgba(251,191,36,.2)}
    .risk-high{color:#f87171;background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.2)}
    .ai-summary{font-size:13px;color:rgba(255,255,255,.58);line-height:1.65;margin-bottom:14px}
    .tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
    .tag{font-size:10px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.32);padding:3px 9px;border-radius:5px;border:1px solid rgba(255,255,255,.06);font-family:monospace}
    .insights-title{font-size:10px;font-weight:700;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;display:flex;align-items:center;gap:6px}
    .insight-item{display:flex;gap:8px;font-size:12px;color:rgba(255,255,255,.45);line-height:1.55;margin-bottom:6px}
    .insight-plus{color:rgba(203,255,77,.5);flex-shrink:0;font-weight:700}
    /* tx list in analysis */
    .tx-list{border:1px solid rgba(255,255,255,.06);border-radius:10px;overflow:hidden;margin-top:14px}
    .tx-row{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;gap:8px;transition:background .15s}
    .tx-row:not(:last-child){border-bottom:1px solid rgba(255,255,255,.04)}
    .tx-row:hover{background:rgba(255,255,255,.02)}
    .tx-left{display:flex;align-items:center;gap:10px;min-width:0}
    .tx-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
    .tx-dot-ok{background:#34d399}
    .tx-dot-fail{background:#f87171}
    .tx-hash{font-family:monospace;font-size:11px;color:rgba(255,255,255,.32)}
    .tx-meta{font-size:10px;color:rgba(255,255,255,.18);margin-top:2px}
    .tx-right{display:flex;align-items:center;gap:6px;flex-shrink:0}
    .tx-method{font-size:10px;background:rgba(203,255,77,.08);color:rgba(203,255,77,.55);padding:2px 6px;border-radius:4px;font-family:monospace;border:1px solid rgba(203,255,77,.1)}
    .tx-eth{font-family:monospace;font-size:11px;font-weight:700;white-space:nowrap}
    .tx-eth span{color:#CBFF4D}
    .ext-link{color:rgba(255,255,255,.15);text-decoration:none;display:flex}
    .ext-link:hover{color:#CBFF4D}
    /* AI chat */
    .chat-messages{flex:1;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:12px;min-height:320px;max-height:480px}
    .chat-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px 20px;text-align:center}
    .chat-empty-icon{font-size:28px;opacity:.35}
    .chat-empty-text{font-size:12px;color:rgba(255,255,255,.28);line-height:1.6}
    .chat-bubble{max-width:88%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.55;word-break:break-word}
    .bubble-user{background:rgba(203,255,77,.1);border:1px solid rgba(203,255,77,.15);color:rgba(255,255,255,.9);align-self:flex-end;border-bottom-right-radius:4px}
    .bubble-ai{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.75);align-self:flex-start;border-bottom-left-radius:4px}
    .bubble-typing{opacity:.55}
    .chat-input-wrap{padding:14px 16px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:10px;align-items:flex-end;flex-shrink:0}
    .chat-textarea{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;font-size:13px;padding:10px 13px;resize:none;outline:none;font-family:inherit;line-height:1.5;max-height:100px;transition:border-color .15s}
    .chat-textarea:focus{border-color:rgba(203,255,77,.35)}
    .chat-textarea::placeholder{color:rgba(255,255,255,.25)}
    .send-btn{background:#CBFF4D;border:none;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:opacity .15s;font-size:16px;color:#0C0C0C;font-weight:900}
    .send-btn:hover{opacity:.85}
    .send-btn:disabled{opacity:.35;cursor:not-allowed}
    /* footer */
    .footer{text-align:center;padding-bottom:8px}
    .footer a{color:rgba(255,255,255,.1);font-size:11px;text-decoration:none}
    .footer a:hover{color:rgba(203,255,77,.35)}
    /* action buttons */
    .action-row{display:flex;gap:8px;margin-top:14px}
    .half-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.45);font-size:13px;font-weight:700;padding:11px 8px;border-radius:10px;cursor:pointer;transition:all .15s;font-family:inherit}
    .half-btn:hover{border-color:rgba(203,255,77,.25);background:rgba(203,255,77,.04);color:rgba(255,255,255,.85)}
    /* modal */
    .modal-overlay{display:none;position:fixed;inset:0;z-index:100;align-items:flex-end;justify-content:center;padding:16px;background:rgba(0,0,0,.78);backdrop-filter:blur(6px)}
    .modal-overlay.open{display:flex}
    @media(min-width:480px){.modal-overlay{align-items:center}}
    .modal-box{width:100%;max-width:380px;background:#111;border:1px solid rgba(255,255,255,.1);border-radius:18px;overflow:hidden;position:relative;animation:slideUp .2s ease}
    @keyframes slideUp{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
    .modal-top-line{height:1px;background:linear-gradient(90deg,transparent,rgba(203,255,77,.3),transparent)}
    .modal-inner{padding:22px}
    .modal-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px}
    .modal-icon-wrap{display:flex;align-items:center;gap:12px}
    .modal-icon{width:40px;height:40px;border-radius:10px;background:rgba(203,255,77,.1);border:1px solid rgba(203,255,77,.2);display:flex;align-items:center;justify-content:center}
    .modal-title{font-size:15px;font-weight:900;color:#fff;margin-bottom:4px}
    .cs-badge{display:inline-block;font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;background:rgba(203,255,77,.12);color:#CBFF4D;border:1px solid rgba(203,255,77,.22);text-transform:uppercase;letter-spacing:.06em}
    .modal-close{background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;border-radius:4px}
    .modal-close:hover{color:#fff}
    .modal-text{font-size:13px;color:rgba(255,255,255,.4);line-height:1.65}
    .ct-amounts{display:flex;gap:8px;margin:14px 0}
    .ct-amt{flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:rgba(255,255,255,.4);font-size:12px;font-weight:900;font-family:monospace;cursor:pointer;transition:all .15s}
    .ct-amt:hover{border-color:rgba(203,255,77,.3)}
    .ct-amt.active{border-color:rgba(203,255,77,.4);background:rgba(203,255,77,.1);color:#CBFF4D}
    .ct-start{width:100%;padding:12px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.22);font-size:13px;font-weight:700;cursor:not-allowed;margin-bottom:8px;font-family:inherit}
    .ct-note{font-size:10px;color:rgba(255,255,255,.2);text-align:center}
    @media(max-width:720px){
      .grid2{grid-template-columns:1fr}
      .ens-name{font-size:22px}
      .eth-val{font-size:22px}
      .avatar{width:64px;height:64px}
      .chat-messages{min-height:260px;max-height:360px}
    }
  </style>
</head>
<body>
  <div id="root"><div class="loader"><div class="dot"></div><p class="loader-text">Loading profile...</p></div></div>
  <script>
  (function(){
    var API = '${API_BASE}';
    var parts = window.location.pathname.split('/').filter(Boolean);
    var name = parts[0] || '';
    var convId = null;
    var walletCtx = '';
    var sending = false;

    function esc(s){ return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

    function badge(status){
      var cls = status==='linked'?'badge-linked':status==='active'?'badge-active':'badge-pending';
      return '<span class="badge '+cls+'">'+esc(status)+'</span>';
    }

    function shortAddr(a){ return a.slice(0,10)+'...'+a.slice(-6); }

    function renderTx(tx){
      return '<div class="tx-row">'+
        '<div class="tx-left">'+
          '<div class="tx-dot '+(tx.status==='success'?'tx-dot-ok':'tx-dot-fail')+'"></div>'+
          '<div>'+
            '<div class="tx-hash">'+esc(tx.hash.slice(0,18))+'...</div>'+
            '<div class="tx-meta">'+esc(tx.from.slice(0,8))+'... to '+(tx.to?esc(tx.to.slice(0,8))+'...':'Contract')+'</div>'+
          '</div>'+
        '</div>'+
        '<div class="tx-right">'+
          (tx.method?'<span class="tx-method">'+esc(tx.method)+'</span>':'')+
          '<span class="tx-eth">'+esc(tx.valueEth)+' <span>ETH</span></span>'+
          '<a class="ext-link" href="https://etherscan.io/tx/'+esc(tx.hash)+'" target="_blank" rel="noopener">&#x2197;</a>'+
        '</div>'+
      '</div>';
    }

    function buildWalletContext(sub, wallet, analysis){
      var lines = ['ENS: '+sub.ensFullName, 'Address: '+sub.walletAddress];
      if(wallet){ lines.push('Balance: '+wallet.balanceEth+' ETH', 'Transactions: '+(wallet.txCount||0)); }
      if(analysis){ lines.push('Activity: '+analysis.activityType, 'Risk: '+analysis.riskLevel, 'Summary: '+analysis.summary); }
      return lines.join('\\n');
    }

    function appendBubble(role, text){
      var msgs = document.getElementById('chat-msgs');
      if(!msgs) return;
      var empty = msgs.querySelector('.chat-empty');
      if(empty) empty.remove();
      var div = document.createElement('div');
      div.className = 'chat-bubble '+(role==='user'?'bubble-user':'bubble-ai');
      div.textContent = text;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      return div;
    }

    function setSendDisabled(v){
      var btn = document.getElementById('send-btn');
      var ta = document.getElementById('chat-input');
      if(btn) btn.disabled = v;
      if(ta) ta.disabled = v;
    }

    async function sendMessage(){
      if(sending) return;
      var ta = document.getElementById('chat-input');
      var content = ta ? ta.value.trim() : '';
      if(!content) return;
      sending = true;
      setSendDisabled(true);
      if(ta) ta.value = '';

      appendBubble('user', content);

      // Create conversation on first message
      if(!convId){
        try {
          var cr = await fetch(API+'/api/openai/conversations', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({title: name+'.subframe.eth chat'})
          });
          if(cr.ok){ var cd = await cr.json(); convId = cd.id; }
        } catch(e){}
      }

      if(!convId){ appendBubble('ai','[Error: could not create conversation]'); sending=false; setSendDisabled(false); return; }

      var typingDiv = appendBubble('ai','...');
      if(typingDiv) typingDiv.classList.add('bubble-typing');

      try {
        var mr = await fetch(API+'/api/openai/conversations/'+convId+'/messages', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({content: content, walletContext: walletCtx})
        });
        if(mr.ok){
          if(typingDiv) typingDiv.remove();
          var aiBubble = appendBubble('ai','');
          var reader = mr.body.getReader();
          var decoder = new TextDecoder();
          var aiText = '';
          var streaming = true;
          while(streaming){
            var rv = await reader.read();
            if(rv.done){ streaming=false; break; }
            var chunk = decoder.decode(rv.value, {stream:true});
            var lines = chunk.split('\\n');
            for(var li=0;li<lines.length;li++){
              var ln = lines[li];
              if(ln.startsWith('data: ')){
                try{
                  var d = JSON.parse(ln.slice(6));
                  if(d.content){ aiText+=d.content; if(aiBubble) aiBubble.textContent=aiText; var ms=document.getElementById('chat-msgs'); if(ms) ms.scrollTop=ms.scrollHeight; }
                  if(d.done){ streaming=false; }
                }catch(pe){}
              }
            }
          }
          if(aiBubble && !aiBubble.textContent) aiBubble.textContent='[No response]';
        } else {
          if(typingDiv) typingDiv.remove();
          appendBubble('ai','[Error: '+mr.status+']');
        }
      } catch(e){
        if(typingDiv) typingDiv.remove();
        appendBubble('ai','[Network error]');
      }

      sending = false;
      setSendDisabled(false);
      var taEl = document.getElementById('chat-input');
      if(taEl) taEl.focus();
    }

    function renderProfile(sub, wallet, analysis){
      var html = '<div class="page">';

      // --- Full-width profile card ---
      html += '<div class="pcard"><div class="pcard-line"></div><div class="pcard-body">';
      html += '<div class="profile-row">';
      // Avatar
      html += '<div class="avatar-wrap"><div class="avatar-glow"></div><div class="avatar">';
      if(sub.avatarUrl) html += '<img src="'+esc(sub.avatarUrl)+'" alt="" />';
      else html += '<span class="avatar-ph">&#9889;</span>';
      html += '</div></div>';
      // Name + wallet
      html += '<div class="profile-info">';
      html += '<div class="name-row"><span class="ens-name">'+esc(sub.ensFullName)+'</span>'+badge(sub.status)+'</div>';
      html += '<div class="wallet-row">';
      html += '<span class="wallet-addr">'+esc(shortAddr(sub.walletAddress))+'</span>';
      html += '<a class="icon-btn" href="https://etherscan.io/address/'+esc(sub.walletAddress)+'" target="_blank" rel="noopener" title="Etherscan">&#x2197;</a>';
      html += '</div>';
      html += '</div>';
      // ETH balance (right side)
      if(wallet){
        html += '<div class="eth-block">';
        html += '<div class="eth-val">'+esc(wallet.balanceEth)+'</div>';
        html += '<div class="eth-lbl">ETH</div>';
        if(wallet.balanceUsd) html += '<div class="eth-usd">$'+esc(wallet.balanceUsd)+'</div>';
        html += '</div>';
      }
      html += '</div>'; // profile-row
      if(sub.bio) html += '<p class="bio">'+esc(sub.bio)+'</p>';
      // meta row
      html += '<div class="meta-row">';
      if(sub.status==='linked'){
        html += '<a class="ens-link" href="https://subframe.eth.limo/'+esc(sub.name)+'" target="_blank" rel="noopener">';
        html += '<span class="pulse-dot"></span>subframe.eth.limo/'+esc(sub.name)+' &#x2197;</a>';
      }
      if(wallet && wallet.txCount != null){
        html += '<span class="tx-count-meta">'+Number(wallet.txCount).toLocaleString()+' transactions</span>';
      }
      html += '</div>';
      // action buttons
      html += '<div class="action-row">';
      html += '<button class="half-btn" onclick="openModal(\\'messages\\')">';
      html += '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
      html += 'Messages</button>';
      html += '<button class="half-btn" onclick="openModal(\\'copytrade\\')">';
      html += '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
      html += 'Copy Trade</button>';
      html += '</div>';
      html += '</div></div>'; // pcard-body + pcard

      // --- 2-column grid ---
      html += '<div class="grid2">';

      // LEFT: AI Analysis
      html += '<div class="col-card col-card-ai">';
      html += '<div class="col-head"><div class="sec-bar"></div><span class="col-title">AI Wallet Analysis</span></div>';
      html += '<div class="ai-inner">';
      if(analysis){
        var riskCls = analysis.riskLevel==='low'?'risk-low':analysis.riskLevel==='high'?'risk-high':'risk-medium';
        html += '<div class="ai-top">';
        html += '<div style="display:flex;align-items:center;gap:8px"><div class="ai-icon">&#129504;</div><span class="ai-type">'+esc(analysis.activityType)+'</span></div>';
        html += '<span class="risk-badge '+riskCls+'">Risk: '+esc(analysis.riskLevel)+'</span>';
        html += '</div>';
        if(analysis.summary) html += '<p class="ai-summary">'+esc(analysis.summary)+'</p>';
        if(analysis.tags && analysis.tags.length){
          html += '<div class="tags">';
          analysis.tags.forEach(function(t){ html += '<span class="tag">'+esc(t)+'</span>'; });
          html += '</div>';
        }
        if(analysis.insights && analysis.insights.length){
          html += '<div class="insights-title">&#128161; Insights</div>';
          analysis.insights.forEach(function(ins){
            html += '<div class="insight-item"><span class="insight-plus">+</span><span>'+esc(ins)+'</span></div>';
          });
        }
      } else {
        html += '<div style="color:rgba(255,255,255,.3);font-size:13px;padding:12px 0">No analysis available.</div>';
      }
      // Recent transactions inside analysis col
      if(wallet && wallet.lastTransactions && wallet.lastTransactions.length>0){
        html += '<div style="margin-top:16px;font-size:10px;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Recent Transactions</div>';
        html += '<div class="tx-list">';
        wallet.lastTransactions.slice(0,5).forEach(function(tx){ html += renderTx(tx); });
        html += '</div>';
      }
      html += '</div>'; // ai-inner
      html += '</div>'; // col-card

      // RIGHT: AI Chat
      html += '<div class="col-card">';
      html += '<div class="col-head"><div class="sec-bar"></div><span class="col-title">AI Chat</span></div>';
      html += '<div class="chat-messages" id="chat-msgs">';
      html += '<div class="chat-empty">';
      html += '<div class="chat-empty-icon">&#129302;</div>';
      html += '<div class="chat-empty-text">Ask anything about this wallet<br/>and on-chain activity</div>';
      html += '</div>';
      html += '</div>'; // chat-messages
      html += '<div class="chat-input-wrap">';
      html += '<textarea class="chat-textarea" id="chat-input" placeholder="Ask about this wallet..." rows="1"></textarea>';
      html += '<button class="send-btn" id="send-btn">&#9650;</button>';
      html += '</div>';
      html += '</div>'; // col-card

      html += '</div>'; // grid2

      html += '<div class="footer"><a href="https://subframe.network">Built on Subframe Protocol</a></div>';
      html += '</div>'; // page
      return html;
    }

    function showError(msg, namePart){
      document.getElementById('root').innerHTML =
        '<div class="error">'+
        (namePart?'<div class="error-name">'+esc(namePart)+'.subframe.eth</div>':'')+
        '<div class="error-msg">'+esc(msg)+'</div>'+
        '<a class="brand-link" href="https://subframe.network">Built on Subframe Protocol</a>'+
        '</div>';
    }

    function attachChat(){
      var btn = document.getElementById('send-btn');
      var ta = document.getElementById('chat-input');
      if(btn) btn.addEventListener('click', sendMessage);
      if(ta){
        ta.addEventListener('keydown', function(e){
          if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
        });
        ta.addEventListener('input', function(){
          this.style.height='auto';
          this.style.height=Math.min(this.scrollHeight,100)+'px';
        });
      }
    }

    async function load(){
      if(!name){ showError('Visit name.subframe.eth.limo to view a profile.',''); return; }
      try {
        var r = await fetch(API+'/api/subdomains/by-name/'+encodeURIComponent(name));
        if(!r.ok){ showError('Profile not found.',name); return; }
        var sub = await r.json();

        var wallet=null,analysis=null;
        try {
          var [wr,ar] = await Promise.all([
            fetch(API+'/api/wallets/'+encodeURIComponent(sub.walletAddress)),
            fetch(API+'/api/wallets/'+encodeURIComponent(sub.walletAddress)+'/analyze')
          ]);
          if(wr.ok) wallet=await wr.json();
          if(ar.ok) analysis=await ar.json();
        } catch(e){}

        walletCtx = buildWalletContext(sub, wallet, analysis);
        document.title = sub.ensFullName+' - Subframe Protocol';
        document.getElementById('root').innerHTML = renderProfile(sub,wallet,analysis);
        attachChat();
      } catch(e){
        showError('Failed to load profile.',name);
      }
    }

    load();
  })();
  </script>

  <!-- Coming Soon Modal -->
  <div id="cs-modal" class="modal-overlay" onclick="closeModal()">
    <div class="modal-box" onclick="event.stopPropagation()">
      <div class="modal-top-line"></div>
      <div class="modal-inner">
        <div class="modal-header">
          <div class="modal-icon-wrap">
            <div class="modal-icon" id="modal-icon"></div>
            <div>
              <div class="modal-title" id="modal-title"></div>
              <span class="cs-badge">Coming Soon</span>
            </div>
          </div>
          <button class="modal-close" onclick="closeModal()">&#x2715;</button>
        </div>
        <div id="modal-body"></div>
      </div>
    </div>
  </div>

  <script>
  function openModal(type) {
    var modal = document.getElementById('cs-modal');
    var icon = document.getElementById('modal-icon');
    var title = document.getElementById('modal-title');
    var body = document.getElementById('modal-body');
    if (type === 'messages') {
      icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CBFF4D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
      title.textContent = 'Messages';
      body.innerHTML = '<p class="modal-text">Send on-chain encrypted messages to this wallet. Powered by XMTP protocol, messages are stored decentrally and readable only by the recipient.</p>';
    } else {
      icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CBFF4D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
      title.textContent = 'Copy Trade';
      body.innerHTML = '<p class="modal-text">Auto-mirror every trade this wallet makes. Choose your position size and we handle execution.</p>' +
        '<div class="ct-amounts">' +
          '<button class="ct-amt active" onclick="selectAmt(this)">0.1 ETH</button>' +
          '<button class="ct-amt" onclick="selectAmt(this)">0.3 ETH</button>' +
          '<button class="ct-amt" onclick="selectAmt(this)">0.5 ETH</button>' +
        '</div>' +
        '<button class="ct-start">Start Copy Trade</button>' +
        '<p class="ct-note">Feature launching soon. Join waitlist via X.</p>';
    }
    modal.classList.add('open');
  }
  function closeModal() {
    var el = document.getElementById('cs-modal');
    if (el) el.classList.remove('open');
  }
  function selectAmt(el) {
    el.parentNode.querySelectorAll('.ct-amt').forEach(function(b){ b.classList.remove('active'); });
    el.classList.add('active');
  }
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeModal(); });
  </script>
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
