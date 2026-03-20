import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mic2, Radar, ScanLine, Swords, Trophy, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ArenaPrototype: React.FC = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(132,204,22,0.18),_transparent_28%),linear-gradient(180deg,#111315_0%,#080909_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/prototypes" className="text-sm text-white/60 transition hover:text-white">← Back to prototype lab</Link>

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(132,204,22,0.12))] p-8 shadow-2xl">
          <Badge className="border-0 bg-lime-400/20 text-lime-200">Arena prototype</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Event-night session control.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/75 sm:text-lg">
            Same tournament foundation underneath. Different on top: broadcast hierarchy, featured court focus, louder score moments,
            and a control room that feels built for a hosted event.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/tournament/">
                Open tournament foundation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/clubhouse/">Compare against Clubhouse</Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/10 bg-white/5 p-6 text-white backdrop-blur-xl">
            <div className="flex items-center gap-3 text-lime-300">
              <Trophy className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Featured match first</h2>
            </div>
            <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">Center court • live now</div>
                  <div className="mt-2 text-3xl font-semibold">Semifinal 2</div>
                  <div className="mt-2 text-white/70">Maya + Jules vs Theo + Iris</div>
                </div>
                <div className="rounded-3xl border border-lime-400/20 bg-lime-400/10 px-4 py-3 text-right">
                  <div className="text-xs uppercase tracking-[0.18em] text-lime-200/75">Scoreline</div>
                  <div className="mt-2 text-4xl font-semibold">9 - 7</div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/50">Next on stream</div>
                  <div className="mt-2 font-medium">Final</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/50">Commentary cue</div>
                  <div className="mt-2 font-medium">Winner secures final seed</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/50">Audience state</div>
                  <div className="mt-2 font-medium">Crowd building</div>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/10 bg-white/5 p-6 text-white backdrop-blur-xl">
              <div className="flex items-center gap-3 text-lime-300">
                <Radar className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Control room stack</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-white/75">
                <li>• Featured court pinned above everything else</li>
                <li>• Big score entry moments, not tiny inline cards</li>
                <li>• Bracket advancement and seeding surfaced in-session</li>
                <li>• Spectator/broadcast language instead of organizer language</li>
              </ul>
            </Card>

            <Card className="border-white/10 bg-white/5 p-6 text-white backdrop-blur-xl">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-black/30 p-4">
                  <div className="flex items-center gap-2 text-lime-300"><Swords className="h-4 w-4" /> Challenger court</div>
                  <div className="mt-2 text-sm text-white/70">Quarterfinal cleanup and warm-up queue.</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-4">
                  <div className="flex items-center gap-2 text-lime-300"><ScanLine className="h-4 w-4" /> Bracket feed</div>
                  <div className="mt-2 text-sm text-white/70">Live impact of every completed match.</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-4">
                  <div className="flex items-center gap-2 text-lime-300"><Mic2 className="h-4 w-4" /> Host prompts</div>
                  <div className="mt-2 text-sm text-white/70">Celebrate winners, call players forward.</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-4">
                  <div className="flex items-center gap-2 text-lime-300"><Users className="h-4 w-4" /> Spectator mode</div>
                  <div className="mt-2 text-sm text-white/70">Clearer from the sideline than the classic UI.</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArenaPrototype;
