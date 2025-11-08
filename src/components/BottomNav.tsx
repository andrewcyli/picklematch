import { Settings, Calendar, Users, Trophy, History } from "lucide-react";
import { cn } from "@/lib/utils";
interface BottomNavProps {
  activeSection: "setup" | "players" | "matches" | "history" | "leaderboard";
  onSectionChange: (section: "setup" | "players" | "matches" | "history" | "leaderboard") => void;
  disabled?: boolean;
}
export const BottomNav = ({
  activeSection,
  onSectionChange,
  disabled
}: BottomNavProps) => {
  return <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg">
      <div className="max-w-5xl mx-auto px-2">
        <div className="flex items-center justify-around py-3">
          <button onClick={() => onSectionChange("setup")} disabled={disabled} className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all", activeSection === "setup" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50", disabled && "opacity-50 cursor-not-allowed")}>
            <Settings className="w-5 h-5" />
            <span className="text-xs font-medium">Setup</span>
          </button>

          <button onClick={() => onSectionChange("players")} disabled={disabled} className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all", activeSection === "players" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50", disabled && "opacity-50 cursor-not-allowed")}>
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium">Players</span>
          </button>

          <button onClick={() => onSectionChange("matches")} disabled={disabled} className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all relative", activeSection === "matches" ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            <div className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all", activeSection === "matches" ? "bg-gradient-to-br from-primary to-accent shadow-lg scale-110" : "bg-muted hover:bg-muted/80")}>
              <Calendar className={cn("w-7 h-7", activeSection === "matches" ? "text-white" : "text-foreground")} />
            </div>
            <span className="text-xs font-medium mt-1">Matches</span>
          </button>

          <button onClick={() => onSectionChange("history")} disabled={disabled} className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all", activeSection === "history" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50", disabled && "opacity-50 cursor-not-allowed")}>
            <History className="w-5 h-5" />
            <span className="text-xs font-medium">History</span>
          </button>

          <button onClick={() => onSectionChange("leaderboard")} disabled={disabled} className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all", activeSection === "leaderboard" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50", disabled && "opacity-50 cursor-not-allowed")}>
            <Trophy className="w-5 h-5" />
            <span className="text-xs font-medium">Leaderboard</span>
          </button>
        </div>
      </div>
    </nav>;
};