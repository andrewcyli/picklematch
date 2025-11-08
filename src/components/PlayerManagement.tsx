import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, Link2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface PlayerManagementProps {
  onComplete: (players: string[], teammatePairs: { player1: string; player2: string }[]) => void;
}

export const PlayerManagement = ({ onComplete }: PlayerManagementProps) => {
  const [players, setPlayers] = useState<string[]>([]);
  const [currentName, setCurrentName] = useState("");
  const [teammatePairs, setTeammatePairs] = useState<{ player1: string; player2: string }[]>([]);
  const [selectedForPairing, setSelectedForPairing] = useState<string | null>(null);

  const addPlayer = () => {
    const trimmedName = currentName.trim();
    if (trimmedName && players.length < 20) {
      if (players.includes(trimmedName)) {
        toast.error("Player already added");
        return;
      }
      setPlayers([...players, trimmedName]);
      setCurrentName("");
      toast.success(`${trimmedName} added`);
    }
  };

  const removePlayer = (index: number) => {
    const playerName = players[index];
    setTeammatePairs(teammatePairs.filter(p => p.player1 !== playerName && p.player2 !== playerName));
    setPlayers(players.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addPlayer();
    }
  };

  const togglePairSelection = (player: string) => {
    if (selectedForPairing === player) {
      setSelectedForPairing(null);
    } else if (selectedForPairing === null) {
      setSelectedForPairing(player);
    } else {
      const existingPair = teammatePairs.find(
        pair => (pair.player1 === selectedForPairing && pair.player2 === player) ||
                (pair.player1 === player && pair.player2 === selectedForPairing)
      );
      
      if (existingPair) {
        toast.error("These players are already paired");
      } else {
        setTeammatePairs([...teammatePairs, { player1: selectedForPairing, player2: player }]);
        toast.success(`${selectedForPairing} & ${player} are now teammates`);
      }
      setSelectedForPairing(null);
    }
  };

  const removePair = (pair: { player1: string; player2: string }) => {
    setTeammatePairs(teammatePairs.filter(p => p !== pair));
    toast.success("Pair removed");
  };

  const isPaired = (player: string) => {
    return teammatePairs.some(pair => pair.player1 === player || pair.player2 === player);
  };

  const handleSubmit = () => {
    if (players.length < 2) {
      toast.error("Please add at least 2 players");
      return;
    }
    onComplete(players, teammatePairs);
  };

  return (
    <div className="space-y-6 pb-20">
      <h3 className="text-lg font-semibold text-foreground">Add Players</h3>
      
      <div className="space-y-3">
        <div className="flex gap-3">
          <Input
            value={currentName}
            onChange={(e) => setCurrentName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter player name"
            className="flex-1"
            maxLength={30}
          />
          <Button
            onClick={addPlayer}
            disabled={!currentName.trim() || players.length >= 20}
            size="icon"
            className="shrink-0"
          >
            <UserPlus className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {players.length} / 20 players added
          {players.length < 2 && " (minimum 2 required)"}
        </p>
      </div>

      <Card className="p-4 max-h-[400px] overflow-y-auto">
        {players.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No players added yet</p>
        ) : (
          <div className="space-y-2">
            {players.map((player, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  selectedForPairing === player
                    ? "bg-primary/20 border-2 border-primary"
                    : isPaired(player)
                    ? "bg-accent/10"
                    : "bg-secondary/50 hover:bg-secondary"
                }`}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-medium text-foreground">{player}</span>
                  {isPaired(player) && (
                    <Badge variant="secondary" className="text-xs">
                      <Link2 className="h-3 w-3 mr-1" />
                      Paired
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePairSelection(player)}
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    title="Bind as teammates"
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePlayer(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {selectedForPairing && (
              <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  Click another player to pair with <strong>{selectedForPairing}</strong>
                </p>
              </div>
            )}

            {teammatePairs.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Teammate Pairs</h4>
                {teammatePairs.map((pair, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-accent/10">
                    <span className="text-sm">
                      {pair.player1} & {pair.player2}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePair(pair)}
                      className="h-6 w-6"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={players.length < 2}
        size="lg"
        className="w-full h-14 text-base"
      >
        Continue to Scheduler
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
};
