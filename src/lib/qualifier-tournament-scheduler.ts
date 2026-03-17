import { Match, CourtConfig, TournamentMetadata } from './scheduler';

export interface TournamentStructure {
  g4: number;  // Groups of 4
  g3: number;  // Groups of 3
  g2: number;  // Pairs
  qualifiers: number; // S (2, 4, or 8)
}

export interface QualifierMetadata {
  groupId: string;
  groupSize: 2 | 3 | 4;
  groupMatchNum: number;
  isGroupStage: boolean;
  advancesToKnockout?: boolean;
  // For groups of 4 bracket progression
  isGroupSemifinal?: boolean;
  isGroupFinal?: boolean;
  advancesToGroupMatch?: string; // For semifinals → final
  sourceGroupMatch1?: string; // For finals (which semifinals feed in)
  sourceGroupMatch2?: string;
}

/**
 * Main entry point for generating qualifier tournament schedule
 */
export function generateQualifierTournamentSchedule(
  players: string[],
  gameDuration: number,
  courts: number,
  courtConfigs: CourtConfig[],
  teammatePairs: Array<{ player1: string; player2: string }> = [],
  isSingles: boolean = false
): Match[] {
  // For doubles tournaments, convert players to teams (pairs)
  const teams = isSingles 
    ? players.map(p => [p])
    : createTeamsFromPlayers(players, teammatePairs);
  
  const teamCount = teams.length;
  
  // Validate team count (4-24)
  if (teamCount < 4 || teamCount > 24) {
    throw new Error('Qualifier tournament requires 4-24 teams');
  }
  
  // Compute structure
  const structure = computeTournamentStructure(teamCount);
  
  // Shuffle/seed teams
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  
  // Generate group stage matches
  const groupMatches = generateGroupStageMatches(
    shuffledTeams,
    structure,
    gameDuration,
    courts,
    courtConfigs,
    isSingles
  );
  
  // Generate knockout bracket structure (with TBD teams)
  const knockoutMatches = generateKnockoutBracket(
    structure.qualifiers,
    gameDuration,
    courts,
    courtConfigs,
    groupMatches[groupMatches.length - 1]?.endTime || 0,
    isSingles,
    structure.g4,
    structure.g3,
    structure.g2
  );
  
  return [...groupMatches, ...knockoutMatches];
}

/**
 * Compute tournament structure based on team count
 */
export function computeTournamentStructure(n: number): TournamentStructure {
  if (n < 4 || n > 24) {
    throw new Error('Teams must be between 4 and 24');
  }
  
  const maxS = Math.min(8, Math.floor(n / 2));
  const powers = [8, 4, 2, 1];
  
  for (const s of powers) {
    if (s > maxS) continue;
    
    const d = n - 2 * s;
    if (d < 0) continue;
    
    for (let g4 = 0; g4 <= Math.floor(d / 2); g4++) {
      const g3 = d - 2 * g4;
      const g2 = s - g4 - g3;
      
      if (g2 >= 0) {
        return { g4, g3, g2, qualifiers: s };
      }
    }
  }
  
  throw new Error('No valid structure found');
}

/**
 * Create teams from players and pairs
 */
function createTeamsFromPlayers(
  players: string[],
  teammatePairs: Array<{ player1: string; player2: string }>
): string[][] {
  const teams: string[][] = [];
  const pairedPlayers = new Set<string>();
  
  // Add existing pairs as teams
  teammatePairs.forEach(pair => {
    if (players.includes(pair.player1) && players.includes(pair.player2)) {
      teams.push([pair.player1, pair.player2]);
      pairedPlayers.add(pair.player1);
      pairedPlayers.add(pair.player2);
    }
  });
  
  // Collect unpaired players
  const unpairedPlayers = players.filter(p => !pairedPlayers.has(p));
  
  // Randomly pair unpaired players
  const shuffled = [...unpairedPlayers].sort(() => Math.random() - 0.5);
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      teams.push([shuffled[i], shuffled[i + 1]]);
    } else {
      // Odd player out - pair with themselves
      teams.push([shuffled[i], shuffled[i]]);
    }
  }
  
  return teams;
}

/**
 * Generate group stage matches
 */
