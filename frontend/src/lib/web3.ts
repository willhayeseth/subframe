import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet, sepolia } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

const projectId = "bb516f085af6a8792f69e7a504773208";

export const networks = [mainnet, sepolia] as [AppKitNetwork, ...AppKitNetwork[]];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "Subframe Protocol",
    description: "Claim your permanent name.subframe.eth ENS subdomain",
    url: typeof window !== "undefined" ? window.location.origin : "https://subframe.eth",
    icons: ["/logo-icon-transparent.png"],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#CBFF4D",
    "--w3m-color-mix": "#0C0C0C",
    "--w3m-color-mix-strength": 40,
    "--w3m-border-radius-master": "12px",
    "--w3m-font-family": "Inter, sans-serif",
  },
});
