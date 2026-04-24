import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  BookOpen, Zap, AtSign, Fuel, User, Database, Globe,
  BarChart2, Layers, MessageSquare, Code2, FileCode, Webhook, Shield,
  Twitter, Send, Inbox, ImageIcon, ArrowRight, ChevronRight,
  CheckCircle2, Info, AlertTriangle, Copy, Check
} from "lucide-react";
import { DocsLayout, DOC_SECTIONS, type DocSection } from "@/components/docs-layout";

function Tag({ children, color = "default" }: { children: React.ReactNode; color?: "green" | "yellow" | "default" }) {
  const styles = {
    green: { background: "rgba(74,222,128,0.1)", color: "rgb(74,222,128)", border: "1px solid rgba(74,222,128,0.2)" },
    yellow: { background: "rgba(203,255,77,0.08)", color: "#CBFF4D", border: "1px solid rgba(203,255,77,0.2)" },
    default: { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)" },
  };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium" style={styles[color]}>
      {children}
    </span>
  );
}

function Callout({ type = "info", children }: { type?: "info" | "success" | "warning"; children: React.ReactNode }) {
  const cfg = {
    info: { icon: Info, border: "rgba(99,179,237,0.25)", bg: "rgba(99,179,237,0.06)", color: "rgb(99,179,237)" },
    success: { icon: CheckCircle2, border: "rgba(74,222,128,0.25)", bg: "rgba(74,222,128,0.06)", color: "rgb(74,222,128)" },
    warning: { icon: AlertTriangle, border: "rgba(250,204,21,0.25)", bg: "rgba(250,204,21,0.06)", color: "rgb(250,204,21)" },
  };
  const { icon: Icon, border, bg, color } = cfg[type];
  return (
    <div className="flex gap-3 rounded-xl px-4 py-3.5 my-5" style={{ background: bg, border: `1px solid ${border}` }}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
      <div className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>{children}</div>
    </div>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="relative my-5 rounded-xl overflow-hidden" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{language}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-[11px] transition-colors" style={{ color: "rgba(255,255,255,0.35)" }}>
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-4 overflow-x-auto text-sm font-mono leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5 mb-8">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "#CBFF4D", color: "#0C0C0C" }}>
        {number}
      </div>
      <div className="pt-0.5 flex-1">
        <h3 className="text-[15px] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.9)" }}>{title}</h3>
        <div className="text-[13.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{children}</div>
      </div>
    </div>
  );
}

function PageTitle({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(203,255,77,0.1)", border: "1px solid rgba(203,255,77,0.2)" }}>
          <Icon className="w-5 h-5" style={{ color: "#CBFF4D" }} />
        </div>
        <h1 className="text-[30px] font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.95)" }}>{title}</h1>
      </div>
      <p className="text-[15.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{description}</p>
    </div>
  );
}

function Divider() {
  return <hr className="my-8" style={{ borderColor: "rgba(255,255,255,0.07)" }} />;
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[19px] font-semibold mt-10 mb-4 scroll-mt-32" style={{ color: "rgba(255,255,255,0.9)" }}>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>{children}</p>;
}

function OverviewCard({ img, title, description, href }: { img: string; title: string; description: string; href: string }) {
  return (
    <a href={href} className="group block rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="h-40 overflow-hidden flex items-center justify-center" style={{ background: "#0f0f0f" }}>
        <img src={img} alt={title} className="h-28 w-auto object-contain transition-transform group-hover:scale-105" />
      </div>
      <div className="px-5 py-4">
        <div className="text-[14.5px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.88)" }}>{title}</div>
        <div className="text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>{description}</div>
      </div>
    </a>
  );
}

function ApiEndpoint({ method, path, description }: { method: string; path: string; description: string }) {
  const colors: Record<string, string> = { GET: "#60a5fa", POST: "#4ade80", DELETE: "#f87171" };
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl mb-3" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}>
      <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded mt-0.5 flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: colors[method] || "white" }}>
        {method}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-mono mb-1" style={{ color: "rgba(255,255,255,0.8)" }}>{path}</div>
        <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>{description}</div>
      </div>
    </div>
  );
}

