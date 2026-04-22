import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { wagmiAdapter } from "@/lib/web3";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import Claim from "@/pages/claim";
import Onboarding from "@/pages/onboarding";
import Profile, { StandaloneProfile } from "@/pages/profile";
import Explore from "@/pages/explore";
import Analyze from "@/pages/analyze";
import EnsIdentity from "@/pages/ens-identity";
import AiAnalysis from "@/pages/ai-analysis";
import AiChat from "@/pages/ai-chat";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

// When served from an ENS gateway (e.g. subframe.eth.limo), show only the
// standalone profile dashboard with no app navigation.
const isEnsDomain =
  typeof window !== "undefined" &&
  window.location.hostname.endsWith(".eth.limo");

const withLayout = (Component: React.ComponentType<any>) =>
  (props: any) => <Layout><Component {...props} /></Layout>;

function Router() {
  if (isEnsDomain) {
    return (
      <Switch>
        <Route path="/:name" component={StandaloneProfile} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={withLayout(Home)} />
      <Route path="/claim" component={withLayout(Claim)} />
      <Route path="/onboarding/:name" component={withLayout(Onboarding)} />
      <Route path="/profile/:name" component={withLayout(Profile)} />
      <Route path="/explore" component={withLayout(Explore)} />
      <Route path="/analyze" component={withLayout(Analyze)} />
      <Route path="/ens-identity" component={withLayout(EnsIdentity)} />
      <Route path="/ai-analysis" component={withLayout(AiAnalysis)} />
      <Route path="/ai-chat" component={withLayout(AiChat)} />
      <Route path="/:name" component={StandaloneProfile} />
      <Route component={withLayout(NotFound)} />
    </Switch>
  );
}

function App() {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
