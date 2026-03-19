import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Sparkles, TimerReset, Trophy, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const prototypes = [
  {
    title: "Clubhouse",
    path: "/clubhouse/",
    icon: Building2,
    tone: "Warm, community-first, recurring-session energy.",
    bullets: ["Player cards and club language", "Ladder instead of generic standings", "Session-first shell on top of round-robin logic"],
    accent: "from-amber-500 via-orange-500 to-emerald-600",
  },
  {
    title: "Arena",
    path: "/arena/",
    icon: Trophy,
    tone: "Event-first, bracket-heavy, broadcast-night aesthetic.",
    bullets: ["Full-screen tournament framing", "Scoreboard/broadcast direction", "Hooks into current tournament engine"],
    accent: "from-zinc-900 via-zinc-700 to-lime-500",
  },
  {
    title: "Quick Court",
    path: "/quick-court/",
    icon: TimerReset,
    tone: "Minimal, fast, drop-in, low-friction operations.",
    bullets: ["3-tap start positioning", "Linear flow direction", "Planned lightweight court/queue shell"],
    accent: "from-slate-300 via-white to-slate-500",
  },
];

const PrototypeLab: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_30%),linear-gradient(180deg,#1f1a14_0%,#120f0d_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80">
            <Sparkles className="h-4 w-4 text-amber-300" />
            PickleMatch prototype lab
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Three product directions, one codebase.</h1>
          <p className="mt-4 text-base leading-7 text-white/70 sm:text-lg">
            These routes are for Andrew to compare distinct UX personalities without touching the underlying scheduling, scoring,
            realtime sync, or game-code flow. Clubhouse is the first high-signal build. Arena and Quick Court now have dedicated preview routes and positioning shells.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {prototypes.map((prototype) => {
            const Icon = prototype.icon;
            return (
              <Card
                key={prototype.title}
                className="border-white/10 bg-white/5 p-6 text-white backdrop-blur-xl"
              >
                <div className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br ${prototype.accent} p-3 shadow-2xl`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-semibold">{prototype.title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/70">{prototype.tone}</p>
                <ul className="mt-5 space-y-3 text-sm text-white/80">
                  {prototype.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-300" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" onClick={() => navigate(prototype.path)}>
                  Open preview
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card className="border-white/10 bg-white/5 p-5 text-white backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-amber-300" />
              <h3 className="font-semibold">What stays shared</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Supabase game records, join codes, player identity, notifications, scheduling engines, match scoring, and responsive primitives.
            </p>
          </Card>
          <Card className="border-white/10 bg-white/5 p-5 text-white backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-amber-300" />
              <h3 className="font-semibold">What changes per prototype</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Positioning, copy, visual hierarchy, navigation model, default framing, and which organizer/player behaviors are emphasized.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrototypeLab;
