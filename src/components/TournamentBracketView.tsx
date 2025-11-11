import { useMemo } from "react";
import { Match } from "@/lib/scheduler";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trophy, Clock, Users } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

interface TournamentBracketViewProps {
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
  allPlayers: string[];
  isQualifierMode?: boolean;
}

export function TournamentBracketView({
  matches,
  matchScores,
  allPlayers,
  isQualifierMode = false,
}: TournamentBracketViewProps) {
  // Check if this is qualifier mode by checking for qualifier metadata
  const hasQualifierStage = useMemo(() => 
    matches.some(m => m.qualifierMetadata?.isGroupStage),
    [matches]
  );
  
  const actualIsQualifierMode = isQualifierMode || hasQualifierStage;
  
  // Separate qualifier and knockout matches
  const qualifierMatches = useMemo(() => 
    matches.filter(m => m.qualifierMetadata?.isGroupStage),
    [matches]
  );
  
  const knockoutMatches = useMemo(() => 
    matches.filter(m => !m.qualifierMetadata?.isGroupStage),
    [matches]
  );
  
  // If qualifier mode, show tabs
  if (actualIsQualifierMode) {
    return (
      <Tabs defaultValue="qualifier" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qualifier">
            <Users className="w-4 h-4 mr-2" />
            Qualifier Stage
          </TabsTrigger>
          <TabsTrigger value="knockout">
            <Trophy className="w-4 h-4 mr-2" />
            Knockout Bracket
          </TabsTrigger>
        </TabsList>
        <TabsContent value="qualifier" className="mt-4">
          <QualifierStageViewInternal matches={qualifierMatches} matchScores={matchScores} />
        </TabsContent>
        <TabsContent value="knockout" className="mt-4">
          <BracketViewInternal matches={knockoutMatches} matchScores={matchScores} allPlayers={allPlayers} />
        </TabsContent>
      </Tabs>
    );
  }
  
  // Standard tournament bracket view
  return <BracketViewInternal matches={matches} matchScores={matchScores} allPlayers={allPlayers} />;
}

// Internal component for qualifier stage view
function QualifierStageViewInternal({
  matches,
  matchScores
}: {
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
}) {
  const { QualifierStageView } = require('./QualifierStageView');
  return <QualifierStageView matches={matches} matchScores={matchScores} />;
}

