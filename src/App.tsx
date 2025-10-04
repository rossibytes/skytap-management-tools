// Skytap Management Console - Main Application Component
// This is the root component that sets up routing, state management, and UI providers

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Page imports - organized by category
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TrainingEnvironments from "./pages/TrainingEnvironments";
import PartnerEnvironments from "./pages/PartnerEnvironments";
import PartnerDeploy from "./pages/PartnerDeploy";
import PartnerPortals from "./pages/PartnerPortals";
import GeneralUtilities from "./pages/GeneralUtilities";
import ProjectCleaner from "./pages/utilities/ProjectCleaner";
import IpManagement from "./pages/utilities/IpManagement";
import Billing from "./pages/utilities/Billing";
import Users from "./pages/utilities/Users";
import CostCalculator from "./pages/utilities/CostCalculator";
import Usage from "./pages/utilities/Usage";
import RunningNow from "./pages/utilities/RunningNow";

// Initialize React Query client for API state management
const queryClient = new QueryClient();

/**
 * Main App Component
 * 
 * Sets up the application with:
 * - React Query for API state management
 * - Tooltip provider for UI components
 * - Toast notifications (both shadcn/ui and Sonner)
 * - React Router for navigation
 * - All application routes organized by category
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Toast notification systems */}
      <Toaster />
      <Sonner />
      
      <BrowserRouter>
        <Routes>
          {/* Main landing page */}
          <Route path="/" element={<Index />} />
          
          {/* Training environment management */}
          <Route path="/training" element={<TrainingEnvironments />} />
          
          {/* Partner environment management */}
          <Route path="/partner" element={<PartnerEnvironments />} />
          <Route path="/partner/deploy" element={<PartnerDeploy />} />
          <Route path="/partner/portals" element={<PartnerPortals />} />
          
          {/* General utilities and tools */}
          <Route path="/utilities" element={<GeneralUtilities />} />
          <Route path="/utilities/project-cleaner" element={<ProjectCleaner />} />
          <Route path="/utilities/ip-management" element={<IpManagement />} />
          <Route path="/utilities/billing" element={<Billing />} />
          <Route path="/utilities/users" element={<Users />} />
          <Route path="/utilities/cost-calculator" element={<CostCalculator />} />
          <Route path="/utilities/usage" element={<Usage />} />
          <Route path="/utilities/running-now" element={<RunningNow />} />
          
          {/* Catch-all route for 404 errors - must be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
