import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Clock, Trophy, Share2, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { CourtConfig } from "@/lib/scheduler";

interface GameSetupProps {
  playerCount?: number;
  onComplete: (config: GameConfig) => void;
  onBack?: () => void;
  gameCode?: string;
}

export interface GameConfig {
  gameDuration: number;
  totalTime: number;
  courts: number;
  teammatePairs?: { player1: string; player2: string }[];
  courtConfigs?: CourtConfig[];
}

export const GameSetup = ({ playerCount = 4, onComplete, onBack, gameCode }: GameSetupProps) => {
  const [gameDuration, setGameDuration] = useState<number>(10);
  const [totalTime, setTotalTime] = useState<number>(60);
  const [courts, setCourts] = useState<number>(2);
  const [courtConfigs, setCourtConfigs] = useState<CourtConfig[]>(
    Array.from({ length: 2 }, (_, i) => ({ courtNumber: i + 1, type: 'doubles' as const }))
  );
  const [copied, setCopied] = useState(false);

  const gameUrl = gameCode ? `${window.location.origin}?join=${gameCode}` : '';

  const maxCourts = Math.floor(playerCount / 2);
  const totalTimeOptions = Array.from({ length: 12 }, (_, i) => (i + 1) * 15);

  const handleCourtsChange = (newCourts: number) => {
    setCourts(newCourts);
    setCourtConfigs(Array.from({ length: newCourts }, (_, i) => 
      courtConfigs[i] || { courtNumber: i + 1, type: 'doubles' as const }
    ));
  };

  const toggleCourtType = (courtNumber: number) => {
    setCourtConfigs(prev => prev.map(config => 
      config.courtNumber === courtNumber 
        ? { ...config, type: config.type === 'singles' ? 'doubles' : 'singles' }
        : config
    ));
  };

  const handleSubmit = () => {
    onComplete({ gameDuration, totalTime, courts, courtConfigs });
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
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-accent-foreground" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">Game Settings</h2>
          <p className="text-muted-foreground text-xs">Configure your session</p>
        </div>
      </div>

      {/* Game Code and QR Code Section */}
      {gameCode && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex flex-col items-center gap-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Game Code</p>
              <p className="text-xl font-bold font-mono tracking-wider text-primary">{gameCode}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Share this code with other players</p>
            </div>

            <div className="bg-white p-2 rounded-lg shadow-inner">
              <QRCodeSVG
                value={gameUrl}
                size={120}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="flex gap-1.5">
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="gap-1 h-7 text-xs px-2"
              >
                <Share2 className="w-3 h-3" />
                Share
              </Button>
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="gap-1 h-7 text-xs px-2"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Game Duration
          </Label>
          <RadioGroup value={gameDuration.toString()} onValueChange={(v) => setGameDuration(Number(v))}>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((duration) => (
                <label
                  key={duration}
                  className={`relative flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all ${
                    gameDuration === duration
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50"
                  }`}
                >
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
            <SelectTrigger id="total-time" className="h-9 text-sm">
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

        <div className="space-y-2">
          <Label htmlFor="courts" className="text-sm font-semibold">
            Number of Courts
          </Label>
          <Select value={courts.toString()} onValueChange={(v) => handleCourtsChange(Number(v))}>
            <SelectTrigger id="courts" className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: Math.min(maxCourts, 10) }, (_, i) => i + 1).map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? "court" : "courts"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Maximum {maxCourts} courts for {playerCount} players
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Court Configuration
          </Label>
          <div className="space-y-1.5">
            {courtConfigs.map((config) => (
              <div key={config.courtNumber} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                <Label htmlFor={`court-${config.courtNumber}`} className="text-xs font-medium">
                  Court {config.courtNumber}
                </Label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${config.type === 'singles' ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                    Doubles
                  </span>
                  <Switch
                    id={`court-${config.courtNumber}`}
                    checked={config.type === 'singles'}
                    onCheckedChange={() => toggleCourtType(config.courtNumber)}
                    className="scale-75"
                  />
                  <span className={`text-xs ${config.type === 'singles' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    Singles
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {onBack && (
          <Button variant="outline" onClick={onBack} size="sm" className="flex-1 h-9 text-sm">
            Back
          </Button>
        )}
        <Button onClick={handleSubmit} size="sm" className={`h-9 text-sm font-semibold bg-gradient-to-r from-primary to-accent text-white shadow-sport hover:shadow-glow hover:scale-105 transition-all ${onBack ? 'flex-1' : 'w-full'}`}>
          Continue
        </Button>
      </div>
    </div>
  );
};
