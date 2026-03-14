import { Match } from './scheduler';

export interface GroupStanding {
  team: string[];
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
}

/**
 * Calculate group standings from completed matches
 */
export function calculateGroupStandings(
  groupMatches: Match[],
  matchScores: Map<string, { team1: number; team2: number }>
): GroupStanding[] {
  const standingsMap = new Map<string, GroupStanding>();
  
  // Initialize standings for all teams
  groupMatches.forEach(match => {
    const team1Key = match.team1.join(',');
    const team2Key = match.team2.join(',');
    
    if (!standingsMap.has(team1Key)) {
      standingsMap.set(team1Key, {
        team: [...match.team1],
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifferential: 0
      });
    }
    
    if (!standingsMap.has(team2Key)) {
      standingsMap.set(team2Key, {
        team: [...match.team2],
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifferential: 0
      });
    }
  });
  
  // Calculate standings from completed matches
  groupMatches.forEach(match => {
    const score = matchScores.get(match.id);
    if (!score) return; // Match not completed
    
    const team1Key = match.team1.join(',');
    const team2Key = match.team2.join(',');
    
    const team1Standing = standingsMap.get(team1Key)!;
    const team2Standing = standingsMap.get(team2Key)!;
    
    team1Standing.pointsFor += score.team1;
    team1Standing.pointsAgainst += score.team2;
    team2Standing.pointsFor += score.team2;
    team2Standing.pointsAgainst += score.team1;
    
    if (score.team1 > score.team2) {
      team1Standing.wins++;
      team2Standing.losses++;
    } else if (score.team2 > score.team1) {
      team2Standing.wins++;
      team1Standing.losses++;
    }
    
    team1Standing.pointDifferential = team1Standing.pointsFor - team1Standing.pointsAgainst;
    team2Standing.pointDifferential = team2Standing.pointsFor - team2Standing.pointsAgainst;
  });
  
  return Array.from(standingsMap.values());
}

/**
 * Determine winner for groups of 4 (single elimination)
 * Winner is simply the winner of the final match (match 3)
 */
export function determineGroupOf4Winner(
  groupMatches: Match[],
  matchScores: Map<string, { team1: number; team2: number }>
): string[] | null {
  // Find the final match (match 3)
  const finalMatch = groupMatches.find(m => 
    m.qualifierMetadata?.isGroupFinal
  );
  
  if (!finalMatch) return null;
  
  const finalScore = matchScores.get(finalMatch.id);
  if (!finalScore) return null; // Final not complete
  
  // Return winner of final
  return finalScore.team1 > finalScore.team2 
    ? finalMatch.team1 
    : finalMatch.team2;
}

/**
 * Determine group winner with tie-breaking
 */
export function determineGroupWinner(
  standings: GroupStanding[],
  groupMatches: Match[],
  matchScores: Map<string, { team1: number; team2: number }>
): string[] | null {
  if (standings.length === 0 && groupMatches.length === 0) return null;
  
  // For groups of 4, use bracket winner (not standings)
  const groupSize = groupMatches[0]?.qualifierMetadata?.groupSize;
  if (groupSize === 4) {
    return determineGroupOf4Winner(groupMatches, matchScores);
  }
  
  if (standings.length === 0) return null;
  
  // Sort by tie-breaking rules
  const sorted = [...standings].sort((a, b) => {
    // 1. Most wins
    if (a.wins !== b.wins) return b.wins - a.wins;
    
    // 2. Point differential
    if (a.pointDifferential !== b.pointDifferential) {
      return b.pointDifferential - a.pointDifferential;
    }
    
    // 3. Head-to-head (if 2-way tie)
    if (standings.length === 2) {
      const h2hMatch = groupMatches.find(m => 
        (m.team1.join(',') === a.team.join(',') && m.team2.join(',') === b.team.join(',')) ||
        (m.team1.join(',') === b.team.join(',') && m.team2.join(',') === a.team.join(','))
      );
      
      if (h2hMatch) {
        const score = matchScores.get(h2hMatch.id);
        if (score) {
          const aIsTeam1 = h2hMatch.team1.join(',') === a.team.join(',');
          const aScore = aIsTeam1 ? score.team1 : score.team2;
          const bScore = aIsTeam1 ? score.team2 : score.team1;
          if (aScore !== bScore) return bScore - aScore;
        }
      }
    }
    
    // 4. Points scored
    if (a.pointsFor !== b.pointsFor) return b.pointsFor - a.pointsFor;
    
    // 5. Alphabetical (deterministic fallback)
    return a.team.join(',').localeCompare(b.team.join(','));
  });
  
  return sorted[0].team;
}

