import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/auth/AuthProvider";

import Home from "@/pages/home";
import GradeConverter from "@/pages/grade-converter";
import SessionLogger from "@/pages/session-logger";
import SessionDetail from "@/pages/session-detail";
import Progress from "@/pages/progress";
import GymDashboard from "@/pages/gym-dashboard";
import PartnerFinder from "@/pages/partner-finder";
import Inbox from "@/pages/inbox";
import Beginner from "@/pages/beginner";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/grades" component={GradeConverter} />
      <Route path="/sessions" component={SessionLogger} />
      <Route path="/sessions/:id" component={SessionDetail} />
      <Route path="/progress" component={Progress} />
      <Route path="/gyms" component={GymDashboard} />
      <Route path="/partners" component={PartnerFinder} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/beginner" component={Beginner} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
