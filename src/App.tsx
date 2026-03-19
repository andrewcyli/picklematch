import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ShellProvider } from "@/shell";
import { Trophy, Users } from "lucide-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Variant pages (lazy loaded for code splitting)
import { lazy, Suspense } from "react";

const VariantSelector = lazy(() => import("@/shell/VariantSelector"));
const PrototypeLab = lazy(() => import("@/prototypes/PrototypeLab"));
const PreviewPlaceholder = lazy(() => import("@/prototypes/PreviewPlaceholder"));
const ClubhousePrototype = lazy(() => import("@/prototypes/clubhouse/ClubhousePrototype"));
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
                <Route
                  path="/arena/*"
                  element={
                    <PreviewPlaceholder
                      eyebrow="Arena prototype"
                      title="Arena — event-night intensity on top of tournament logic"
                      description="This route stakes out the tournament-first product direction: broadcast visuals, bracket hero moments, and live-score framing. The current tournament engine is already available underneath while the dedicated shell remains to be built."
                      accentClassName="from-zinc-950 via-zinc-800 to-lime-500"
                      icon={Trophy}
                      foundationPath="/tournament/"
                      foundationLabel="/tournament/"
                      built={[
                        "Dedicated preview route for the Arena concept",
                        "Product positioning and shell direction separated from scheduling-mode routing",
                        "Clear handoff to the existing tournament foundation for functional testing",
                      ]}
                      remaining={[
                        "Broadcast-first bracket shell",
                        "Live scoreboard hero and large-format scoring interactions",
                        "Seeding, winner celebration, and spectator-specific views",
                      ]}
                    />
                  }
                />
                <Route
                  path="/quick-court/*"
                  element={
                    <PreviewPlaceholder
                      eyebrow="Quick Court prototype"
                      title="Quick Court — drop-in speed and minimal friction"
                      description="This route defines the low-friction, spontaneous-play direction. The current classic engine remains the practical functional base while the streamlined linear shell and court-first interaction model are built next."
                      accentClassName="from-slate-200 via-white to-slate-500"
                      icon={Users}
                      foundationPath="/classic/"
                      foundationLabel="/classic/"
                      built={[
                        "Dedicated preview route for the Quick Court concept",
                        "A separate product story from Clubhouse and Arena",
                        "Direct path to the existing round-robin foundation for behavior validation",
                      ]}
                      remaining={[
                        "Linear 3-step shell with no persistent nav",
                        "One-court-first cards and waitlist promotion UX",
                        "Faster player entry and end-of-session summary flow",
                      ]}
                    />
                  }
                />
                
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