/**
 * Check if all matches in a group are completed
 */
export function isGroupComplete(
  groupMatches: Match[],
  matchScores: Map<string, { team1: number; team2: number }>
): boolean {
  const groupSize = groupMatches[0]?.qualifierMetadata?.groupSize;
  
  // For groups of 4, only final match needs to be complete
  if (groupSize === 4) {
    const finalMatch = groupMatches.find(m => 
      m.qualifierMetadata?.isGroupFinal
    );
    return finalMatch ? matchScores.has(finalMatch.id) : false;
  }
  
  // For groups of 2 and 3, all matches must be complete
  return groupMatches.every(m => matchScores.has(m.id));
}

/**
 * Advance group winners to knockout bracket
 */
export function advanceGroupWinnersToKnockout(
  allMatches: Match[],
  matchScores: Map<string, { team1: number; team2: number }>
): Match[] {
  const updatedMatches = [...allMatches];
  
  // Get all unique groups
  const groups = new Map<string, Match[]>();
  allMatches.forEach(match => {
    if (match.qualifierMetadata?.isGroupStage) {
      const groupId = match.qualifierMetadata.groupId;
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(match);
    }
  });
  
  // Check each group for completion and advance winners
  groups.forEach((groupMatches, groupId) => {
    if (!isGroupComplete(groupMatches, matchScores)) return;
    
    const standings = calculateGroupStandings(groupMatches, matchScores);
    const winner = determineGroupWinner(standings, groupMatches, matchScores);
    
    if (!winner) return;
    
    // Find the knockout match that this group advances to
    const knockoutMatches = updatedMatches.filter(m => 
      !m.qualifierMetadata?.isGroupStage && 
      m.tournamentMetadata &&
      (m.tournamentMetadata.sourceMatch1 === groupId || 
       m.tournamentMetadata.sourceMatch2 === groupId)
    );
    
    knockoutMatches.forEach(knockoutMatch => {
      const metadata = knockoutMatch.tournamentMetadata!;
      const matchIndex = updatedMatches.findIndex(m => m.id === knockoutMatch.id);
      
      if (metadata.sourceMatch1 === groupId) {
        updatedMatches[matchIndex] = {
          ...knockoutMatch,
          team1: knockoutMatch.isSingles 
            ? [winner[0]] as [string]
            : [winner[0], winner[1] || winner[0]] as [string, string]
        };
      } else if (metadata.sourceMatch2 === groupId) {
        updatedMatches[matchIndex] = {
          ...knockoutMatch,
          team2: knockoutMatch.isSingles
            ? [winner[0]] as [string]
            : [winner[0], winner[1] || winner[0]] as [string, string]
        };
      }
      
      // Update status to scheduled if both teams are filled
      const updatedMatch = updatedMatches[matchIndex];
      if (!updatedMatch.team1.includes('TBD') && !updatedMatch.team2.includes('TBD')) {
        updatedMatches[matchIndex] = {
          ...updatedMatch,
          status: 'scheduled'
        };
      }
    });
  });
  
  return updatedMatches;
}

/**
 * Advance winners within group of 4 brackets (semifinals → final)
 */
