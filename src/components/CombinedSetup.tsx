import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { UserPlus, X, ArrowRight } from "lucide-react";
import { GameConfig } from "./GameSetup";
import { toast } from "sonner";

interface CombinedSetupProps {
  onComplete: (playerList: string[], config: GameConfig) => void;
}

export const CombinedSetup = ({ onComplete }: CombinedSetupProps) => {
  const [players, setPlayers] = useState<string[]>([]);
  const [currentName, setCurrentName] = useState("");
  const [gameDuration, setGameDuration] = useState<5 | 10 | 15>(10);
  const [totalTime, setTotalTime] = useState<number>(60);
  const [courts, setCourts] = useState<number>(2);
  const [startTime, setStartTime] = useState<string>("09:00");

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
    setPlayers(players.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addPlayer();
    }
  };

  const handleSubmit = () => {
    if (players.length < 2) {
      toast.error("Please add at least 2 players");
      return;
    }
    const config: GameConfig = {
      gameDuration,
      totalTime,
      courts,
      startTime,
    };
    onComplete(players, config);
  };

  const maxCourts = Math.floor(players.length / 4);
  const totalTimeOptions = Array.from({ length: 16 }, (_, i) => (i + 1) * 15);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6">Setup Your Game</h2>
      </div>

      <div className="grid md:grid-cols-[2fr_1fr] gap-6">
        {/* Game Configuration */}
        <div className="space-y-6 order-2 md:order-1">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Game Settings</h3>
            
            <div className="space-y-3">
              <Label htmlFor="game-duration" className="text-base">Game Duration</Label>
              <RadioGroup
                value={gameDuration.toString()}
                onValueChange={(value) => setGameDuration(parseInt(value) as 5 | 10 | 15)}
                className="flex gap-4"
              >
                {[5, 10, 15].map((duration) => (
                  <div key={duration} className="flex items-center space-x-2">
                    <RadioGroupItem value={duration.toString()} id={`duration-${duration}`} />
                    <Label htmlFor={`duration-${duration}`} className="cursor-pointer">
                      {duration} min
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label htmlFor="total-time" className="text-base">Total Play Time</Label>
              <Select value={totalTime.toString()} onValueChange={(value) => setTotalTime(parseInt(value))}>
                <SelectTrigger id="total-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {totalTimeOptions.map((time) => (
                    <SelectItem key={time} value={time.toString()}>
                      {time} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="courts" className="text-base">Number of Courts</Label>
              <Select 
                value={courts.toString()} 
                onValueChange={(value) => setCourts(parseInt(value))}
                disabled={players.length < 4}
              >
                <SelectTrigger id="courts">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxCourts || 1 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} court{num > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {players.length < 4 && (
                <p className="text-sm text-muted-foreground">Add at least 4 players to select courts</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="start-time" className="text-base">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="max-w-[200px]"
              />
            </div>
          </div>

          {/* Add Player Section */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-lg font-semibold text-foreground">Add Players</h3>
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
        </div>

        {/* Player List */}
        <div className="space-y-4 order-1 md:order-2">
          <h3 className="text-lg font-semibold text-foreground">Players</h3>
          <Card className="p-4 max-h-[500px] overflow-y-auto">
            {players.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No players added yet</p>
            ) : (
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <span className="font-medium text-foreground">{player}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePlayer(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSubmit}
          disabled={players.length < 2}
          size="lg"
          className="min-w-[200px]"
        >
          Generate Schedule
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
