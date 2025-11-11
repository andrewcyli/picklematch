import { Match } from "@/lib/scheduler";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users } from "lucide-react";
import { calculateGroupStandings, determineGroupWinner, isGroupComplete } from "@/lib/qualifier-progression";
import { useMemo } from "react";

interface QualifierStageViewProps {
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
}

export function QualifierStageView({
  matches,
  matchScores
}: QualifierStageViewProps) {
  // Group matches by group ID
  const groupedMatches = useMemo(() => {
    const groups = new Map<string, Match[]>();
    
    matches.forEach(match => {
      if (match.qualifierMetadata?.isGroupStage) {
        const groupId = match.qualifierMetadata.groupId;
        if (!groups.has(groupId)) {
          groups.set(groupId, []);
        }
        groups.get(groupId)!.push(match);
      }
    });
    
    // Sort groups alphabetically
    return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [matches]);
  
  const getPlayerLabel = (team: string[], isSingles?: boolean) => {
    if (team.includes('TBD')) return 'TBD';
    if (isSingles) return team[0];
    return team.join(' & ');
  };
  
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold flex items-center justify-center gap-2">
          <Users className="w-5 h-5" />
          Qualifier Stage - Group Play
        </h3>
        <p className="text-xs text-muted-foreground">Top team from each group advances</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {Array.from(groupedMatches.entries()).map(([groupId, groupMatches]) => {
          const groupSize = groupMatches[0]?.qualifierMetadata?.groupSize || 2;
          const isComplete = isGroupComplete(groupMatches, matchScores);
          const standings = calculateGroupStandings(groupMatches, matchScores);
          const winner = isComplete ? determineGroupWinner(standings, groupMatches, matchScores) : null;
          
          return (
            <Card key={groupId} className="p-3 md:p-4 space-y-3">
              {/* Group Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm sm:text-base">{groupId}</h4>
                  <p className="text-xs text-muted-foreground">
                    {groupSize === 2 
                      ? 'Head-to-Head' 
                      : groupSize === 4 
                        ? 'Single Elimination' 
                        : `Round Robin (${groupSize} teams)`
                    }
                  </p>
                </div>
                <Badge variant={groupSize === 4 ? "default" : groupSize === 3 ? "secondary" : "outline"}>
                  {groupSize === 4 ? 'Bracket' : groupSize === 3 ? 'G3' : 'G2'}
                </Badge>
              </div>
              
              {/* Matches */}
              <div className="space-y-2">
                {groupMatches.map((match, matchIdx) => {
                  const score = matchScores.get(match.id);
                  const hasScore = !!score;
                  
                  // Show round label for groups of 4
                  const showRoundLabel = groupSize === 4 && (matchIdx === 0 || matchIdx === 2);
                  
                  return (
                    <div key={match.id}>
                      {showRoundLabel && (
                        <div className="text-xs font-semibold text-muted-foreground mb-1 mt-2">
                          {matchIdx === 0 ? 'Semifinals' : 'Final'}
                        </div>
                      )}
                      
                      <div 
                        className={`p-2 rounded border text-xs ${
                          hasScore ? 'bg-muted/50' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`flex-1 ${hasScore && score.team1 > score.team2 ? 'font-semibold' : ''}`}>
                            {getPlayerLabel(match.team1, match.isSingles)}
                          </span>
                          <div className="flex items-center gap-1 font-mono">
                            {hasScore ? (
                              <>
                                <span className={score.team1 > score.team2 ? 'font-bold' : ''}>
                                  {score.team1}
                                </span>
                                <span>-</span>
                                <span className={score.team2 > score.team1 ? 'font-bold' : ''}>
                                  {score.team2}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">vs</span>
                            )}
                          </div>
                          <span className={`flex-1 text-right ${hasScore && score.team2 > score.team1 ? 'font-semibold' : ''}`}>
                            {getPlayerLabel(match.team2, match.isSingles)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Standings (only for groups of 3) */}
              {groupSize === 3 && standings.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold mb-2">Standings</p>
                  <div className="space-y-1">
                    {standings
                      .sort((a, b) => {
                        if (a.wins !== b.wins) return b.wins - a.wins;
                        if (a.pointDifferential !== b.pointDifferential) return b.pointDifferential - a.pointDifferential;
                        return b.pointsFor - a.pointsFor;
                      })
                      .map((standing, idx) => {
                        const isWinner = winner && standing.team.join(',') === winner.join(',');
                        return (
                          <div 
                            key={standing.team.join(',')}
                            className={`flex items-center justify-between text-xs p-1.5 rounded ${
                              isWinner ? 'bg-primary/10 font-semibold' : ''
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-4 text-muted-foreground">{idx + 1}.</span>
                              <span className="flex-1">
                                {getPlayerLabel(standing.team, groupMatches[0]?.isSingles)}
                              </span>
                              {isWinner && (
                                <Trophy className="w-3 h-3 text-primary" />
                              )}
                            </span>
                            <span className="text-muted-foreground">
                              {standing.wins}-{standing.losses} ({standing.pointDifferential > 0 ? '+' : ''}{standing.pointDifferential})
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              
              {/* Winner display */}
              {groupSize !== 3 && winner && (
                <div className="flex items-center justify-center gap-2 pt-2 border-t">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold">
                    {groupSize === 4 ? 'Champion' : 'Winner'}: {getPlayerLabel(winner, groupMatches[0]?.isSingles)}
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
