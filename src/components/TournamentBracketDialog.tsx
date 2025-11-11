import { Match } from "@/lib/scheduler";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TournamentBracketView } from "./TournamentBracketView";

interface TournamentBracketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
  allPlayers: string[];
  schedulingType: 'single-elimination' | 'double-elimination' | 'qualifier-tournament';
}

export function TournamentBracketDialog({
  open,
  onOpenChange,
  matches,
  matchScores,
  allPlayers,
  schedulingType,
}: TournamentBracketDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Tournament Bracket</DialogTitle>
          <DialogDescription>
            {schedulingType === 'single-elimination'
              ? 'Single Elimination - One loss and you\'re out'
              : schedulingType === 'double-elimination'
              ? 'Double Elimination - Two chances to stay in'
              : 'Qualifier Tournament - Groups then knockout'}
          </DialogDescription>
        </DialogHeader>

        <TournamentBracketView
          matches={matches}
          matchScores={matchScores}
          allPlayers={allPlayers}
        />
      </DialogContent>
    </Dialog>
  );
}
