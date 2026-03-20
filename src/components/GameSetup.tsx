import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Trophy, Share2, Copy, Check, AlertCircle, Zap } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
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
  gameCode,
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
  const [copied, setCopied] = useState(false);

  const gameUrl = gameCode ? `${window.location.origin}${window.location.pathname}?join=${gameCode}` : "";
  const maxCourts = Math.max(1, Math.floor(playerCount / 2));
  const totalTimeOptions = Array.from({ length: 12 }, (_, i) => (i + 1) * 15);

  const handleCourtsChange = (newCourts: number) => {
    setCourts(newCourts);
    const defaultType: "singles" | "doubles" = schedulingType !== "round-robin" ? tournamentPlayStyle : "doubles";
    const newConfigs = Array.from({ length: newCourts }, (_, i) =>
      courtConfigs[i] || {
        courtNumber: i + 1,
        type: defaultType,
      }
    );
    setCourtConfigs(newConfigs);
  };

  const toggleCourtType = (courtNumber: number) => {
    const newConfigs = courtConfigs.map((config) =>
      config.courtNumber === courtNumber
        ? {
            ...config,
            type: config.type === "singles" ? ("doubles" as const) : ("singles" as const),
          }
        : config
    );
    setCourtConfigs(newConfigs);
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

  const handleCopy = () => {
    if (!gameUrl) return;
    navigator.clipboard.writeText(gameUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!gameCode || !gameUrl) return;
    const shareText = `Join my game with code: ${gameCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Racket Match",
          text: shareText,
          url: gameUrl,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-5 pb-2">
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white">
            {quickCourtMode ? <Zap className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">{quickCourtMode ? "Quick Court setup" : "Game Configuration"}</h2>
            <p className="text-[10px] text-muted-foreground">{quickCourtMode ? "Round-robin only" : "Tournament settings"}</p>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {quickCourtMode
            ? "Keep it light: choose how long games run, how many courts are active, and whether each court is singles or doubles. Everything else happens on the players and courts screens."
            : "Configure your tournament settings including match duration, total play time, and number of courts."}
        </p>
      </div>

      {gameCode ? (
        <Card className="border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="mb-0.5 text-xs text-muted-foreground">Game Code</p>
              <p className="font-mono text-xl font-bold text-primary">{gameCode}</p>
            </div>
            <div className="rounded bg-white p-2 shadow-inner">
              <QRCodeSVG value={gameUrl} size={80} level="H" includeMargin={false} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Button onClick={handleShare} variant="outline" size="sm" className="h-7 px-2 text-xs">
                <Share2 className="mr-1 h-3 w-3" />
                Share
              </Button>
              <Button onClick={handleCopy} variant="outline" size="sm" className="h-7 px-2 text-xs">
                {copied ? (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {gameCode && onNewSession ? (
        <Button onClick={onNewSession} variant="outline" size="sm" className="h-8 w-full gap-1 text-xs">
          New Session
        </Button>
      ) : null}

      {!quickCourtMode && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-semibold">
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
              <label className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-3 transition-all ${hasExistingMatches ? "cursor-not-allowed opacity-50" : ""} ${schedulingType === "round-robin" ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50"}`}>
                <RadioGroupItem value="round-robin" className="sr-only" disabled={hasExistingMatches} />
                <span className="text-sm font-bold">Round Robin</span>
                <p className="mt-1 text-center text-xs text-muted-foreground">Everyone plays multiple games</p>
              </label>
              <label className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-3 transition-all ${hasExistingMatches ? "cursor-not-allowed opacity-50" : ""} ${schedulingType === "qualifier-tournament" ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50"}`}>
                <RadioGroupItem value="qualifier-tournament" className="sr-only" disabled={hasExistingMatches} />
                <span className="text-sm font-bold">Qualifier Stage</span>
                <p className="mt-1 text-center text-xs text-muted-foreground">Groups then knockout (4-24 teams)</p>
              </label>
              <label className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-3 transition-all ${hasExistingMatches ? "cursor-not-allowed opacity-50" : ""} ${schedulingType === "single-elimination" ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50"}`}>
                <RadioGroupItem value="single-elimination" className="sr-only" disabled={hasExistingMatches} />
                <span className="text-sm font-bold">Single Elim</span>
                <p className="mt-1 text-center text-xs text-muted-foreground">4/8/16 teams only</p>
              </label>
              <label className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-3 transition-all ${hasExistingMatches ? "cursor-not-allowed opacity-50" : ""} ${schedulingType === "double-elimination" ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50"}`}>
                <RadioGroupItem value="double-elimination" className="sr-only" disabled={hasExistingMatches} />
                <span className="text-sm font-bold">Double Elim</span>
                <p className="mt-1 text-center text-xs text-muted-foreground">4/8/16 teams only</p>
              </label>
            </div>
          </RadioGroup>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-semibold">
            <Clock className="h-3.5 w-3.5" />
            Game Duration
          </Label>
          <RadioGroup value={gameDuration.toString()} onValueChange={(v) => setGameDuration(Number(v))}>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((duration) => (
                <label key={duration} className={`relative flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-all ${gameDuration === duration ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50"}`}>
                  <RadioGroupItem value={duration.toString()} className="sr-only" />
                  <span className="text-sm font-bold">{duration} min</span>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="total-time" className="text-sm font-semibold">
            Total Play Time
          </Label>
          <Select value={totalTime.toString()} onValueChange={(v) => setTotalTime(Number(v))}>
            <SelectTrigger id="total-time" className="h-10 text-sm">
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
          <Label htmlFor="courts" className="text-sm font-semibold">
            Number of Courts
          </Label>
          <Select value={courts.toString()} onValueChange={(v) => handleCourtsChange(Number(v))}>
            <SelectTrigger id="courts" className="h-10 text-sm">
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
          <Label className="text-sm font-semibold">Court Configuration</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {courtConfigs.map((config) => (
              <div key={config.courtNumber} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <Label htmlFor={`court-${config.courtNumber}`} className="text-sm font-medium">
                  Court {config.courtNumber}
                </Label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${config.type === "singles" ? "text-muted-foreground" : "font-medium text-foreground"}`}>Doubles</span>
                  <Switch id={`court-${config.courtNumber}`} checked={config.type === "singles"} onCheckedChange={() => toggleCourtType(config.courtNumber)} className="scale-90" />
                  <span className={`text-xs ${config.type === "singles" ? "font-medium text-foreground" : "text-muted-foreground"}`}>Singles</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={handleContinue} size="lg" className="h-12 w-full bg-gradient-to-r from-primary to-accent text-base font-semibold text-white shadow-sport">
        {quickCourtMode ? "Continue to Players" : "Continue to Players"}
      </Button>
    </div>
  );
};
