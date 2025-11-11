import { Match } from './scheduler';

/**
 * Advance winner to next match after a tournament match is completed
 */
export function advanceWinnerToNextMatch(
  completedMatch: Match,
  winner: 'team1' | 'team2',
  allMatches: Match[]
): Match[] {
  if (!completedMatch.tournamentMetadata) {
    return allMatches;
  }

  const winnerName = completedMatch[winner][0];
  const loserName = winner === 'team1' ? completedMatch.team2[0] : completedMatch.team1[0];
  const metadata = completedMatch.tournamentMetadata;

  let updatedMatches = [...allMatches];

  // Advance winner to next match
  if (metadata.advancesTo && metadata.advancesToSlot) {
    updatedMatches = updatedMatches.map(match => {
      if (match.id === metadata.advancesTo) {
        const newMatch = {
          ...match,
          [metadata.advancesToSlot!]: [winnerName] as [string],
        };

        // Check if both slots are filled to update status
        if (newMatch.team1[0] !== 'TBD' && newMatch.team2[0] !== 'TBD') {
          newMatch.status = 'scheduled' as const;
        }

        return newMatch;
      }
      return match;
    });
  }

  // Advance loser to losers bracket (for double elimination)
  if (metadata.loserAdvancesTo && metadata.loserAdvancesToSlot) {
    updatedMatches = updatedMatches.map(match => {
      if (match.id === metadata.loserAdvancesTo) {
        const newMatch = {
          ...match,
          [metadata.loserAdvancesToSlot!]: [loserName] as [string],
        };

        // Check if both slots are filled to update status
        if (newMatch.team1[0] !== 'TBD' && newMatch.team2[0] !== 'TBD') {
          newMatch.status = 'scheduled' as const;
        }

        return newMatch;
      }
      return match;
    });
  }

  // Mark completed match
  updatedMatches = updatedMatches.map(match => {
    if (match.id === completedMatch.id) {
      return {
        ...match,
        status: 'completed' as const,
      };
    }
    return match;
  });

  // Handle bye matches - auto-advance
  updatedMatches = updatedMatches.map(match => {
    if (match.status === 'bye' && match.tournamentMetadata) {
      const byeWinner = match.team1[0];
      const byeMetadata = match.tournamentMetadata;

      if (byeMetadata.advancesTo && byeMetadata.advancesToSlot) {
        // Find and update the next match
        return match;
      }
    }
    return match;
  });

  return updatedMatches;
}

/**
 * Process all bye matches and auto-advance players
 */
export function processByeMatches(matches: Match[]): Match[] {
  let updatedMatches = [...matches];
  let hasChanges = true;

  // Loop until no more byes to process
  while (hasChanges) {
    hasChanges = false;

    updatedMatches = updatedMatches.map(match => {
      if (match.status === 'bye' && match.tournamentMetadata) {
        const byeWinner = match.team1[0];
        const metadata = match.tournamentMetadata;

        if (metadata.advancesTo && metadata.advancesToSlot && byeWinner !== 'TBD') {
          // Mark this bye as completed
          hasChanges = true;
          return {
            ...match,
            status: 'completed' as const,
            score: { team1: 0, team2: 0 },
          };
        }
      }
      return match;
    });

    // Advance bye winners
    updatedMatches = updatedMatches.map(match => {
      const byeMatches = updatedMatches.filter(m => 
        m.status === 'completed' && 
        m.tournamentMetadata?.advancesTo === match.id
      );

      if (byeMatches.length > 0) {
        let newMatch = { ...match };

        byeMatches.forEach(byeMatch => {
          if (byeMatch.tournamentMetadata) {
            const byeWinner = byeMatch.team1[0];
            const slot = byeMatch.tournamentMetadata.advancesToSlot;

            if (slot && byeWinner !== 'TBD') {
              newMatch = {
                ...newMatch,
                [slot]: [byeWinner] as [string],
              };
            }
          }
        });

        // Update status if both slots filled
        if (newMatch.team1[0] !== 'TBD' && newMatch.team2[0] !== 'TBD') {
          newMatch.status = 'scheduled' as const;
        }

        return newMatch;
      }

      return match;
    });
  }

  return updatedMatches;
}
