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
   subframe.eth.limo/{name} routes correctly to subframe.network/{name}. */
export async function uploadParentAppToIPFS(): Promise<string | null> {
  if (!PINATA_JWT) {
    console.warn("PINATA_JWT not set, skipping parent IPFS upload");
    return null;
  }

  const API_BASE = "https://subframedev.replit.app";

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Subframe Protocol</title>
  <meta name="description" content="Web3 identity on subframe.eth" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0C0C0C;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh}
    .loader{display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:12px}
    .dot{width:10px;height:10px;border-radius:50%;background:#CBFF4D;animation:pulse 1.2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
    .loader-text{color:#ffffff40;font-size:12px;font-family:monospace}
    .error{display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px;text-align:center;padding:24px}
    .error-name{font-family:monospace;color:#CBFF4D60;font-size:14px}
    .error-msg{color:#ffffff40;font-size:13px}
    .brand-link{color:#ffffff15;font-size:11px;text-decoration:none;margin-top:8px}
    .brand-link:hover{color:#CBFF4D50}
    .page{max-width:640px;margin:0 auto;padding:32px 16px;display:flex;flex-direction:column;gap:20px}
    .card{background:#0e0e0e;border:1px solid rgba(255,255,255,.07);border-radius:16px;overflow:hidden;position:relative}
    .card-top-line{position:absolute;inset-x:0;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(203,255,77,.25),transparent)}
    .card-body{padding:20px}
    .profile-row{display:flex;align-items:flex-start;gap:16px;margin-bottom:16px}
    .avatar-wrap{position:relative;flex-shrink:0}
    .avatar-glow{position:absolute;inset:0;border-radius:12px;background:rgba(203,255,77,.1);filter:blur(12px)}
    .avatar{position:relative;width:64px;height:64px;border-radius:12px;background:#111;border:1px solid rgba(203,255,77,.2);overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(203,255,77,.12)}
    .avatar img{width:100%;height:100%;object-fit:cover}
    .avatar-placeholder{font-size:28px}
    .profile-info{flex:1;min-width:0}
    .name-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px}
    .ens-name{font-size:22px;font-weight:900;font-family:monospace;color:#fff;word-break:break-all}
    .badge{font-size:11px;padding:3px 12px;border-radius:99px;border:1px solid;font-family:monospace}
    .badge-linked{color:#34d399;background:rgba(52,211,153,.08);border-color:rgba(52,211,153,.2)}
    .badge-pending{color:#fbbf24;background:rgba(251,191,36,.08);border-color:rgba(251,191,36,.2)}
    .badge-active{color:#22d3ee;background:rgba(34,211,238,.08);border-color:rgba(34,211,238,.2)}
    .wallet-row{display:flex;align-items:center;gap:6px}
    .wallet-addr{font-family:monospace;font-size:12px;color:rgba(255,255,255,.25)}
    .wallet-actions{display:flex;align-items:center;gap:4px}
    .icon-btn{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.2);display:flex;align-items:center;padding:2px;border-radius:4px;transition:color .15s}
    .icon-btn:hover{color:#CBFF4D}
    .eth-balance{flex-shrink:0;text-align:right}
    .eth-value{font-size:22px;font-weight:900;font-family:monospace;line-height:1}
    .eth-label{font-size:11px;color:#CBFF4D;font-weight:700;margin-top:2px}
    .eth-usd{font-size:11px;color:rgba(255,255,255,.25);margin-top:2px}
    .bio{font-size:13px;color:rgba(255,255,255,.5);line-height:1.6;margin-bottom:16px}
    .ens-link{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#CBFF4D;text-decoration:none;transition:color .15s}
    .ens-link:hover{color:rgba(203,255,77,.8)}
    .pulse-dot{width:6px;height:6px;border-radius:50%;background:#CBFF4D;animation:pulse 1.5s ease-in-out infinite;flex-shrink:0}
    .tx-count{margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.05);font-size:11px;font-family:monospace;color:rgba(255,255,255,.25)}
    .section-title{font-size:11px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;display:flex;align-items:center;gap:8px;margin-bottom:12px}
    .section-bar{width:4px;height:12px;border-radius:99px;background:rgba(203,255,77,.6);flex-shrink:0}
    .tx-list{background:#0e0e0e;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden}
    .tx-row{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;gap:8px;transition:background .15s}
    .tx-row:not(:last-child){border-bottom:1px solid rgba(255,255,255,.04)}
    .tx-row:hover{background:rgba(255,255,255,.02)}
    .tx-left{display:flex;align-items:center;gap:12px;min-width:0}
    .tx-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
    .tx-dot-ok{background:#34d399}
    .tx-dot-fail{background:#f87171}
    .tx-hash{font-family:monospace;font-size:12px;color:rgba(255,255,255,.35)}
    .tx-meta{font-size:11px;color:rgba(255,255,255,.2);margin-top:2px}
    .tx-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
    .tx-method{font-size:11px;background:rgba(203,255,77,.08);color:rgba(203,255,77,.6);padding:2px 8px;border-radius:4px;font-family:monospace;border:1px solid rgba(203,255,77,.1)}
    .tx-eth{font-family:monospace;font-size:12px;font-weight:700;white-space:nowrap}
    .tx-eth span{color:#CBFF4D}
    .ext-link{color:rgba(255,255,255,.15);text-decoration:none;display:flex}
    .ext-link:hover{color:#CBFF4D}
    .ai-card{border:1px solid rgba(203,255,77,.1);border-radius:12px;background:linear-gradient(180deg,rgba(203,255,77,.03),transparent);padding:20px;position:relative;overflow:hidden}
    .ai-card-line{position:absolute;inset-x:0;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(203,255,77,.2),transparent)}
    .ai-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
    .ai-icon{width:28px;height:28px;border-radius:8px;background:rgba(203,255,77,.1);border:1px solid rgba(203,255,77,.15);display:flex;align-items:center;justify-content:center;font-size:14px}
    .ai-type{font-weight:600;color:rgba(255,255,255,.8);font-size:14px}
    .risk-badge{font-size:11px;padding:3px 10px;border-radius:99px;border:1px solid;font-family:monospace}
    .risk-low{color:#34d399;background:rgba(52,211,153,.08);border-color:rgba(52,211,153,.2)}
    .risk-medium{color:#fbbf24;background:rgba(251,191,36,.08);border-color:rgba(251,191,36,.2)}
    .risk-high{color:#f87171;background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.2)}
    .ai-summary{font-size:13px;color:rgba(255,255,255,.6);line-height:1.65;margin-bottom:16px}
    .tags{display:flex;flex-wrap:wrap;gap:8px}
    .tag{font-size:11px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.35);padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.06);font-family:monospace}
    .footer{text-align:center;padding-bottom:24px}
    .footer a{color:rgba(255,255,255,.12);font-size:11px;text-decoration:none}
    .footer a:hover{color:rgba(203,255,77,.4)}
    @media(max-width:480px){.ens-name{font-size:18px}.eth-value{font-size:18px}.tx-method{display:none}}
  </style>
</head>
<body>
  <div id="root"><div class="loader"><div class="dot"></div><p class="loader-text">Loading profile...</p></div></div>
  <script>
  (function(){
    var API = '${API_BASE}';
    var parts = window.location.pathname.split('/').filter(Boolean);
    var name = parts[0] || '';

    function esc(s){ return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

    function badge(status){
      var cls = status === 'linked' ? 'badge-linked' : status === 'active' ? 'badge-active' : 'badge-pending';
      return '<span class="badge ' + cls + '">' + esc(status) + '</span>';
    }

    function shortAddr(a){ return a.slice(0,10) + '...' + a.slice(-6); }

    function renderTx(tx, last){
      var border = last ? '' : '';
      return '<div class="tx-row">' +
        '<div class="tx-left">' +
          '<div class="tx-dot ' + (tx.status === 'success' ? 'tx-dot-ok' : 'tx-dot-fail') + '"></div>' +
          '<div>' +
            '<div class="tx-hash">' + esc(tx.hash.slice(0,18)) + '...</div>' +
            '<div class="tx-meta">' + esc(tx.from.slice(0,8)) + '... to ' + (tx.to ? esc(tx.to.slice(0,8)) + '...' : 'Contract') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="tx-right">' +
          (tx.method ? '<span class="tx-method">' + esc(tx.method) + '</span>' : '') +
          '<span class="tx-eth">' + esc(tx.valueEth) + ' <span>ETH</span></span>' +
          '<a class="ext-link" href="https://etherscan.io/tx/' + esc(tx.hash) + '" target="_blank" rel="noopener">&#x2197;</a>' +
        '</div>' +
      '</div>';
    }

    function renderProfile(sub, wallet, analysis){
      var html = '<div class="page">';

      // Profile card
      html += '<div class="card"><div class="card-top-line"></div><div class="card-body">';
      html += '<div class="profile-row">';
      // Avatar
      html += '<div class="avatar-wrap"><div class="avatar-glow"></div><div class="avatar">';
      if(sub.avatarUrl) html += '<img src="' + esc(sub.avatarUrl) + '" alt="" />';
      else html += '<span class="avatar-placeholder">&#9889;</span>';
      html += '</div></div>';
      // Info
      html += '<div class="profile-info">';
      html += '<div class="name-row"><span class="ens-name">' + esc(sub.ensFullName) + '</span>' + badge(sub.status) + '</div>';
      html += '<div class="wallet-row">';
      html += '<span class="wallet-addr">' + esc(shortAddr(sub.walletAddress)) + '</span>';
      html += '<div class="wallet-actions">';
      html += '<a class="icon-btn" href="https://etherscan.io/address/' + esc(sub.walletAddress) + '" target="_blank" rel="noopener" title="View on Etherscan">&#x2197;</a>';
      html += '</div></div>';
      html += '</div>';
      // ETH balance
      if(wallet){
        html += '<div class="eth-balance"><div class="eth-value">' + esc(wallet.balanceEth) + '</div>';
        html += '<div class="eth-label">ETH</div>';
        if(wallet.balanceUsd) html += '<div class="eth-usd">$' + esc(wallet.balanceUsd) + '</div>';
        html += '</div>';
      }
      html += '</div>'; // profile-row

      if(sub.bio) html += '<p class="bio">' + esc(sub.bio) + '</p>';

      if(sub.status === 'linked'){
        html += '<a class="ens-link" href="https://subframe.eth.limo/' + esc(sub.name) + '" target="_blank" rel="noopener">';
        html += '<span class="pulse-dot"></span>subframe.eth.limo/' + esc(sub.name) + ' &#x2197;</a>';
      }

      if(wallet && wallet.txCount != null){
        html += '<div class="tx-count">' + Number(wallet.txCount).toLocaleString() + ' transactions</div>';
      }
      html += '</div></div>'; // card-body + card

      // Recent transactions
      if(wallet && wallet.lastTransactions && wallet.lastTransactions.length > 0){
        html += '<div>';
        html += '<div class="section-title"><div class="section-bar"></div>Recent Transactions</div>';
        html += '<div class="tx-list">';
        wallet.lastTransactions.forEach(function(tx, i){
          html += renderTx(tx, i === wallet.lastTransactions.length - 1);
        });
        html += '</div></div>';
      }

      // AI Analysis
      if(analysis){
        var riskCls = analysis.riskLevel === 'low' ? 'risk-low' : analysis.riskLevel === 'high' ? 'risk-high' : 'risk-medium';
        html += '<div>';
        html += '<div class="section-title"><div class="section-bar"></div>AI Wallet Analysis</div>';
        html += '<div class="ai-card"><div class="ai-card-line"></div>';
        html += '<div class="ai-header">';
        html += '<div style="display:flex;align-items:center;gap:8px"><div class="ai-icon">&#129504;</div><span class="ai-type">' + esc(analysis.activityType) + '</span></div>';
        html += '<span class="risk-badge ' + riskCls + '">Risk: ' + esc(analysis.riskLevel) + '</span>';
        html += '</div>';
        if(analysis.summary) html += '<p class="ai-summary">' + esc(analysis.summary) + '</p>';
        if(analysis.tags && analysis.tags.length){
          html += '<div class="tags">';
          analysis.tags.forEach(function(t){ html += '<span class="tag">' + esc(t) + '</span>'; });
          html += '</div>';
        }
        html += '</div></div>';
      }

      html += '<div class="footer"><a href="https://subframe.network">Built on Subframe Protocol</a></div>';
      html += '</div>'; // page
      return html;
    }

    function showError(msg, namePart){
      document.getElementById('root').innerHTML =
        '<div class="error">' +
        (namePart ? '<div class="error-name">' + esc(namePart) + '.subframe.eth</div>' : '') +
        '<div class="error-msg">' + esc(msg) + '</div>' +
        '<a class="brand-link" href="https://subframe.network">Built on Subframe Protocol</a>' +
        '</div>';
    }

    async function load(){
      if(!name){
        showError('Visit hayes.subframe.eth.limo to view a profile.', '');
        return;
      }
      try {
        var r = await fetch(API + '/api/subdomains/by-name/' + encodeURIComponent(name));
        if(!r.ok){ showError('Profile not found.', name); return; }
        var sub = await r.json();

        // Fetch wallet + analysis in parallel (non-blocking)
        var wallet = null, analysis = null;
        try {
          var [wr, ar] = await Promise.all([
            fetch(API + '/api/wallets/' + encodeURIComponent(sub.walletAddress)),
            fetch(API + '/api/wallets/' + encodeURIComponent(sub.walletAddress) + '/analyze')
          ]);
          if(wr.ok) wallet = await wr.json();
          if(ar.ok) analysis = await ar.json();
        } catch(e){}

        document.title = sub.ensFullName + ' - Subframe Protocol';
        document.getElementById('root').innerHTML = renderProfile(sub, wallet, analysis);
      } catch(e){
        showError('Failed to load profile.', name);
      }
    }

    load();
  })();
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
