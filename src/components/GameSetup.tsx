import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Trophy, AlertCircle } from "lucide-react";
import { CourtConfig } from "@/lib/scheduler";

interface GameSetupProps {
  playerCount?: number;
  onComplete: (config: GameConfig) => void;
  onBack?: () => void;
  gameCode?: string;
  onNewSession?: () => void;
  hasExistingMatches?: boolean;
  quickCourtMode?: boolean;
}

export interface GameConfig {
  gameDuration: number;
  totalTime: number;
  courts: number;
  teammatePairs?: {
    player1: string;
    player2: string;
  }[];
  courtConfigs?: CourtConfig[];
  schedulingType?: "round-robin" | "single-elimination" | "double-elimination" | "qualifier-tournament";
  tournamentPlayStyle?: "singles" | "doubles";
}

export const GameSetup = ({
  playerCount = 4,
  onComplete,
  onNewSession,
  hasExistingMatches = false,
  quickCourtMode = false,
}: GameSetupProps) => {
  const [gameDuration, setGameDuration] = useState<number>(10);
  const [totalTime, setTotalTime] = useState<number>(60);
  const [courts, setCourts] = useState<number>(2);
  const [schedulingType, setSchedulingType] = useState<"round-robin" | "single-elimination" | "double-elimination" | "qualifier-tournament">("round-robin");
  const [tournamentPlayStyle, setTournamentPlayStyle] = useState<"singles" | "doubles">("doubles");
  const [courtConfigs, setCourtConfigs] = useState<CourtConfig[]>(
    Array.from({ length: 2 }, (_, i) => ({
      courtNumber: i + 1,
      type: "doubles" as const,
    }))
  );

  const maxCourts = Math.max(1, Math.floor(playerCount / 2));
  const totalTimeOptions = Array.from({ length: 12 }, (_, i) => (i + 1) * 15);

  const handleCourtsChange = (newCourts: number) => {
    setCourts(newCourts);
    const defaultType: "singles" | "doubles" = schedulingType !== "round-robin" ? tournamentPlayStyle : "doubles";
    setCourtConfigs(
      Array.from({ length: newCourts }, (_, i) =>
        courtConfigs[i] || {
          courtNumber: i + 1,
          type: defaultType,
        }
      )
    );
  };

  const toggleCourtType = (courtNumber: number) => {
    setCourtConfigs((prev) =>
      prev.map((config) =>
        config.courtNumber === courtNumber
          ? {
              ...config,
              type: config.type === "singles" ? ("doubles" as const) : ("singles" as const),
            }
          : config
      )
    );
  };

  const handleContinue = () => {
    const finalCourtConfigs =
      schedulingType !== "round-robin"
        ? courtConfigs.map((config) => ({ ...config, type: tournamentPlayStyle as "singles" | "doubles" }))
        : courtConfigs;

    onComplete({
      gameDuration,
      totalTime,
      courts,
      courtConfigs: finalCourtConfigs,
      schedulingType: quickCourtMode ? "round-robin" : schedulingType,
      tournamentPlayStyle: quickCourtMode || schedulingType === "round-robin" ? undefined : tournamentPlayStyle,
    });
  };

  return (
    <div className="space-y-5 pb-2">
      {onNewSession ? (
        <Button
          onClick={onNewSession}
          variant="outline"
          size="sm"
          className="h-10 w-full rounded-2xl border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
        >
          New Session
        </Button>
      ) : null}

      {!quickCourtMode && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Trophy className="h-3.5 w-3.5" />
            Scheduling Type
          </Label>

          {hasExistingMatches && (
            <Alert className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Scheduling mode is locked. To change modes, please start a new session.
              </AlertDescription>
            </Alert>
          )}

          <RadioGroup
            value={schedulingType}
            onValueChange={(v) => setSchedulingType(v as "round-robin" | "single-elimination" | "double-elimination" | "qualifier-tournament")}
            disabled={hasExistingMatches}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["round-robin", "Round Robin", "Everyone plays multiple games"],
                ["qualifier-tournament", "Qualifier Stage", "Groups then knockout"],
                ["single-elimination", "Single Elim", "4/8/16 teams only"],
                ["double-elimination", "Double Elim", "4/8/16 teams only"],
              ].map(([value, title, description]) => (
                <label
                  key={value}
                  className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all ${
                    hasExistingMatches ? "cursor-not-allowed opacity-50" : ""
                  } ${schedulingType === value ? "border-emerald-400/40 bg-emerald-500/15 shadow-sm" : "border-white/10 bg-white/5 hover:border-emerald-400/30"}`}
                >
                  <RadioGroupItem value={value} className="sr-only" disabled={hasExistingMatches} />
                  <span className="text-sm font-semibold text-white">{title}</span>
                  <p className="mt-1 text-xs text-white/55">{description}</p>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Clock className="h-3.5 w-3.5" />
            Game Duration
          </Label>
          <RadioGroup value={gameDuration.toString()} onValueChange={(v) => setGameDuration(Number(v))}>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((duration) => (
                <label
                  key={duration}
                  className={`relative flex cursor-pointer items-center justify-center rounded-2xl border p-3 transition-all ${
                    gameDuration === duration ? "border-emerald-400/40 bg-emerald-500/15 shadow-sm" : "border-white/10 bg-white/5 hover:border-emerald-400/30"
                  }`}
                >
                  <RadioGroupItem value={duration.toString()} className="sr-only" />
                  <span className="text-sm font-semibold text-white">{duration} min</span>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="total-time" className="text-sm font-semibold text-white">
            Total Play Time
          </Label>
          <Select value={totalTime.toString()} onValueChange={(v) => setTotalTime(Number(v))}>
            <SelectTrigger id="total-time" className="h-11 rounded-2xl border-white/10 bg-white/10 text-sm text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {totalTimeOptions.map((time) => (
                <SelectItem key={time} value={time.toString()} className="text-sm">
                  {time} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="courts" className="text-sm font-semibold text-white">
            Number of Courts
          </Label>
          <Select value={courts.toString()} onValueChange={(v) => handleCourtsChange(Number(v))}>
            <SelectTrigger id="courts" className="h-11 rounded-2xl border-white/10 bg-white/10 text-sm text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: Math.min(maxCourts, 10) }, (_, i) => i + 1).map((num) => (
                <SelectItem key={num} value={num.toString()} className="text-sm">
                  {num} {num === 1 ? "court" : "courts"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label className="text-sm font-semibold text-white">Court Format</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {courtConfigs.map((config) => (
              <div key={config.courtNumber} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                <Label htmlFor={`court-${config.courtNumber}`} className="text-sm font-medium text-white">
                  Court {config.courtNumber}
                </Label>
                <div className="flex items-center gap-2 rounded-full bg-white/10 px-2 py-1">
                  <span className={`text-xs ${config.type === "singles" ? "text-white/40" : "font-medium text-white"}`}>Doubles</span>
                  <Switch
                    id={`court-${config.courtNumber}`}
                    checked={config.type === "singles"}
                    onCheckedChange={() => toggleCourtType(config.courtNumber)}
                    className="scale-90"
                  />
                  <span className={`text-xs ${config.type === "singles" ? "font-medium text-white" : "text-white/40"}`}>Singles</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={handleContinue} size="lg" className="h-12 w-full rounded-2xl bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-400">
        Continue to Players
      </Button>
    </div>
  );
};