const PAGES: Record<string, { breadcrumb: string; sections: DocSection[]; content: React.ReactNode }> = {
  "/docs": {
    breadcrumb: "GET STARTED",
    sections: [{ id: "overview", title: "Overview" }, { id: "whats-inside", title: "What is included" }],
    content: (
      <>
        <PageTitle icon={BookOpen} title="Overview" description="Subframe Protocol gives every Ethereum wallet a permanent on-chain identity through ENS subdomains on subframe.eth. Zero gas, instant setup, AI-powered." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <OverviewCard img="/3d-key.webp" title="Quickstart" description="Claim your subdomain in under 2 minutes with zero gas." href="/docs/quickstart" />
          <OverviewCard img="/3d-eth-coin.webp" title="Zero Gas Claiming" description="Subframe covers all ENS registration gas on your behalf." href="/docs/zero-gas" />
          <OverviewCard img="/3d-identity-card.webp" title="Your Profile" description="A live on-chain profile with wallet data, NFTs, and ENS records." href="/docs/profile" />
          <OverviewCard img="/3d-ai-brain.webp" title="AI Features" description="Wallet analysis and on-chain encrypted AI chat powered by XMTP." href="/docs/ai-wallet" />
        </div>
        <H2 id="overview">What is Subframe Protocol</H2>
        <P>Subframe Protocol is an ENS subdomain registry built on subframe.eth. Any Ethereum wallet can claim a permanent name like <code className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(203,255,77,0.1)", color: "#CBFF4D" }}>yourname.subframe.eth</code> at zero cost.</P>
        <P>Once claimed, your subdomain becomes the anchor for your on-chain identity: a public profile page served over IPFS, ENS text records pointing to your socials and website, and AI-powered features that analyze your wallet history.</P>
        <H2 id="whats-inside">What is included</H2>
        <div className="space-y-3">
          {[
            ["ENS Subdomain", "A permanent name under subframe.eth registered on Ethereum mainnet."],
            ["Profile Page", "A hosted page at yourname.subframe.eth showing your assets, activity, and links."],
            ["AI Wallet Analyzer", "An AI engine that reads your on-chain history and produces a concise analysis."],
            ["On-chain AI Chat", "Encrypted messaging powered by XMTP, visible only to you."],
            ["Zero Gas", "All ENS registration costs are covered by Subframe Protocol."],
          ].map(([label, desc]) => (
            <div key={label} className="flex gap-3 px-4 py-3.5 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#CBFF4D" }} />
              <div>
                <div className="text-[13.5px] font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.85)" }}>{label}</div>
                <div className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.42)" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </>
    ),
  },

  "/docs/quickstart": {
    breadcrumb: "GET STARTED",
    sections: [{ id: "step-1", title: "Connect wallet" }, { id: "step-2", title: "Choose name" }, { id: "step-3", title: "Confirm" }, { id: "next-steps", title: "Next steps" }],
    content: (
      <>
        <PageTitle icon={Zap} title="Quickstart" description="Get your permanent subframe.eth subdomain live in under 2 minutes." />
        <Callout type="success">No gas fees required. Subframe Protocol pays all ENS registration costs on your behalf.</Callout>
        <H2 id="step-1">Step 1: Connect your wallet</H2>
        <P>Visit <a href="/" className="underline underline-offset-2" style={{ color: "#CBFF4D" }}>subframe.network</a> and click the Claim button in the top navigation. Connect any Ethereum-compatible wallet including MetaMask, Coinbase Wallet, Rainbow, and WalletConnect-compatible mobile wallets.</P>
        <Step number={1} title="Open the claim page">
          Navigate to <code className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)" }}>subframe.network/claim</code> and click Connect Wallet. Approve the connection in your wallet app.
        </Step>
        <H2 id="step-2">Step 2: Choose your subdomain name</H2>
        <Step number={2} title="Enter your name">
          Type the subdomain you want to claim. Names must be 3 to 32 characters, lowercase alphanumeric, and may include hyphens. Your full ENS name will be <code className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(203,255,77,0.1)", color: "#CBFF4D" }}>yourname.subframe.eth</code>.
        </Step>
        <Step number={3} title="Check availability">
          The system checks availability in real time. If your chosen name is taken, alternative suggestions appear automatically.
        </Step>
        <H2 id="step-3">Step 3: Confirm and go live</H2>
        <Step number={4} title="Sign the transaction">
          Sign a single gasless transaction in your wallet. Subframe Protocol handles the ENS registration on-chain. No ETH balance is needed for gas.
        </Step>
        <Step number={5} title="Your profile is live">
          Within a few seconds your profile page is live at <code className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(203,255,77,0.1)", color: "#CBFF4D" }}>yourname.subframe.eth</code> and accessible via any ENS gateway.
        </Step>
        <H2 id="next-steps">Next steps</H2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[["Customize your profile", "/docs/profile"], ["Set ENS records", "/docs/ens-records"], ["Try AI Wallet Analyzer", "/docs/ai-wallet"], ["Explore API", "/docs/api"]].map(([label, href]) => (
            <a key={href} href={href} className="flex items-center justify-between px-4 py-3 rounded-xl transition-colors group" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.72)" }}>{label}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: "rgba(255,255,255,0.3)" }} />
            </a>
          ))}
        </div>
      </>
    ),
  },

  "/docs/claim": {
    breadcrumb: "GET STARTED",
    sections: [{ id: "how-it-works", title: "How it works" }, { id: "name-rules", title: "Name rules" }, { id: "availability", title: "Availability" }],
    content: (
      <>
        <PageTitle icon={AtSign} title="Claim Your Subdomain" description="Learn how the subdomain claim flow works and what name rules apply." />
        <H2 id="how-it-works">How it works</H2>
        <P>Subframe Protocol operates as the controller of the <code className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(203,255,77,0.1)", color: "#CBFF4D" }}>subframe.eth</code> ENS name on Ethereum mainnet. When you claim a subdomain, the protocol uses a dedicated registrar contract to write your subdomain to the ENS registry on your behalf.</P>
        <P>Your wallet address becomes the owner of the subdomain. The protocol holds the parent name and delegates full control of records to you. You can update your ENS text records at any time after claiming.</P>
        <H2 id="name-rules">Name rules</H2>
        <div className="space-y-2.5 mb-6">
          {[
            ["Length", "3 to 32 characters."],
            ["Characters", "Lowercase letters (a to z), numbers (0 to 9), and hyphens."],
            ["Hyphens", "Cannot start or end with a hyphen."],
            ["Reserved", "Names matching ENS core terms or known brand names are reserved."],
            ["One per wallet", "Each wallet address may claim one active subdomain at a time."],
          ].map(([rule, detail]) => (
            <div key={rule} className="flex gap-3 px-4 py-3 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
              <div>
                <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{rule}: </span>
                <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>{detail}</span>
              </div>
            </div>
          ))}
        </div>
        <H2 id="availability">Checking availability</H2>
        <P>Availability is checked in real time against both the ENS registry and the Subframe Protocol reserve list. The claim page shows live availability as you type. If a name is taken, alternative suggestions based on your input are shown immediately.</P>
        <Callout type="info">Subdomains registered on subframe.eth are permanent ENS records on Ethereum mainnet. They persist as long as the parent name is active.</Callout>
      </>
    ),
  },

  "/docs/zero-gas": {
    breadcrumb: "GET STARTED",
    sections: [{ id: "how-gas-works", title: "How gas works" }, { id: "sponsor", title: "Gas sponsor" }, { id: "limits", title: "Limits" }],
    content: (
      <>
        <PageTitle icon={Fuel} title="Zero Gas Claiming" description="Subframe Protocol covers all ENS registration gas so you pay nothing." />
        <H2 id="how-gas-works">How gas works</H2>
        <P>Registering an ENS subdomain requires an on-chain transaction, which normally costs gas in ETH. Subframe Protocol eliminates this cost entirely by acting as the gas payer through a meta-transaction relayer.</P>
        <P>When you sign the claim transaction in your wallet, you are signing a gasless signature. The Subframe backend submits the actual on-chain transaction using its own ETH balance, covering the gas fee on your behalf.</P>
        <H2 id="sponsor">Gas sponsor architecture</H2>
        <Callout type="info">The protocol uses an EIP-712 typed signature scheme. Your wallet signs structured data authorizing the claim without spending ETH.</Callout>
        <Step number={1} title="You sign a typed message">
          Your wallet signs an EIP-712 message containing your desired subdomain name, your address, and a nonce. No ETH leaves your wallet.
        </Step>
        <Step number={2} title="Subframe submits on-chain">
          The Subframe relayer verifies your signature and calls the ENS registrar contract, paying gas from the protocol treasury.
        </Step>
        <Step number={3} title="Subdomain is yours">
          The ENS registry records you as the owner. The protocol has no ongoing control over your records.
        </Step>
        <H2 id="limits">Current limits</H2>
        <div className="space-y-2.5">
          {[["One free subdomain per wallet address.", "default"], ["Gas sponsorship covers the initial registration only.", "default"], ["Future record updates require your own gas.", "default"]].map(([text, _]) => (
            <div key={text} className="flex gap-3 px-4 py-3 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
              <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.58)" }}>{text}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },

  "/docs/profile": {
    breadcrumb: "YOUR SUBDOMAIN",
    sections: [{ id: "what-shows", title: "What shows on your profile" }, { id: "access", title: "Accessing your profile" }, { id: "customize", title: "Customization" }],
    content: (
      <>
        <PageTitle icon={User} title="Profile Page" description="Your public on-chain profile, accessible at yourname.subframe.eth and subframe.network/profile/yourname." />
        <H2 id="what-shows">What shows on your profile</H2>
        <P>Your profile page is generated automatically from on-chain data linked to your wallet address. It updates in real time as your on-chain state changes.</P>
        <div className="space-y-2.5 mb-6">
          {[["ENS Records", "Name, avatar, bio, website, and social links from your ENS text records."], ["Wallet Balance", "ETH and ERC-20 token balances with current market values."], ["NFT Gallery", "ERC-721 and ERC-1155 tokens displayed as a visual grid."], ["Transaction Activity", "Recent on-chain transaction history."], ["AI Analysis", "A short AI-generated summary of your wallet behavior."]].map(([label, desc]) => (
            <div key={label} className="flex gap-3 px-4 py-3.5 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#CBFF4D" }} />
              <div>
                <div className="text-[13px] font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.85)" }}>{label}</div>
                <div className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.42)" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <H2 id="access">Accessing your profile</H2>
        <P>Your profile is reachable at two URLs:</P>
        <CodeBlock code={`https://subframe.network/profile/yourname\nhttps://yourname.subframe.eth.limo`} language="urls" />
        <H2 id="customize">Customization</H2>
        <P>Profile data comes from your ENS text records. Update them through any ENS-compatible interface such as the ENS Manager App or directly through the Subframe onboarding flow after claiming.</P>
        <Callout type="info">Changes to ENS text records propagate to your profile within seconds of the transaction confirming on-chain.</Callout>
      </>
    ),
  },

  "/docs/ens-records": {
    breadcrumb: "YOUR SUBDOMAIN",
    sections: [{ id: "what-are-records", title: "What are ENS records" }, { id: "supported", title: "Supported records" }, { id: "update", title: "How to update" }],
    content: (
      <>
        <PageTitle icon={Database} title="ENS Records" description="Learn which ENS text records Subframe sets and how to update them." />
        <H2 id="what-are-records">What are ENS records</H2>
        <P>ENS text records are arbitrary key-value pairs stored in the ENS resolver contract for your subdomain. They let you attach structured metadata to your on-chain name, such as a display name, avatar image, website URL, and social handles.</P>
        <H2 id="supported">Supported records</H2>
        <div className="space-y-2">
          {[["display", "Human-readable display name."], ["avatar", "URL or IPFS hash of your profile image."], ["description", "Short bio up to 200 characters."], ["url", "Your personal or project website."], ["com.twitter", "Twitter/X handle without the @ prefix."], ["com.github", "GitHub username."], ["org.telegram", "Telegram username."], ["email", "Contact email address (public on-chain)."]].map(([key, desc]) => (
            <div key={key} className="flex gap-3 items-center px-4 py-3 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <code className="text-[12px] font-mono px-2 py-0.5 rounded flex-shrink-0" style={{ background: "rgba(203,255,77,0.08)", color: "#CBFF4D" }}>{key}</code>
              <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.5)" }}>{desc}</span>
            </div>
          ))}
        </div>
        <H2 id="update">How to update records</H2>
        <P>Record updates are standard ENS resolver calls. You can update them through the Subframe profile editor after logging in, or through the ENS Manager App at app.ens.domains. Each update is an on-chain transaction and requires a small amount of gas.</P>
      </>
    ),
  },

  "/docs/ipfs-hosting": {
    breadcrumb: "YOUR SUBDOMAIN",
    sections: [{ id: "what-is-ipfs", title: "What is IPFS hosting" }, { id: "how", title: "How it works" }, { id: "access", title: "Access via ENS" }],
    content: (
      <>
        <PageTitle icon={Globe} title="IPFS Hosting" description="Your profile page is hosted on IPFS and linked to your ENS subdomain via the contenthash record." />
        <H2 id="what-is-ipfs">What is IPFS hosting</H2>
        <P>IPFS (InterPlanetary File System) is a decentralized storage network. Subframe Protocol pins your profile page to IPFS and stores the content hash in your ENS resolver. This means your profile is fully decentralized and not dependent on any Subframe-operated server to remain accessible.</P>
        <H2 id="how">How it works</H2>
        <Step number={1} title="Profile is generated">Your profile page HTML is generated from your on-chain data and pinned to Pinata, our IPFS pinning provider.</Step>
        <Step number={2} title="Content hash is set">The resulting IPFS CID (content identifier) is written to your ENS contenthash record on-chain.</Step>
        <Step number={3} title="Accessible via ENS gateway">Any ENS-compatible browser or gateway resolves your subdomain and serves the IPFS content directly.</Step>
        <H2 id="access">Accessing via ENS gateway</H2>
        <CodeBlock code={`# Direct ENS gateway\nhttps://yourname.subframe.eth.limo\n\n# IPFS gateway via ENS content hash\nhttps://cloudflare-ipfs.com/ipns/yourname.subframe.eth`} language="urls" />
        <Callout type="info">Content is re-pinned automatically when your on-chain records change significantly. Manual refresh triggers are available via the Subframe API.</Callout>
      </>
    ),
  },

  "/docs/avatar": {
    breadcrumb: "YOUR SUBDOMAIN",
    sections: [{ id: "avatar-sources", title: "Avatar sources" }, { id: "nft-avatar", title: "NFT avatar" }],
    content: (
      <>
        <PageTitle icon={ImageIcon as any} title="Avatar and Identity" description="Set your profile image and display name through ENS records." />
        <H2 id="avatar-sources">Avatar sources</H2>
        <P>Subframe reads your avatar from the ENS avatar text record. It supports several formats:</P>
        <div className="space-y-2.5 mb-6">
          {[["IPFS URL", "ipfs://Qm... or https://ipfs.io/ipfs/..."], ["HTTP URL", "A direct link to any publicly accessible image."], ["NFT reference", "eip155:1/erc721:0xContractAddress/tokenId to use an NFT you own."], ["Data URI", "A base64-encoded image for small avatars."]].map(([type, fmt]) => (
            <div key={type} className="px-4 py-3 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[13px] font-medium mb-1" style={{ color: "rgba(255,255,255,0.8)" }}>{type}</div>
              <code className="text-[11.5px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>{fmt}</code>
            </div>
          ))}
        </div>
        <H2 id="nft-avatar">Using an NFT as your avatar</H2>
        <P>To use an NFT you own as your avatar, set your ENS avatar text record to the NFT reference format. Subframe verifies ownership on-chain before displaying it on your profile.</P>
        <CodeBlock code={`eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1234`} language="ENS avatar record" />
      </>
    ),
  },

  "/docs/ai-wallet": {
    breadcrumb: "AI FEATURES",
    sections: [{ id: "what-it-does", title: "What it does" }, { id: "how", title: "How it works" }, { id: "privacy", title: "Privacy" }],
    content: (
      <>
        <PageTitle icon={BarChart2} title="AI Wallet Analyzer" description="An AI engine that reads your on-chain history and produces a concise behavioral analysis." />
        <H2 id="what-it-does">What it does</H2>
        <P>The AI Wallet Analyzer scans your transaction history, token holdings, DeFi positions, and NFT activity to generate a structured summary of your on-chain behavior. It categorizes you as a trader, collector, builder, or holder based on observed patterns.</P>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {[["Transaction Patterns", "Frequency, counterparties, and contract interactions."], ["Token Portfolio", "ERC-20 holdings and historical balance changes."], ["NFT Activity", "Collection affiliations and trading behavior."], ["DeFi Exposure", "Protocol interactions across lending, DEX, and yield."]].map(([title, desc]) => (
            <div key={title} className="px-4 py-3.5 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[13px] font-medium mb-1" style={{ color: "rgba(255,255,255,0.82)" }}>{title}</div>
              <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.42)" }}>{desc}</div>
            </div>
          ))}
        </div>
        <H2 id="how">How it works</H2>
        <Step number={1} title="On-chain data is fetched">The analyzer pulls transaction history from Ethereum mainnet via indexed node APIs. No third-party analytics service stores your data.</Step>
        <Step number={2} title="Structured prompt is built">The transaction data is formatted into a structured context and passed to the AI model with a behavioral analysis prompt.</Step>
        <Step number={3} title="Analysis is returned">The model returns a structured JSON response with a wallet archetype, key observations, and a short narrative. Results are cached per block height to avoid redundant API calls.</Step>
        <H2 id="privacy">Privacy</H2>
        <P>All analyzed data is public on-chain information. The analyzer does not store your wallet data after the response is generated. Analysis results are cached temporarily by wallet address for performance only.</P>
        <Callout type="info">The AI Wallet Analyzer is available at <a href="/analyze" className="underline underline-offset-2" style={{ color: "#CBFF4D" }}>subframe.network/analyze</a> and does not require a subdomain to use.</Callout>
      </>
    ),
  },

  "/docs/ai-chat": {
    breadcrumb: "AI FEATURES",
    sections: [{ id: "what-is-xmtp", title: "What is XMTP" }, { id: "ai-chat-how", title: "How AI Chat works" }, { id: "encryption", title: "Encryption" }],
    content: (
      <>
        <PageTitle icon={MessageSquare} title="On-chain AI Chat" description="Encrypted on-chain messaging powered by XMTP with an AI assistant accessible from your profile." />
        <H2 id="what-is-xmtp">What is XMTP</H2>
        <P>XMTP (Extensible Message Transport Protocol) is a decentralized messaging protocol for Web3. Messages are end-to-end encrypted, stored on the XMTP network, and tied to Ethereum wallet addresses rather than usernames or email accounts.</P>
        <H2 id="ai-chat-how">How AI Chat works</H2>
        <P>The Subframe AI Chat is an XMTP-based messaging thread between your wallet and an AI assistant operated by the Subframe Protocol. You initiate the conversation from your profile page. All messages are stored decentrally on the XMTP network and visible only to your wallet.</P>
        <Step number={1} title="Enable XMTP">Sign an XMTP identity message with your wallet the first time you open the chat. This creates your XMTP identity key without any gas cost.</Step>
        <Step number={2} title="Send a message">Type any question about your wallet, ENS records, DeFi positions, or the Subframe Protocol. The AI has context about your on-chain state.</Step>
        <Step number={3} title="Receive encrypted replies">Replies are delivered through the XMTP network and decrypted locally in your browser. No Subframe server reads your message contents.</Step>
        <H2 id="encryption">Encryption model</H2>
        <P>All messages use the XMTP v2 encryption scheme based on X3DH (Extended Triple Diffie-Hellman) key agreement. Message contents are encrypted with keys derived from your wallet signature. Only your wallet can decrypt incoming messages.</P>
        <Callout type="success">Your chat history is portable. Any XMTP-compatible client can read your conversation history since it lives on the decentralized XMTP network, not on Subframe servers.</Callout>
      </>
    ),
  },

  "/docs/x-bot": {
    breadcrumb: "BOTS AND INTEGRATIONS",
    sections: [{ id: "planned", title: "Planned features" }],
    content: (
      <>
        <div className="flex items-center gap-3 mb-8">
          <PageTitle icon={Twitter} title="X Bot" description="An automated bot on X (Twitter) that responds to mentions, tracks ENS registrations, and posts wallet insights." />
        </div>
        <div className="flex items-center gap-2 mb-8">
          <Tag color="default">Coming Soon</Tag>
        </div>
        <Callout type="info">The X Bot is in development. This page describes planned functionality and is subject to change before launch.</Callout>
        <H2 id="planned">Planned features</H2>
        <div className="space-y-3">
          {[["Subdomain announcements", "Automatically posts when new subframe.eth subdomains are claimed, growing community visibility."], ["Mention responses", "Reply with your subframe.eth profile card when someone tags @subframeeth in a relevant context."], ["Wallet insight threads", "Daily or weekly threads summarizing notable on-chain activity from the Subframe registry."], ["Claim reminders", "Alert registered users via X DM when their ENS records are approaching expiry."]].map(([title, desc]) => (
            <div key={title} className="px-4 py-4 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[13.5px] font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.82)" }}>{title}</div>
              <div className="text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>{desc}</div>
            </div>
          ))}
        </div>
      </>
    ),
  },

  "/docs/telegram-bot": {
    breadcrumb: "BOTS AND INTEGRATIONS",
    sections: [{ id: "planned", title: "Planned features" }],
    content: (
      <>
        <PageTitle icon={Send} title="Telegram Bot" description="A Telegram bot that delivers real-time ENS and wallet notifications directly to your Telegram account." />
        <div className="flex items-center gap-2 mb-8">
          <Tag color="default">Coming Soon</Tag>
        </div>
        <Callout type="info">The Telegram Bot is in development. This page describes planned functionality and is subject to change before launch.</Callout>
        <H2 id="planned">Planned features</H2>
        <div className="space-y-3">
          {[["Subdomain alerts", "Get notified instantly when a subdomain is claimed or transferred."], ["Wallet activity digest", "Receive a daily summary of your wallet activity and ENS record changes."], ["Claim flow via bot", "Initiate a subdomain claim directly inside Telegram without opening a browser."], ["Community group integration", "Add the bot to your group to share Subframe Protocol updates automatically."]].map(([title, desc]) => (
            <div key={title} className="px-4 py-4 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[13.5px] font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.82)" }}>{title}</div>
              <div className="text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>{desc}</div>
            </div>
          ))}
        </div>
      </>
    ),
  },

  "/docs/messaging": {
    breadcrumb: "BOTS AND INTEGRATIONS",
    sections: [{ id: "planned", title: "Planned integrations" }],
    content: (
      <>
        <PageTitle icon={Inbox} title="Messaging Integrations" description="Cross-platform messaging integrations connecting your subframe.eth identity to Discord, Farcaster, and Lens." />
        <div className="flex items-center gap-2 mb-8">
          <Tag color="default">Coming Soon</Tag>
        </div>
        <Callout type="info">Messaging integrations are planned for a future release. Details will be published here as development progresses.</Callout>
        <H2 id="planned">Planned integrations</H2>
        <div className="space-y-3">
          {[["Discord", "Link your subframe.eth identity to Discord. Display your ENS profile card in servers and receive on-chain alerts via DM."], ["Farcaster", "Publish your Subframe profile as a Farcaster frame. Let other users claim subdomains directly from a cast."], ["Lens Protocol", "Connect your subframe.eth subdomain to a Lens handle. Share wallet insights as Lens publications."], ["Push Protocol", "Opt-in to on-chain push notifications for wallet activity, ENS record changes, and protocol announcements."]].map(([title, desc]) => (
            <div key={title} className="px-4 py-4 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[13.5px] font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.82)" }}>{title}</div>
              <div className="text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>{desc}</div>
            </div>
          ))}
        </div>
      </>
    ),
  },

  "/docs/api": {
    breadcrumb: "DEVELOPERS",
    sections: [{ id: "base-url", title: "Base URL" }, { id: "endpoints", title: "Endpoints" }, { id: "auth", title: "Authentication" }],
    content: (
      <>
        <PageTitle icon={Code2} title="API Reference" description="REST API for reading subdomain data, profiles, and ENS records programmatically." />
        <H2 id="base-url">Base URL</H2>
        <CodeBlock code={`https://api.subframe.network/v1`} language="url" />
        <H2 id="endpoints">Endpoints</H2>
        <ApiEndpoint method="GET" path="/subdomains" description="List all registered subframe.eth subdomains with pagination." />
        <ApiEndpoint method="GET" path="/subdomains/:name" description="Get a single subdomain record by name." />
        <ApiEndpoint method="GET" path="/subdomains/:name/profile" description="Get the full profile including ENS records and wallet data." />
        <ApiEndpoint method="GET" path="/subdomains/:name/analysis" description="Get the AI wallet analysis for a subdomain." />
        <ApiEndpoint method="POST" path="/subdomains/claim" description="Initiate a gasless subdomain claim (requires signature)." />
        <ApiEndpoint method="GET" path="/stats" description="Get global registry statistics." />
        <H2 id="auth">Authentication</H2>
        <P>Public read endpoints require no authentication. The claim endpoint requires a valid EIP-712 signature from the wallet that is claiming the subdomain. Pass the signature in the request body.</P>
        <CodeBlock code={`curl https://api.subframe.network/v1/subdomains/vitalik\n  -H "Accept: application/json"`} language="curl" />
        <CodeBlock code={`{\n  "name": "vitalik",\n  "owner": "0x...",\n  "registered": "2024-01-15T00:00:00Z",\n  "ens": {\n    "avatar": "https://...",\n    "description": "...",\n    "url": "https://..."\n  }\n}`} language="json" />
      </>
    ),
  },

  "/docs/ens-api": {
    breadcrumb: "DEVELOPERS",
    sections: [{ id: "reading", title: "Reading ENS records" }, { id: "resolver", title: "Resolver contract" }],
    content: (
      <>
        <PageTitle icon={FileCode} title="ENS Records API" description="Read ENS text records from subframe.eth subdomains via the public API or directly from the ENS resolver contract." />
        <H2 id="reading">Reading ENS records via API</H2>
        <ApiEndpoint method="GET" path="/subdomains/:name/ens" description="Get all ENS text records for a subdomain." />
        <CodeBlock code={`curl https://api.subframe.network/v1/subdomains/alice/ens\n\n# Response\n{\n  "display": "Alice",\n  "avatar": "ipfs://Qm...",\n  "description": "Ethereum developer",\n  "url": "https://alice.xyz",\n  "com.twitter": "alice",\n  "com.github": "alice"\n}`} language="curl" />
        <H2 id="resolver">Reading directly from the resolver contract</H2>
        <P>ENS records are stored in the public ENS resolver contract on Ethereum mainnet. You can read them directly using any Ethereum client library without going through the Subframe API.</P>
        <CodeBlock code={`import { createPublicClient, http } from 'viem'\nimport { mainnet } from 'viem/chains'\n\nconst client = createPublicClient({\n  chain: mainnet,\n  transport: http()\n})\n\nconst avatar = await client.getEnsText({\n  name: 'alice.subframe.eth',\n  key: 'avatar',\n})`} language="typescript" />
      </>
    ),
  },

  "/docs/webhooks": {
    breadcrumb: "DEVELOPERS",
    sections: [{ id: "events", title: "Event types" }, { id: "payload", title: "Payload format" }, { id: "verify", title: "Verification" }],
    content: (
      <>
        <PageTitle icon={Webhook} title="Webhooks" description="Receive HTTP callbacks when subdomains are claimed, transferred, or updated." />
        <Callout type="info">Webhook registration is available via the developer portal. API key access is required.</Callout>
        <H2 id="events">Event types</H2>
        <div className="space-y-2.5 mb-6">
          {[["subdomain.claimed", "A new subdomain was successfully registered."], ["subdomain.transferred", "Ownership of a subdomain changed."], ["subdomain.records_updated", "ENS text records were updated."], ["subdomain.ipfs_pinned", "The IPFS content hash was updated."]].map(([event, desc]) => (
            <div key={event} className="flex gap-3 items-center px-4 py-3 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <code className="text-[11.5px] font-mono px-2 py-0.5 rounded flex-shrink-0" style={{ background: "rgba(203,255,77,0.08)", color: "#CBFF4D" }}>{event}</code>
              <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.5)" }}>{desc}</span>
            </div>
          ))}
        </div>
        <H2 id="payload">Payload format</H2>
        <CodeBlock code={`{\n  "event": "subdomain.claimed",\n  "timestamp": "2025-01-15T12:00:00Z",\n  "data": {\n    "name": "alice",\n    "owner": "0x...",\n    "txHash": "0x..."\n  }\n}`} language="json" />
        <H2 id="verify">Verifying webhook signatures</H2>
        <P>Each webhook POST includes an <code className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)" }}>X-Subframe-Signature</code> header containing an HMAC-SHA256 digest of the request body signed with your webhook secret.</P>
        <CodeBlock code={`import crypto from 'crypto'\n\nfunction verify(body: string, signature: string, secret: string) {\n  const expected = crypto\n    .createHmac('sha256', secret)\n    .update(body)\n    .digest('hex')\n  return crypto.timingSafeEqual(\n    Buffer.from(signature),\n    Buffer.from(expected)\n  )\n}`} language="typescript" />
      </>
    ),
  },

  "/docs/art-protocol": {
    breadcrumb: "ART PROTOCOL",
    sections: [
      { id: "overview", title: "Overview" },
      { id: "how-it-works", title: "How it works" },
      { id: "token-standard", title: "Token standard" },
      { id: "fees", title: "Fee structure" },
    ],
    content: (
      <>
        <PageTitle icon={Layers} title="Art Protocol" description="Every profile image on Subframe automatically becomes a tradable ERC-1155 edition on a bonding curve with built-in creator royalties." />
        <Callout type="success">Subframe Protocol pays all gas fees for token creation. Creators pay nothing.</Callout>
        <H2 id="overview">Overview</H2>
        <P>When you upload a profile image during the claim flow, Subframe Protocol mints a unique ERC-1155 token ID on the shared SubframeArtProtocol contract. The token is immediately available for minting on a bonding curve by anyone.</P>
        <P>Your image is stored permanently on IPFS and attached to the token metadata. The token ID references your ENS subdomain so ownership and creator identity are fully on-chain and verifiable.</P>
        <H2 id="how-it-works">How it works</H2>
        {[
          ["Upload image", "Upload any JPG, PNG, WebP, or GIF during the claim step. Subframe stores it on IPFS and uses the CID as token URI."],
          ["Edition created", "The protocol calls createArt on the SubframeArtProtocol contract, issuing a new token ID with your wallet as the creator address."],
          ["Bonding curve goes live", "Price starts at 0.001 ETH and rises by 0.0001 ETH per edition minted. Anyone can mint or burn at the exact on-chain price at any time."],
          ["Fees flow forever", "Every mint or burn triggers a 1% fee split: 0.5% to your wallet, 0.5% to the protocol treasury."],
        ].map(([label, desc], i) => (
          <Step key={label} number={i + 1} title={label}>
            {desc}
          </Step>
        ))}
        <H2 id="token-standard">Token standard</H2>
        <P>Art editions follow the ERC-1155 multi-token standard. All editions share a single contract deployed by the protocol. Each creator gets a unique token ID within that contract. This design keeps deployment costs near zero and allows batch operations.</P>
        <Callout type="info">Price is fully deterministic. mintPrice(tokenId) and burnPayout(tokenId) can be read on-chain at any time without relying on any oracle or off-chain service.</Callout>
        <H2 id="fees">Fee structure</H2>
        <div className="space-y-3 mb-6">
          {[
            ["Mint fee", "1% of the mint price is deducted on every edition minted."],
            ["Burn fee", "1% of the burn payout is deducted on every edition burned."],
            ["Creator share", "0.5% goes directly to the creator wallet address on every mint and burn."],
            ["Protocol share", "0.5% goes to the Subframe Protocol treasury."],
            ["Deployment gas", "Zero. Subframe Protocol covers all contract and token creation gas."],
          ].map(([label, desc]) => (
            <div key={label} className="flex gap-3 px-4 py-3.5 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#CBFF4D" }} />
              <div>
                <div className="text-[13.5px] font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.85)" }}>{label}</div>
                <div className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.42)" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </>
    ),
  },

  "/docs/art-trading": {
    breadcrumb: "ART PROTOCOL",
    sections: [
      { id: "trading", title: "Minting and burning" },
      { id: "curve", title: "Bonding curve" },
      { id: "royalties", title: "Creator royalties" },
    ],
    content: (
      <>
        <PageTitle icon={BarChart2} title="Minting, Burning, and Fees" description="How art editions are minted and burned on the bonding curve and how creator royalties are distributed." />
        <H2 id="trading">Minting and burning editions</H2>
        <P>Each art edition has a live mint price and burn payout derived from the bonding curve. Anyone can mint a new edition by sending the exact ETH amount shown on the profile page. Anyone who holds an edition can burn it to receive back the current burn payout in ETH.</P>
        <P>All minting and burning happens directly through the SubframeArtProtocol smart contract on Ethereum mainnet. The profile page exposes Buy and Sell buttons with live prices pulled from the contract.</P>
        <H2 id="curve">Bonding curve mechanics</H2>
        <P>The price model is a linear bonding curve with a base price of 0.001 ETH and an increment of 0.0001 ETH per edition in circulation.</P>
        <CodeBlock code={`mintPrice  = 0.001 + (supply * 0.0001) ETH\nburnPayout = mintPrice - 1% fee`} language="formula" />
        <P>Price rises as more editions are minted and falls as editions are burned. There is no liquidity pool and no external market maker. The contract itself is the market.</P>
        <Callout type="info">Because price is determined by supply alone, minting and burning are always available regardless of market conditions. There is no slippage and no liquidity risk.</Callout>
        <H2 id="royalties">Creator royalties</H2>
        <P>Royalties are trustless and automatic. The creator address is recorded at token creation time and cannot be changed. Every mint or burn sends 0.5% of the transaction value directly to the creator wallet. No claim step is needed. No platform intermediary holds the funds.</P>
      </>
    ),
  },

  "/docs/rate-limits": {
    breadcrumb: "DEVELOPERS",
    sections: [{ id: "limits", title: "Rate limits" }, { id: "headers", title: "Rate limit headers" }],
    content: (
      <>
        <PageTitle icon={Shield} title="Rate Limits" description="API rate limits and how to handle 429 responses." />
        <H2 id="limits">Rate limits by endpoint</H2>
        <div className="space-y-2.5 mb-6">
          {[["Public read endpoints", "100 requests per minute per IP."], ["Authenticated endpoints", "300 requests per minute per API key."], ["Claim endpoint", "5 requests per hour per wallet address."], ["AI analysis endpoint", "20 requests per hour per API key."]].map(([endpoint, limit]) => (
            <div key={endpoint} className="flex items-start justify-between gap-4 px-4 py-3 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.72)" }}>{endpoint}</span>
              <span className="text-[12px] flex-shrink-0 font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>{limit}</span>
            </div>
          ))}
        </div>
        <H2 id="headers">Rate limit headers</H2>
        <P>Every API response includes rate limit information in the headers so you can manage your request budget proactively.</P>
        <CodeBlock code={`X-RateLimit-Limit: 100\nX-RateLimit-Remaining: 87\nX-RateLimit-Reset: 1705320000`} language="response headers" />
        <Callout type="warning">Exceeding rate limits returns HTTP 429. Implement exponential backoff when retrying. The Retry-After header indicates when to resume requests.</Callout>
      </>
    ),
  },
};

function useActiveSection(sections: DocSection[]) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  useEffect(() => {
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);
  return active;
}

export default function Docs() {
  const [location] = useLocation();
  const page = PAGES[location] ?? PAGES["/docs"];
  const activeSection = useActiveSection(page.sections);

  return (
    <DocsLayout
      currentPath={location}
      rightSections={page.sections}
      activeSection={activeSection}
      breadcrumb={page.breadcrumb}
    >
      {page.content}
    </DocsLayout>
  );
}