export function advanceWithinGroupBrackets(
  allMatches: Match[],
  matchScores: Map<string, { team1: number; team2: number }>
): Match[] {
  const updatedMatches = [...allMatches];
  
  // Find all completed semifinal matches in groups of 4
  const semifinalMatches = allMatches.filter(m => 
    m.qualifierMetadata?.isGroupSemifinal && 
    matchScores.has(m.id)
  );
  
  semifinalMatches.forEach(semifinal => {
    const score = matchScores.get(semifinal.id)!;
    const winner = score.team1 > score.team2 
      ? semifinal.team1 
      : semifinal.team2;
    
    const nextMatchId = semifinal.qualifierMetadata?.advancesToGroupMatch;
    if (!nextMatchId) return;
    
    // Find the final match this advances to
    const finalMatchIndex = updatedMatches.findIndex(m => m.id === nextMatchId);
    if (finalMatchIndex === -1) return;
    
    const finalMatch = updatedMatches[finalMatchIndex];
    const metadata = finalMatch.qualifierMetadata;
    
    // Determine which slot to fill (team1 or team2)
    const isFirstSemifinal = metadata?.sourceGroupMatch1 === semifinal.id;
    
    if (isFirstSemifinal) {
      updatedMatches[finalMatchIndex] = {
        ...finalMatch,
        team1: finalMatch.isSingles
          ? [winner[0]] as [string]
          : [winner[0], winner[1] || winner[0]] as [string, string]
      };
    } else {
      updatedMatches[finalMatchIndex] = {
        ...finalMatch,
        team2: finalMatch.isSingles
          ? [winner[0]] as [string]
          : [winner[0], winner[1] || winner[0]] as [string, string]
      };
    }
    
    // Update status to scheduled if both teams are filled
    const updated = updatedMatches[finalMatchIndex];
    if (!updated.team1.includes('TBD') && !updated.team2.includes('TBD')) {
      updatedMatches[finalMatchIndex] = {
        ...updated,
        status: 'scheduled'
      };
    }
  });
  
  return updatedMatches;
}

/**
 * Advance knockout match winner (reuse existing tournament progression logic)
 */
export function advanceKnockoutWinner(
  completedMatch: Match,
  winner: 'team1' | 'team2',
  allMatches: Match[]
): Match[] {
  const updatedMatches = [...allMatches];
  const metadata = completedMatch.tournamentMetadata;
  
  if (!metadata?.advancesTo) return updatedMatches;
  
  const winningTeam = winner === 'team1' ? completedMatch.team1 : completedMatch.team2;
  const nextMatchId = metadata.advancesTo;
  const nextSlot = metadata.advancesToSlot;
  
  const nextMatchIndex = updatedMatches.findIndex(m => m.id === nextMatchId);
  if (nextMatchIndex === -1) return updatedMatches;
  
  const nextMatch = updatedMatches[nextMatchIndex];
  
  // Update the next match with the winner
  if (nextSlot === 'team1') {
    updatedMatches[nextMatchIndex] = {
      ...nextMatch,
      team1: nextMatch.isSingles
        ? [winningTeam[0]] as [string]
        : [winningTeam[0], winningTeam[1] || winningTeam[0]] as [string, string]
    };
  } else {
    updatedMatches[nextMatchIndex] = {
      ...nextMatch,
      team2: nextMatch.isSingles
        ? [winningTeam[0]] as [string]
        : [winningTeam[0], winningTeam[1] || winningTeam[0]] as [string, string]
    };
  }
  
  // Update status to scheduled if both teams are filled
  const updatedMatch = updatedMatches[nextMatchIndex];
  if (!updatedMatch.team1.includes('TBD') && !updatedMatch.team2.includes('TBD')) {
    updatedMatches[nextMatchIndex] = {
      ...updatedMatch,
      status: 'scheduled'
    };
  }
  
  return updatedMatches;
}