function generateGroupStageMatches(
  teams: string[][],
  structure: TournamentStructure,
  gameDuration: number,
  courts: number,
  courtConfigs: CourtConfig[],
  isSingles: boolean
): Match[] {
  const matches: Match[] = [];
  let teamIndex = 0;
  
  // Track when each court will be available
  const courtAvailability = new Array(courts).fill(0);
  
  // Create groups and their matches
  const groups: { id: string; size: number; teams: string[][] }[] = [];
  
  // Groups of 4
  for (let i = 0; i < structure.g4; i++) {
    const groupTeams = teams.slice(teamIndex, teamIndex + 4);
    teamIndex += 4;
    groups.push({
      id: String.fromCharCode(65 + groups.length),
      size: 4,
      teams: groupTeams
    });
  }
  
  // Groups of 3
  for (let i = 0; i < structure.g3; i++) {
    const groupTeams = teams.slice(teamIndex, teamIndex + 3);
    teamIndex += 3;
    groups.push({
      id: String.fromCharCode(65 + groups.length),
      size: 3,
      teams: groupTeams
    });
  }
  
  // Pairs (groups of 2)
  for (let i = 0; i < structure.g2; i++) {
    const groupTeams = teams.slice(teamIndex, teamIndex + 2);
    teamIndex += 2;
    groups.push({
      id: String.fromCharCode(65 + groups.length),
      size: 2,
      teams: groupTeams
    });
  }
  
  // Generate matches for each group
  groups.forEach(group => {
    const groupMatches = generateRoundRobinForGroup(
      group.teams,
      group.id,
      group.size as 2 | 3 | 4,
      isSingles
    );
    
    groupMatches.forEach((match, idx) => {
      // Find the court that will be available earliest
      const courtIndex = courtAvailability.indexOf(Math.min(...courtAvailability));
      const courtConfig = courtConfigs[courtIndex % courtConfigs.length];
      const startTime = courtAvailability[courtIndex];
      
      const metadata: QualifierMetadata = {
        groupId: `Group ${group.id}`,
        groupSize: group.size as 2 | 3 | 4,
        groupMatchNum: idx + 1,
        isGroupStage: true,
        advancesToKnockout: group.size !== 4 || idx === 2, // Only final of G4 advances
      };
      
      // For groups of 4, add bracket progression metadata
      if (group.size === 4) {
        if (idx === 0 || idx === 1) {
          // Semifinals
          metadata.isGroupSemifinal = true;
          metadata.advancesToGroupMatch = `qual-g${group.id}-m3`; // Advance to final
        } else if (idx === 2) {
          // Final
          metadata.isGroupFinal = true;
          metadata.sourceGroupMatch1 = `qual-g${group.id}-m1`;
          metadata.sourceGroupMatch2 = `qual-g${group.id}-m2`;
        }
      }
      
      matches.push({
        id: `qual-g${group.id}-m${idx + 1}`,
        court: courtConfig.courtNumber,
        startTime: startTime,
        endTime: startTime + gameDuration,
        team1: match.team1!,
        team2: match.team2!,
        status: match.team1![0] === 'TBD' ? 'waiting' : 'scheduled',
        isSingles: match.isSingles,
        isLocked: false,
        qualifierMetadata: metadata
      });
      
      // Update court availability
      courtAvailability[courtIndex] += gameDuration;
    });
  });
  
  return matches;
}

/**
 * Generate round-robin matches for a group
 */
function generateRoundRobinForGroup(
  teams: string[][],
  groupId: string,
  groupSize: 2 | 3 | 4,
  isSingles: boolean
): Partial<Match>[] {
  const matches: Partial<Match>[] = [];
  
  if (groupSize === 2) {
    // Single match
    matches.push({
      team1: isSingles ? [teams[0][0]] as [string] : [teams[0][0], teams[0][1] || teams[0][0]] as [string, string],
      team2: isSingles ? [teams[1][0]] as [string] : [teams[1][0], teams[1][1] || teams[1][0]] as [string, string],
      isSingles
    });
  } else if (groupSize === 3) {
    // 3 matches: 0v1, 0v2, 1v2
    const pairs = [[0, 1], [0, 2], [1, 2]];
    pairs.forEach(([i, j]) => {
      matches.push({
        team1: isSingles ? [teams[i][0]] as [string] : [teams[i][0], teams[i][1] || teams[i][0]] as [string, string],
        team2: isSingles ? [teams[j][0]] as [string] : [teams[j][0], teams[j][1] || teams[j][0]] as [string, string],
        isSingles
      });
    });
  } else if (groupSize === 4) {
    // Single elimination bracket (3 matches)
    // Semifinal 1: Team 0 vs Team 1
    matches.push({
      team1: isSingles ? [teams[0][0]] as [string] : [teams[0][0], teams[0][1] || teams[0][0]] as [string, string],
      team2: isSingles ? [teams[1][0]] as [string] : [teams[1][0], teams[1][1] || teams[1][0]] as [string, string],
      isSingles
    });
    
    // Semifinal 2: Team 2 vs Team 3
    matches.push({
      team1: isSingles ? [teams[2][0]] as [string] : [teams[2][0], teams[2][1] || teams[2][0]] as [string, string],
      team2: isSingles ? [teams[3][0]] as [string] : [teams[3][0], teams[3][1] || teams[3][0]] as [string, string],
      isSingles
    });
    
    // Final: Winner of M1 vs Winner of M2 (TBD initially)
    matches.push({
      team1: isSingles ? ['TBD'] as [string] : ['TBD', 'TBD'] as [string, string],
      team2: isSingles ? ['TBD'] as [string] : ['TBD', 'TBD'] as [string, string],
      isSingles
    });
  }
  
  return matches;
}

