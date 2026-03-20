import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, Users, Link2, Unlink, Zap } from "lucide-react";
import { toast } from "sonner";
import { Match } from "@/lib/scheduler";
import { validatePlayerName } from "@/lib/validation";

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
}: PlayerSetupProps) => {
  const [players, setPlayers] = useState<string[]>(initialPlayers);
  const [currentName, setCurrentName] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [teammatePairs, setTeammatePairs] = useState<{ player1: string; player2: string }[]>(initialTeammatePairs);
  const [selectedForPairing, setSelectedForPairing] = useState<string | null>(null);

  const bulkParsed = useMemo(() => parseBulkNames(bulkNames), [bulkNames]);

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

    if (players.some((p) => p.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("This player name already exists");
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

  const removePlayer = (index: number) => {
    const playerToRemove = players[index];
    const updatedPlayers = players.filter((_, i) => i !== index);
    const updatedPairs = teammatePairs.filter((pair) => pair.player1 !== playerToRemove && pair.player2 !== playerToRemove);

    setTeammatePairs(updatedPairs);
    if (selectedForPairing === playerToRemove) setSelectedForPairing(null);
    syncPlayers(updatedPlayers, updatedPairs);
  };

  const togglePairSelection = (player: string) => {
    if (selectedForPairing === player) {
      setSelectedForPairing(null);
    } else if (selectedForPairing === null) {
      setSelectedForPairing(player);
    } else {
      const existingPair = teammatePairs.find(
        (pair) =>
          (pair.player1 === selectedForPairing && pair.player2 === player) ||
          (pair.player1 === player && pair.player2 === selectedForPairing)
      );

      if (existingPair) {
        toast.error("These players are already paired");
      } else {
        const updatedPairs = [...teammatePairs, { player1: selectedForPairing, player2: player }];
        setTeammatePairs(updatedPairs);
        onPlayersChange?.(players, updatedPairs);
        toast.success(`${selectedForPairing} & ${player} are now teammates`);
      }
      setSelectedForPairing(null);
    }
  };

  const removePair = (pair: { player1: string; player2: string }) => {
    const updatedPairs = teammatePairs.filter((p) => p !== pair);
    setTeammatePairs(updatedPairs);
    onPlayersChange?.(players, updatedPairs);
    toast.success("Pair removed");
  };

  const isPaired = (player: string) => teammatePairs.some((pair) => pair.player1 === player || pair.player2 === player);

  const getPairPartner = (player: string) => {
    const pair = teammatePairs.find((p) => p.player1 === player || p.player2 === player);
    if (!pair) return null;
    return pair.player1 === player ? pair.player2 : pair.player1;
  };

  const unpairPlayer = (player: string) => {
    const pair = teammatePairs.find((p) => p.player1 === player || p.player2 === player);
    if (pair) removePair(pair);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addPlayer();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 space-y-4">
        <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <Plus className="h-4 w-4" />
              <h3 className="font-semibold">Add one player</h3>
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Enter player name"
                value={currentName}
                onChange={(e) => setCurrentName(e.target.value)}
                onKeyDown={handleKeyPress}
                className="h-12 text-base"
                maxLength={50}
              />
              <Button onClick={addPlayer} disabled={!currentName.trim()} size="lg" className="h-12 px-6">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <Zap className="h-4 w-4" />
              <h3 className="font-semibold">Paste a whole group</h3>
            </div>
            <Textarea
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
              placeholder="Maya, Theo, Jules, Iris"
              className="mt-3 min-h-[88px] border-slate-200 bg-slate-50"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Comma or line break separated.</p>
              <Button onClick={addBulkPlayers} disabled={bulkParsed.length === 0} variant="secondary">
                Add batch
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div>{players.length} players added{teammatePairs.length > 0 ? ` · ${teammatePairs.length} locked pair${teammatePairs.length === 1 ? "" : "s"}` : ""}</div>
          <Button onClick={() => onComplete(players, teammatePairs)} disabled={players.length < 2} size="lg" className="h-11 min-w-[220px] text-base font-semibold bg-gradient-to-r from-primary to-accent text-white shadow-sport">
            {hasStartedMatches ? "Update Matches" : "Continue to Matches"}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {players.map((player, index) => {
            const partner = getPairPartner(player);
            return (
              <Card
                key={index}
                className={`flex flex-col gap-2 p-4 transition-all hover:shadow-md ${
                  selectedForPairing === player
                    ? "border-2 border-primary bg-primary/5"
                    : isPaired(player)
                      ? "border border-accent/50 bg-accent/5"
                      : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{player}</span>
                  <div className="flex gap-2">
                    {isPaired(player) ? (
                      <Button variant="ghost" size="sm" onClick={() => unpairPlayer(player)} className="h-8 w-8 p-0 text-accent hover:text-destructive" title="Unpair teammates">
                        <Unlink className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => togglePairSelection(player)} className="h-8 w-8 p-0 text-muted-foreground hover:text-primary" title="Link as teammates">
                        <Link2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => removePlayer(index)} className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {partner ? (
                  <div className="flex items-center gap-1 text-xs font-medium text-accent">
                    <Users className="h-3 w-3" />
                    Paired with {partner}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>

        {selectedForPairing ? (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/10 p-3">
            <p className="text-sm text-foreground">
              Select another player to pair with <strong>{selectedForPairing}</strong>
            </p>
          </div>
        ) : null}

        {teammatePairs.length > 0 ? (
          <div className="mt-4 space-y-2 border-t pt-4">
            <h4 className="text-sm font-semibold text-foreground">Teammate Pairs</h4>
            <div className="max-h-48 overflow-y-auto pr-1">
              {teammatePairs.map((pair, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent/10 p-3">
                  <span className="text-sm font-medium">
                    {pair.player1} & {pair.player2}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => removePair(pair)} className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
