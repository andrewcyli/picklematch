import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Match } from "@/lib/scheduler";
import { validatePlayerName } from "@/lib/validation";
import { Check, Link2, Plus, Sparkles, Unlink, UserMinus, Users, X, Zap } from "lucide-react";
import { toast } from "sonner";

interface PlayerSetupProps {
  onPlayersChange?: (
    players: string[],
    teammatePairs?: {
      player1: string;
      player2: string;
    }[]
  ) => void;
  onComplete: (
    players: string[],
    teammatePairs?: {
      player1: string;
      player2: string;
    }[]
  ) => void;
  initialPlayers?: string[];
  initialTeammatePairs?: {
    player1: string;
    player2: string;
  }[];
  matches?: Match[];
  matchScores?: Map<string, { team1: number; team2: number }>;
  hasStartedMatches?: boolean;
  minimumPlayersRequired?: number;
}

const parseBulkNames = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );

export const PlayerSetup = ({
  onPlayersChange,
  onComplete,
  initialPlayers = [],
  initialTeammatePairs = [],
  hasStartedMatches = false,
  minimumPlayersRequired = 2,
}: PlayerSetupProps) => {
  const [players, setPlayers] = useState<string[]>(initialPlayers);
  const [currentName, setCurrentName] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [teammatePairs, setTeammatePairs] = useState<{ player1: string; player2: string }[]>(initialTeammatePairs);
  const [selectedForPairing, setSelectedForPairing] = useState<string | null>(null);

  useEffect(() => setPlayers(initialPlayers), [initialPlayers]);
  useEffect(() => setTeammatePairs(initialTeammatePairs), [initialTeammatePairs]);

  const bulkParsed = useMemo(() => parseBulkNames(bulkNames), [bulkNames]);

  const pairCount = teammatePairs.length;
  const ready = players.length >= minimumPlayersRequired;

  const syncPlayers = (updatedPlayers: string[], updatedPairs = teammatePairs) => {
    setPlayers(updatedPlayers);
    onPlayersChange?.(updatedPlayers, updatedPairs);
  };

  const addPlayer = () => {
    const trimmedName = currentName.trim();
    if (!trimmedName) return;

    const validation = validatePlayerName(trimmedName);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid player name");
      return;
    }

    if (players.some((player) => player.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("That player is already in the roster");
      return;
    }

    syncPlayers([...players, trimmedName]);
    setCurrentName("");
  };

  const addBulkPlayers = () => {
    const additions: string[] = [];

    for (const name of bulkParsed) {
      const validation = validatePlayerName(name);
      if (!validation.valid) continue;
      if (players.some((player) => player.toLowerCase() === name.toLowerCase())) continue;
      if (additions.some((player) => player.toLowerCase() === name.toLowerCase())) continue;
      additions.push(name);
    }

    if (additions.length === 0) {
      toast.error("No new valid names to add");
      return;
    }

    syncPlayers([...players, ...additions]);
    setBulkNames("");
    toast.success(`${additions.length} player${additions.length === 1 ? "" : "s"} added`);
  };

  const removePlayer = (playerToRemove: string) => {
    const updatedPlayers = players.filter((player) => player !== playerToRemove);
    const updatedPairs = teammatePairs.filter((pair) => pair.player1 !== playerToRemove && pair.player2 !== playerToRemove);

    setTeammatePairs(updatedPairs);
    if (selectedForPairing === playerToRemove) setSelectedForPairing(null);
    syncPlayers(updatedPlayers, updatedPairs);
  };

  const removePair = (pair: { player1: string; player2: string }) => {
    const updatedPairs = teammatePairs.filter((p) => !(p.player1 === pair.player1 && p.player2 === pair.player2));
    setTeammatePairs(updatedPairs);
    onPlayersChange?.(players, updatedPairs);
    toast.success("Pair removed");
  };

  const isPaired = (player: string) => teammatePairs.some((pair) => pair.player1 === player || pair.player2 === player);

  const getPairPartner = (player: string) => {
    const pair = teammatePairs.find((entry) => entry.player1 === player || entry.player2 === player);
    if (!pair) return null;
    return pair.player1 === player ? pair.player2 : pair.player1;
  };

  const togglePairSelection = (player: string) => {
    const existingPartner = getPairPartner(player);
    if (existingPartner) {
      removePair({ player1: player, player2: existingPartner });
      return;
    }

    if (selectedForPairing === player) {
      setSelectedForPairing(null);
      return;
    }

    if (!selectedForPairing) {
      setSelectedForPairing(player);
      return;
    }

    if (selectedForPairing === player) return;

    const updatedPairs = [...teammatePairs, { player1: selectedForPairing, player2: player }];
    setTeammatePairs(updatedPairs);
    onPlayersChange?.(players, updatedPairs);
    toast.success(`${selectedForPairing} & ${player} locked together`);
    setSelectedForPairing(null);
  };

  const activePlayers = useMemo(() => {
    const active = new Set(players);
    return players.filter((player) => active.has(player));
  }, [players]);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-white/10 bg-[linear-gradient(145deg,rgba(12,20,34,0.98),rgba(18,82,74,0.88),rgba(7,12,24,0.98))] p-5 text-white shadow-2xl shadow-emerald-950/25 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-white/12 text-white">Players</Badge>
              <Badge className={`border-0 ${ready ? "bg-lime-400 text-slate-950" : "bg-white/10 text-white"}`}>
                {ready ? "Ready to start" : `${minimumPlayersRequired - players.length} more needed`}
              </Badge>
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Fast roster control for a real club night.</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
              Add names, paste a full group, lock teammate pairs when needed, and update the roster mid-session without leaving the flow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/10 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Roster</div>
              <div className="mt-2 text-3xl font-semibold">{players.length}</div>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/10 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Locked pairs</div>
              <div className="mt-2 text-3xl font-semibold">{pairCount}</div>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/10 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Status</div>
              <div className="mt-2 text-sm font-semibold text-lime-200">{ready ? "Can start now" : "Add more players"}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <Card className="border-white/10 bg-white/95 p-5 shadow-xl shadow-slate-950/5">
            <div className="flex items-center gap-2 text-slate-900">
              <Plus className="h-4 w-4 text-emerald-600" />
              <h4 className="font-semibold">Add one player</h4>
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Enter player name"
                value={currentName}
                onChange={(event) => setCurrentName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addPlayer();
                }}
                className="h-12 rounded-2xl border-slate-200"
                maxLength={50}
              />
              <Button onClick={addPlayer} disabled={!currentName.trim()} className="h-12 rounded-2xl bg-emerald-500 px-5 text-white hover:bg-emerald-400">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <Card className="border-white/10 bg-white/95 p-5 shadow-xl shadow-slate-950/5">
            <div className="flex items-center gap-2 text-slate-900">
              <Zap className="h-4 w-4 text-sky-600" />
              <h4 className="font-semibold">Paste a batch</h4>
            </div>
            <Textarea
              value={bulkNames}
              onChange={(event) => setBulkNames(event.target.value)}
              placeholder="Maya, Theo, Jules, Iris"
              className="mt-3 min-h-[120px] rounded-2xl border-slate-200 bg-slate-50"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Comma or line-break separated.</p>
              <Button onClick={addBulkPlayers} disabled={bulkParsed.length === 0} variant="outline" className="rounded-full">
                Add batch
              </Button>
            </div>
          </Card>

          <Card className="border-white/10 bg-slate-950/80 p-5 text-white shadow-xl shadow-emerald-950/10">
            <div className="flex items-center gap-2 text-lime-300">
              <Sparkles className="h-4 w-4" />
              <h4 className="font-semibold">Session action</h4>
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3 text-sm text-white/72">
                <span>Minimum players required</span>
                <span className="font-semibold text-white">{minimumPlayersRequired}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm text-white/72">
                <span>Current roster</span>
                <span className="font-semibold text-white">{players.length}</span>
              </div>
              <Button
                onClick={() => onComplete(players, teammatePairs)}
                disabled={!ready}
                size="lg"
                className="mt-1 h-12 rounded-2xl bg-lime-400 text-base font-semibold text-slate-950 hover:bg-lime-300"
              >
                {hasStartedMatches ? "Update session" : "Start session"}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedForPairing ? (
            <Card className="border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Check className="h-4 w-4" />
                Pairing mode on
              </div>
              <p className="mt-2 text-sm text-emerald-800">Choose another player to lock with {selectedForPairing}, or tap {selectedForPairing} again to cancel.</p>
            </Card>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {activePlayers.map((player) => {
              const partner = getPairPartner(player);
              const paired = Boolean(partner);
              const selected = selectedForPairing === player;

              return (
                <Card
                  key={player}
                  className={`rounded-[1.5rem] border p-4 shadow-lg shadow-slate-950/5 transition ${
                    selected
                      ? "border-emerald-400 bg-emerald-50"
                      : paired
                        ? "border-sky-200 bg-sky-50"
                        : "border-white/10 bg-white/95"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{player}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">In roster</Badge>
                        {partner ? (
                          <Badge className="rounded-full border-0 bg-sky-600 text-white">Paired with {partner}</Badge>
                        ) : null}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePlayer(player)}
                      className="h-8 w-8 rounded-full p-0 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => togglePairSelection(player)}
                      className="flex-1 rounded-full"
                    >
                      {paired ? <Unlink className="mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}
                      {paired ? "Unpair" : selected ? "Cancel pair" : "Pair"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removePlayer(player)}
                      className="rounded-full"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {players.length === 0 ? (
            <Card className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white/80 px-6 py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">No players added yet.</p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};
