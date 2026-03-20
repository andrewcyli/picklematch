import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ShellProvider } from "@/shell";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Variant pages (lazy loaded for code splitting)
import { lazy, Suspense } from "react";

const VariantSelector = lazy(() => import("@/shell/VariantSelector"));
const PrototypeLab = lazy(() => import("@/prototypes/PrototypeLab"));
const ClubhousePrototype = lazy(() => import("@/prototypes/clubhouse/ClubhousePrototype"));
const ArenaPrototype = lazy(() => import("@/prototypes/ArenaPrototype"));
const QuickCourtPrototype = lazy(() => import("@/prototypes/QuickCourtPrototype"));
const ClassicVariant = lazy(() => import("@/variants/classic/ClassicVariant"));
const TournamentVariant = lazy(() => import("@/variants/tournament/TournamentVariant"));
const QualifierVariant = lazy(() => import("@/variants/qualifier/QualifierVariant"));

const queryClient = new QueryClient();

// Loading fallback for lazy-loaded components
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20">
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 animate-pulse">
        <span className="text-2xl">🎾</span>
      </div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ShellProvider initialVariant="classic">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Legacy root - preserves existing behavior for backward compatibility */}
                <Route path="/" element={<Index />} />
                
                {/* Existing scheduling-mode selector */}
                <Route path="/start" element={<VariantSelector />} />

                {/* UX prototype lab */}
                <Route path="/prototypes" element={<PrototypeLab />} />
                <Route path="/clubhouse/*" element={<ClubhousePrototype />} />
                <Route path="/arena/*" element={<ArenaPrototype />} />
                <Route path="/quick-court/*" element={<QuickCourtPrototype />} />
                
                {/* Scheduling-mode foundations */}
                <Route path="/classic/*" element={<ClassicVariant />} />
                <Route path="/tournament/*" element={<TournamentVariant />} />
                <Route path="/qualifier/*" element={<QualifierVariant />} />
                
                {/* Shortcut redirects for common paths */}
                <Route path="/play" element={<Navigate to="/classic/" replace />} />
                <Route path="/game" element={<Navigate to="/classic/" replace />} />
                <Route path="/new" element={<Navigate to="/prototypes" replace />} />
                
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ShellProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