/**
 * Generate knockout bracket structure
 */
function generateKnockoutBracket(
  qualifierCount: number,
  gameDuration: number,
  courts: number,
  courtConfigs: CourtConfig[],
  startTime: number,
  isSingles: boolean,
  g4Count: number,
  g3Count: number,
  g2Count: number
): Match[] {
  const matches: Match[] = [];
  const rounds = Math.log2(qualifierCount);
  
  // Track when each court will be available (start from group stage end time)
  const courtAvailability = new Array(courts).fill(startTime);
  
  // Generate matches for each round
  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round);
    const roundName = getRoundName(round, rounds);
    
    // Reset court tracking for new round to ensure even distribution
    if (round > 1) {
      const maxTime = Math.max(...courtAvailability);
      courtAvailability.fill(maxTime);
    }
    
    for (let matchNum = 0; matchNum < matchesInRound; matchNum++) {
      const matchId = `knockout-r${round}-m${matchNum + 1}`;
      
      // Find the court that will be available earliest
      const courtIndex = courtAvailability.indexOf(Math.min(...courtAvailability));
      const courtConfig = courtConfigs[courtIndex % courtConfigs.length];
      const matchStartTime = courtAvailability[courtIndex];
      
      const metadata: TournamentMetadata = {
        bracketType: 'winners',
        round,
        roundName,
        matchNumber: matchNum + 1,
      };
      
      // Set advancement metadata
      if (round < rounds) {
        const nextMatchNum = Math.floor(matchNum / 2);
        metadata.advancesTo = `knockout-r${round + 1}-m${nextMatchNum + 1}`;
        metadata.advancesToSlot = matchNum % 2 === 0 ? 'team1' : 'team2';
      }
      
      // Set source groups for first round
      if (round === 1) {
        const groupIndex1 = matchNum * 2;
        const groupIndex2 = matchNum * 2 + 1;
        const groupId1 = String.fromCharCode(65 + groupIndex1);
        const groupId2 = String.fromCharCode(65 + groupIndex2);
        metadata.sourceMatch1 = `Group ${groupId1}`;
        metadata.sourceMatch2 = `Group ${groupId2}`;
      } else {
        // Set source matches for rounds after the first
        const prevMatch1 = matchNum * 2;
        const prevMatch2 = matchNum * 2 + 1;
        metadata.sourceMatch1 = `knockout-r${round - 1}-m${prevMatch1 + 1}`;
        metadata.sourceMatch2 = `knockout-r${round - 1}-m${prevMatch2 + 1}`;
      }
      
      matches.push({
        id: matchId,
        court: courtConfig.courtNumber,
        startTime: matchStartTime,
        endTime: matchStartTime + gameDuration,
        team1: isSingles ? ['TBD'] as [string] : ['TBD', 'TBD'] as [string, string],
        team2: isSingles ? ['TBD'] as [string] : ['TBD', 'TBD'] as [string, string],
        status: 'waiting',
        isSingles: isSingles,
        isLocked: false,
        tournamentMetadata: metadata,
      });
      
      // Update court availability
      courtAvailability[courtIndex] += gameDuration;
    }
  }
  
  return matches;
}

/**
 * Get round name based on round number and total rounds
 */
function getRoundName(round: number, totalRounds: number): string {
  const remaining = totalRounds - round;
  
  if (remaining === 0) return 'Final';
  if (remaining === 1) return 'Semifinals';
  if (remaining === 2) return 'Quarterfinals';
  
  return `Round ${round}`;
}
