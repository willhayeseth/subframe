import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { CheckCircle, XCircle, Loader2, ArrowRight, Zap, Shield, Wallet, Camera, User } from "lucide-react";
import {
  useCheckSubdomainAvailability,
  useCreateSubdomain,
  getCheckSubdomainAvailabilityQueryKey,
  getBaseUrl,
} from "@workspace/api-client-react";

export default function Claim() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [success, setSuccess] = useState(false);

  const [artConsent, setArtConsent] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  const { data: availability, isLoading: checkLoading } = useCheckSubdomainAvailability(
    debouncedName,
    {
      query: {
        enabled: debouncedName.length >= 3,
        queryKey: getCheckSubdomainAvailabilityQueryKey(debouncedName),
      },
    }
  );

  const createSubdomain = useCreateSubdomain();

  const handleNameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setName(clean);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setDebouncedName(clean), 500);
    setTimer(t);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      setAvatarError("JPG, PNG, WebP, or GIF only");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setAvatarError("Max file size is 3MB");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setAvatarUrl(null);
    setAvatarUploading(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch(`${getBaseUrl()}/api/upload/avatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Upload failed");
      }

      const data = await res.json() as { url: string };
      setAvatarUrl(data.url);
    } catch (err) {
      setAvatarError((err as Error).message ?? "Upload failed, try again");
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) return;
    createSubdomain.mutate(
      {
        data: {
          name,
          walletAddress: address,
          bio: bio || undefined,
          avatarUrl: avatarUrl ?? undefined,
        },
      },
      {
        onSuccess: (sub) => {
          setSuccess(true);
          setTimeout(() => setLocation(`/onboarding/${sub.name}`), 1200);
        },
      }
    );
  };

  const isAvailable = debouncedName.length >= 3 && availability?.available === true;
  const isTaken = debouncedName.length >= 3 && availability?.available === false;
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh] p-8 bg-[#0C0C0C]">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="text-center"
        >
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-[#CBFF4D]/10 animate-pulse" />
            <div className="w-24 h-24 rounded-full bg-[#CBFF4D]/8 border border-[#CBFF4D]/25 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-[#CBFF4D]" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Subdomain Claimed</h2>
          <p className="font-mono text-[#CBFF4D] text-lg">{name}.subframe.eth</p>
          <p className="mt-4 text-sm text-white/40">Redirecting to your profile...</p>
        </motion.div>
      </div>
    );
  }

  const perks = [
    "Permanent ENS subdomain on Ethereum",
    "Auto-deployed to IPFS instantly",
    "AI-powered wallet analysis included",
    "On-chain AI chat with your data",
  ];

  return (
    <div className="flex-1 px-5 py-16 bg-[#0C0C0C]">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#CBFF4D]/30 bg-[#CBFF4D]/8 text-[#CBFF4D] text-xs font-black uppercase tracking-widest mb-6">
            <Zap className="w-3.5 h-3.5 fill-current" />
            Claim Your Identity
          </div>
          <h1 className="text-5xl font-black text-white leading-tight mb-5">
            Your name on{" "}
            <span className="text-[#CBFF4D]">Ethereum</span>
          </h1>
          <p className="text-white/50 text-lg leading-relaxed mb-8">
            Register your permanent <span className="font-mono text-[#CBFF4D]">name.subframe.eth</span> subdomain and get an AI-powered Web3 profile page.
          </p>

          <ul className="space-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-white/65">
                <div className="w-5 h-5 rounded-full bg-[#CBFF4D]/10 border border-[#CBFF4D]/25 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-3 h-3 text-[#CBFF4D]" />
                </div>
                <span className="text-sm">{perk}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 p-5 rounded-2xl border border-white/8 bg-white/[0.025] flex items-center gap-4">
            <Shield className="w-8 h-8 text-[#CBFF4D] shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white">No gas required</div>
              <div className="text-xs text-white/40 mt-0.5">Registration is completely free on Subframe</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
        >
          <div className="relative p-8 rounded-3xl border border-white/8 bg-white/[0.025] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/25 to-transparent" />

            <h2 className="text-xl font-bold text-white mb-6">Register Subdomain</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Step 1: Connect Wallet */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  <span className="font-mono text-[#CBFF4D]/60 text-xs mr-1">01</span> Connect Wallet
                </label>
                {isConnected && address ? (
                  <button
                    type="button"
                    onClick={() => open({ view: "Account" })}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-[#CBFF4D]/30 bg-[#CBFF4D]/5 text-left transition-all hover:border-[#CBFF4D]/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#CBFF4D] animate-pulse" />
                      <span className="font-mono text-[#CBFF4D] text-sm font-bold">{shortAddress}</span>
                    </div>
                    <span className="text-xs text-white/30">Change</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => open()}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl border border-white/12 bg-white/[0.04] text-white/70 hover:text-white hover:border-white/25 hover:bg-white/[0.07] transition-all font-semibold"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect Wallet
                  </button>
                )}
              </div>

              {/* Step 2: Choose Name */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  <span className="font-mono text-[#CBFF4D]/60 text-xs mr-1">02</span> Subdomain Name
                </label>
                <div className="relative">
                  <input
                    data-testid="input-subdomain-name"
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="yourname"
                    disabled={!isConnected}
                    className="w-full px-4 py-3.5 pr-36 rounded-xl border border-white/8 bg-white/[0.04] text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-[#CBFF4D]/40 focus:ring-1 focus:ring-[#CBFF4D]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-white/25 font-mono text-sm">.subframe.eth</span>
                  </div>
                </div>
                <div className="mt-2 h-5 flex items-center gap-1.5 text-sm">
                  {checkLoading && debouncedName.length >= 3 && (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin text-[#CBFF4D]/60" /><span className="text-white/40 text-xs">Checking...</span></>
                  )}
                  {isAvailable && (
                    <><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 text-xs font-medium">{debouncedName}.subframe.eth is available</span></>
                  )}
                  {isTaken && (
                    <><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-red-400 text-xs">Already taken</span></>
                  )}
                  {name.length > 0 && name.length < 3 && (
                    <span className="text-white/30 text-xs">Min. 3 characters required</span>
                  )}
                </div>
              </div>

              {/* Step 3: Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  <span className="font-mono text-[#CBFF4D]/60 text-xs mr-1">03</span> Profile Picture <span className="text-white/25 font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isConnected || avatarUploading}
                    className="relative w-16 h-16 rounded-full border-2 border-dashed border-white/20 bg-white/[0.04] hover:border-[#CBFF4D]/50 hover:bg-[#CBFF4D]/5 transition-all overflow-hidden flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    {avatarUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#CBFF4D]" />
                    ) : avatarPreview ? (
                      <>
                        <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <User className="w-5 h-5 text-white/30 group-hover:hidden" />
                        <Camera className="w-5 h-5 text-[#CBFF4D]/70 hidden group-hover:block" />
                      </>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    {avatarUploading ? (
                      <p className="text-xs text-[#CBFF4D]/70">Uploading to IPFS...</p>
                    ) : avatarUrl ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs text-emerald-400 font-medium">Uploaded to IPFS</span>
                      </div>
                    ) : (
                      <p className="text-xs text-white/30">Click to upload JPG, PNG, WebP or GIF. Max 3MB.</p>
                    )}
                    {avatarError && (
                      <p className="text-xs text-red-400 mt-1">{avatarError}</p>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Step 4: Bio */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  <span className="font-mono text-[#CBFF4D]/60 text-xs mr-1">04</span> Bio <span className="text-white/25 font-normal">(optional)</span>
                </label>
                <textarea
                  data-testid="input-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the world who you are on-chain..."
                  rows={3}
                  disabled={!isConnected}
                  className="w-full px-4 py-3.5 rounded-xl border border-white/8 bg-white/[0.04] text-white placeholder:text-white/20 focus:outline-none focus:border-[#CBFF4D]/40 focus:ring-1 focus:ring-[#CBFF4D]/15 transition-all resize-none disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>

              <div className="rounded-xl border border-[#CBFF4D]/20 bg-[#CBFF4D]/[0.04] p-4">
                <p className="text-xs text-white/55 leading-relaxed mb-3">
                  Your uploaded image will automatically be published as a tradable art token on Uniswap V2 on Base. You earn{" "}
                  <span className="text-[#CBFF4D] font-bold">0.5%</span> from every buy and sell. Subframe takes 0.5%. The 1% fee applies everywhere the token trades.
                </p>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setArtConsent(!artConsent)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      artConsent
                        ? "bg-[#CBFF4D] border-[#CBFF4D]"
                        : "border-white/30 bg-transparent group-hover:border-[#CBFF4D]/50"
                    }`}
                  >
                    {artConsent && (
                      <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
                    I understand my image will be published as tradable on-chain art
                  </span>
                </label>
              </div>

              <button
                data-testid="btn-submit-claim"
                type="submit"
                disabled={!isAvailable || !isConnected || createSubdomain.isPending || avatarUploading || !artConsent}
                className="w-full flex items-center justify-center gap-2.5 py-4 btn-lime rounded-xl font-bold text-black disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none"
              >
                {createSubdomain.isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Claiming...</>
                ) : (
                  <><Zap className="w-5 h-5 fill-black" /> Claim Subdomain <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              {createSubdomain.isError && (
                <p className="text-sm text-red-400 text-center py-2">
                  {(createSubdomain.error as { data?: { error?: string } })?.data?.error ?? "Failed to claim subdomain. Try again."}
                </p>
              )}
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