// Internal component for bracket view
function BracketViewInternal({
  matches,
  matchScores,
  allPlayers
}: {
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
  allPlayers: string[];
}) {
  const isMobile = useIsMobile();
  
  // Group matches by bracket type and round
  const groupedMatches = useMemo(() => {
    const groups = new Map<string, Map<number, Match[]>>();

    matches.forEach((match) => {
      if (match.tournamentMetadata) {
        const bracketType = match.tournamentMetadata.bracketType;
        const round = match.tournamentMetadata.round;

        if (!groups.has(bracketType)) {
          groups.set(bracketType, new Map());
        }

        const bracketGroup = groups.get(bracketType)!;
        if (!bracketGroup.has(round)) {
          bracketGroup.set(round, []);
        }

        bracketGroup.get(round)!.push(match);
      }
    });

    return groups;
  }, [matches]);

  const getPlayerLabel = (match: Match, slot: 'team1' | 'team2'): string => {
    const team = match[slot];
    const player = team[0];
    
    if (player !== 'TBD') {
      // For doubles, show both players
      if (!match.isSingles && team.length === 2) {
        // Don't show duplicate if both players are the same (odd player out scenario)
        if (team[0] === team[1]) {
          return `${team[0]} (needs partner)`;
        }
        return `${team[0]} / ${team[1]}`;
      }
      return player;
    }

    const metadata = match.tournamentMetadata;
    if (!metadata) return 'TBD';

    const sourceMatchId = slot === 'team1' ? metadata.sourceMatch1 : metadata.sourceMatch2;

    if (sourceMatchId) {
      // Check if source is a group (for qualifier tournaments)
      if (sourceMatchId.startsWith('Group ')) {
        return `Winner of ${sourceMatchId}`;
      }
      
      const sourceMatch = matches.find((m) => m.id === sourceMatchId);
      if (sourceMatch?.tournamentMetadata) {
        const pos = sourceMatch.tournamentMetadata.bracketPosition;
        if (pos) return `Winner of ${pos}`;

        const roundName = sourceMatch.tournamentMetadata.roundName;
        const matchNum = sourceMatch.tournamentMetadata.matchNumber;
        return `Winner of ${roundName} #${matchNum}`;
      }
    }

    return 'TBD';
  };

  const renderBracket = (bracketType: string, roundsMap: Map<number, Match[]>) => {
    const sortedRounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);

    return (
      <div key={bracketType} className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          {bracketType === 'winners' && 'Winners Bracket'}
          {bracketType === 'losers' && 'Losers Bracket'}
          {bracketType === 'finals' && 'Finals'}
          {bracketType === 'grand-finals' && 'Grand Finals'}
        </h3>

        {isMobile ? (
          <Carousel className="w-full">
            <CarouselContent>
              {sortedRounds.map((roundNum) => {
                const roundMatches = roundsMap.get(roundNum) || [];
                const roundName =
                  roundMatches[0]?.tournamentMetadata?.roundName || `Round ${roundNum}`;

                return (
                  <CarouselItem key={roundNum}>
                    <div className="flex flex-col gap-4 px-4">
                      <h4 className="text-center font-semibold text-sm bg-background py-2 border-b">
                        {roundName}
                      </h4>

                      <div className="flex flex-col gap-6">
                        {roundMatches.map((match) => (
                          <MatchBracketCard
                            key={match.id}
                            match={match}
                            score={matchScores.get(match.id)}
                            allMatches={matches}
                            getPlayerLabel={getPlayerLabel}
                          />
                        ))}
                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        ) : (
          <div className="flex gap-8 overflow-x-auto pb-4">
            {sortedRounds.map((roundNum) => {
              const roundMatches = roundsMap.get(roundNum) || [];
              const roundName =
                roundMatches[0]?.tournamentMetadata?.roundName || `Round ${roundNum}`;

              return (
                <div key={roundNum} className="flex flex-col gap-4 min-w-[250px]">
                  <h4 className="text-center font-semibold text-sm sticky top-0 bg-background py-2 border-b">
                    {roundName}
                  </h4>

                  <div className="flex flex-col gap-6">
                    {roundMatches.map((match) => (
                      <MatchBracketCard
                        key={match.id}
                        match={match}
                        score={matchScores.get(match.id)}
                        allMatches={matches}
                        getPlayerLabel={getPlayerLabel}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {Array.from(groupedMatches.entries()).map(([bracketType, roundsMap]) =>
        renderBracket(bracketType, roundsMap)
      )}
    </div>
  );
}

interface MatchBracketCardProps {
  match: Match;
  score: { team1: number; team2: number } | undefined;
  allMatches: Match[];
  getPlayerLabel: (match: Match, slot: 'team1' | 'team2') => string;
}

function MatchBracketCard({ match, score, allMatches, getPlayerLabel }: MatchBracketCardProps) {
  const team1Label = getPlayerLabel(match, 'team1');
  const team2Label = getPlayerLabel(match, 'team2');
  
  const isTeam1Winner = score && score.team1 > score.team2;
  const isTeam2Winner = score && score.team2 > score.team1;

  return (
    <Card
      className={cn(
        'p-3 transition-all',
        match.status === 'completed' && 'bg-green-50 dark:bg-green-950/20 border-green-500/50',
        match.status === 'in-progress' && 'bg-blue-50 dark:bg-blue-950/20 border-blue-500/50',
        match.status === 'scheduled' && 'border-primary/50',
        match.status === 'waiting' && 'opacity-60',
        match.status === 'bye' && 'opacity-40'
      )}
    >
      <div className="space-y-2">
        {/* Team 1 */}
        <div className={cn(
          "flex justify-between items-center px-2 py-1 rounded",
          isTeam1Winner && "bg-primary/10 font-bold"
        )}>
          <span className="truncate flex-1 text-sm">
            {team1Label}
          </span>
          {score && (
            <span className={cn("ml-2 font-bold", isTeam1Winner && "text-primary")}>
              {score.team1}
            </span>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Team 2 */}
        <div className={cn(
          "flex justify-between items-center px-2 py-1 rounded",
          isTeam2Winner && "bg-primary/10 font-bold"
        )}>
          <span className="truncate flex-1 text-sm">
            {team2Label}
          </span>
          {score && (
            <span className={cn("ml-2 font-bold", isTeam2Winner && "text-primary")}>
              {score.team2}
            </span>
          )}
        </div>

        {/* Match info */}
        <div className="text-xs text-muted-foreground flex justify-between items-center pt-1">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Court {match.court}
          </span>
          <div className="flex gap-1">
            {match.tournamentMetadata?.bracketPosition && (
              <Badge variant="outline" className="text-xs h-5">
                {match.tournamentMetadata.bracketPosition}
              </Badge>
            )}
            {match.status && (
              <Badge
                variant={
                  match.status === 'completed'
                    ? 'default'
                    : match.status === 'scheduled'
                    ? 'secondary'
                    : 'outline'
                }
                className="text-xs h-5"
              >
                {match.status}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
