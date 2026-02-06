import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { loadGameConfigOverrides } from "@/lib/game/gameConfigLoader";
import { fetchStoryChapters } from "@/lib/game/storyMode";
import { ApplyAppSettings } from "@/components/ApplyAppSettings";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const init = async () => {
      try {
        await loadGameConfigOverrides();
      } catch {
        // Config overrides are optional; app works with defaults
      }
      try {
        await fetchStoryChapters();
      } catch {
        // Story chapters fallback to static; app works
      }
    };
    init();
  }, []);

  useEffect(() => {
    const onUnhandled = (e: PromiseRejectionEvent) => {
      if (typeof console !== 'undefined' && console.error) {
        console.error('[Unhandled Rejection]', e.reason);
      }
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => window.removeEventListener('unhandledrejection', onUnhandled);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ApplyAppSettings />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          {/* נגישות: קישור דילוג לתוכן ראשי (חוק שוויון זכויות לאנשים עם מוגבלות) */}
          <a href="#main-content" className="skip-link">
            דילוג לתוכן ראשי
          </a>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin" element={<Admin />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
