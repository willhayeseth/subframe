/** Rewrite slow Pinata public gateway to ipfs.io (4x faster). Safe for non-IPFS URLs. */
export function ipfsImg(url: string | null | undefined): string {
  if (!url) return "";
  const cid = url.split("/ipfs/")[1];
  if (!cid) return url;
  return `https://ipfs.io/ipfs/${cid}`;
}
