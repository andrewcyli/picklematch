import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gauge, ListChecks, MoveRight, TimerReset, Users, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const QuickCourtPrototype: React.FC = () => {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/prototypes" className="text-sm text-slate-500 transition hover:text-slate-900">← Back to prototype lab</Link>

        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <Badge className="border-0 bg-slate-900 text-white">Quick Court prototype</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Fastest path from arrival to first ball.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Same classic round-robin foundation underneath. Different product posture: fewer surfaces, linear decisions,
            one-court-first orchestration, and almost no admin ceremony.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/classic/">
                Open classic foundation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/clubhouse/">Compare against Clubhouse</Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <Zap className="h-5 w-5" />
              <h2 className="text-lg font-semibold">1. Gather</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Add whoever is physically here. No ladder language, no club framing, no bracket story.</p>
          </Card>
          <Card className="border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <MoveRight className="h-5 w-5" />
              <h2 className="text-lg font-semibold">2. Queue</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Show one live court and one next matchup. Everything else stays tucked away until needed.</p>
          </Card>
          <Card className="border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <TimerReset className="h-5 w-5" />
              <h2 className="text-lg font-semibold">3. Rotate</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Confirm score, promote next game, repeat. End-of-session summary can stay lightweight.</p>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Card className="border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-slate-900">
              <Gauge className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Session screen concept</h2>
            </div>
            <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Live court</div>
                  <div className="mt-2 text-3xl font-semibold">Court A</div>
                  <div className="mt-2 text-slate-600">Maya + Theo vs Jules + Iris</div>
                </div>
                <div className="rounded-3xl bg-slate-900 px-5 py-4 text-white">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/60">Tap to score</div>
                  <div className="mt-2 text-3xl font-semibold">11 - 8</div>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Next on court</div>
                <div className="mt-2 text-sm font-medium text-slate-900">Chris + Rowan vs Liv + Anya</div>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-slate-900">
              <ListChecks className="h-5 w-5" />
              <h2 className="text-lg font-semibold">What differentiates it</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>• Minimal persistent nav; step-by-step flow instead</li>
              <li>• One-court-first hierarchy before broader scheduling detail</li>
              <li>• Queue and waitlist logic feel more like pickup play</li>
              <li>• Faster setup, lighter wrap-up, less “system” language</li>
            </ul>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-900"><Users className="h-4 w-4" /> Player count</div>
                <div className="mt-2 text-sm text-slate-600">Tuned for drop-in groups, not recurring members.</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-900"><Zap className="h-4 w-4" /> Interaction style</div>
                <div className="mt-2 text-sm text-slate-600">Compressed actions and fewer competing panels.</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuickCourtPrototype;
