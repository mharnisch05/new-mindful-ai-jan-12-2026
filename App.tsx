import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { RoleProvider } from "./contexts/RoleContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { DemoModeProvider } from "./contexts/DemoModeContext";
import { NotificationBanner } from "@/components/NotificationBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardLayout } from "./components/DashboardLayout";
// Lazy load pages for better performance
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Appointments = lazy(() => import("./pages/Appointments"));
const ProgressPaths = lazy(() => import("./pages/ProgressPaths"));
const Notes = lazy(() => import("./pages/Notes"));
const Billing = lazy(() => import("./pages/Billing"));
const Settings = lazy(() => import("./pages/Settings"));
const Messages = lazy(() => import("./pages/Messages"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const ClientSettings = lazy(() => import("./pages/ClientSettings"));
const Landing = lazy(() => import("./pages/Landing"));
const Pricing = lazy(() => import("./pages/Pricing"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ClientPortalAccess = lazy(() => import("./pages/ClientPortalAccess"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminPortal = lazy(() => import("./pages/AdminPortal"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutCancel = lazy(() => import("./pages/CheckoutCancel"));
const HipaaCompliance = lazy(() => import("./pages/HipaaCompliance"));

// Lazy load Assistant with ErrorBoundary
const Assistant = lazy(async () => {
  const [assistantModule, errorBoundaryModule] = await Promise.all([
    import("./pages/Assistant"),
    import("@/components/AssistantErrorBoundary")
  ]);
  const OriginalAssistant = assistantModule.default;
  const { AssistantErrorBoundary } = errorBoundaryModule;
  return {
    default: () => (
      <AssistantErrorBoundary>
        <OriginalAssistant />
      </AssistantErrorBoundary>
    )
  };
});

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Card className="p-8 max-w-sm w-full">
      <div className="space-y-4">
        <div className="h-12 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded animate-pulse" />
        <div className="h-12 bg-muted rounded animate-pulse" />
      </div>
    </Card>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <SubscriptionProvider>
          <DemoModeProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <NotificationBanner />
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/admin" element={<AdminPortal />} />
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />
                  <Route element={<DashboardLayout />}>
                    <Route path="/assistant" element={<Assistant />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/clients/:id" element={<ClientDetail />} />
                    <Route path="/appointments" element={<Appointments />} />
                    <Route path="/appointments/new" element={<Appointments />} />
                    <Route path="/progress-paths" element={<ProgressPaths />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/notes" element={<Notes />} />
                    <Route path="/soap-notes/new" element={<Notes />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/invoices/new" element={<Billing />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                  <Route path="/client-portal" element={<ClientPortal />} />
                  <Route path="/client-settings" element={<ClientSettings />} />
                  <Route path="/client-portal-access" element={<ClientPortalAccess />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/checkout/success" element={<CheckoutSuccess />} />
                  <Route path="/checkout/cancel" element={<CheckoutCancel />} />
                  <Route path="/hipaa-compliance" element={<HipaaCompliance />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
            </TooltipProvider>
          </DemoModeProvider>
        </SubscriptionProvider>
      </RoleProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
