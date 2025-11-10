import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { validateGameCode } from "@/lib/validation";
import { Trophy, Users, Clock, BarChart3, Sparkles, Zap } from "lucide-react";
interface GameCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinGame: (gameCode: string) => void;
  onCreateGame: () => void;
}
export const GameCodeDialog = ({
  open,
  onOpenChange,
  onJoinGame,
  onCreateGame
}: GameCodeDialogProps) => {
  const [gameCode, setGameCode] = useState("");
  const handleJoin = () => {
    const code = gameCode.trim().toUpperCase();
    const validation = validateGameCode(code);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid game code");
      return;
    }
    onJoinGame(code);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            TeamUp Social Play 🎾
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Smart team rotation & scoring for racket sports tournaments
          </DialogDescription>
        </DialogHeader>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3 py-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">Auto Rotation 🔄</div>
              <div className="text-xs text-muted-foreground">Fair team assignment</div>
            </div>
          </div>
          
          <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
            <BarChart3 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">Live Scores 📊</div>
              <div className="text-xs text-muted-foreground">Real-time tracking</div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">Multi-Court 🏟️</div>
              <div className="text-xs text-muted-foreground">Manage all courts</div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
            <Clock className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">Smart Timer ⏱️</div>
              <div className="text-xs text-muted-foreground">Auto scheduling</div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Trophy className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">Leaderboard 🏆</div>
              <div className="text-xs text-muted-foreground">Track rankings</div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
            <Zap className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">No Login ✨</div>
              <div className="text-xs text-muted-foreground">Instant play</div>
            </div>
          </div>
        </div>

        {/* Sports Icons */}
        <div className="text-center text-sm text-muted-foreground py-2 border-t border-b">Perfect for 🏓Pickleball • 🏸 Badminton • 🎾 Tennis</div>

        {/* Join/Create Section */}
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="game-code" className="text-sm font-semibold">Join Existing Game</Label>
            <div className="flex gap-2">
              <Input id="game-code" value={gameCode} onChange={e => setGameCode(e.target.value.toUpperCase())} placeholder="Enter 6-char code" maxLength={6} className="flex-1 uppercase font-mono text-lg tracking-wider" />
              <Button onClick={handleJoin} disabled={gameCode.length !== 6} size="lg">
                Join
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button onClick={onCreateGame} className="w-full" variant="default" size="lg">🤝 Create New Game</Button>
        </div>
      </DialogContent>
    </Dialog>;
};