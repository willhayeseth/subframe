#!/bin/bash
# Build Subframe app and deploy to IPFS, then update subframe.eth ENS contenthash.
# Run from project root: bash scripts/deploy-to-ipfs.sh

set -e

BACKEND_URL="${1:-https://${REPLIT_DEV_DOMAIN}/api}"
echo "Building with API base: $BACKEND_URL"

PORT=3001 BASE_PATH=/ VITE_API_BASE_URL="$BACKEND_URL" NODE_ENV=production \
  pnpm --filter @workspace/subframe exec vite build

echo "Build done. Uploading to Pinata..."

CID=$(node - << 'EOF'
import fs from 'fs';
import path from 'path';

const DIST = 'artifacts/subframe/dist/public';
const PINATA_JWT = process.env.PINATA_JWT;

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [{ full, rel: path.relative(base, full) }];
  });
}

const mimes = { '.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.txt':'text/plain' };

const fd = new FormData();
for (const { full, rel } of walk(DIST)) {
  const ext = path.extname(rel).toLowerCase();
  fd.append('file', new Blob([fs.readFileSync(full)], { type: mimes[ext] ?? 'application/octet-stream' }), `app/${rel}`);
}
fd.append('pinataMetadata', JSON.stringify({ name: 'subframe-protocol-app' }));
fd.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
  method: 'POST', headers: { Authorization: `Bearer ${PINATA_JWT}` }, body: fd,
});
const data = await res.json();
if (!data.IpfsHash) { console.error('Upload failed:', JSON.stringify(data)); process.exit(1); }
process.stdout.write(data.IpfsHash);
EOF
)

echo "Uploaded CID: $CID"
echo "Setting ENS contenthash..."

curl -s -X POST "${REPLIT_DEV_DOMAIN:+https://${REPLIT_DEV_DOMAIN}/api}/api/admin/set-parent-contenthash" \
  -H "Content-Type: application/json" \
  -d "{\"cid\":\"$CID\"}"

echo ""
echo "Done. subframe.eth.limo will update in ~5-10 minutes."
