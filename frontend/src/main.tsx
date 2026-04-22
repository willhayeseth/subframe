import { createRoot } from "react-dom/client";
import "./lib/web3";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// When served from IPFS / ENS domain, API calls must use an absolute URL
// because there is no backend co-located with the static site.
const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
if (apiBase) {
  setBaseUrl(apiBase);
}

createRoot(document.getElementById("root")!).render(<App />);
