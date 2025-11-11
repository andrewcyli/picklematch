import { Match, CourtConfig, TournamentMetadata } from './scheduler';

/**
 * Generate a complete tournament schedule (single or double elimination)
 */
export function generateTournamentSchedule(
  players: string[],
  gameDuration: number,
  courts: number,
  schedulingType: 'single-elimination' | 'double-elimination',
  courtConfigs: CourtConfig[]
): Match[] {
  // Validate player count (4-16 players)
  if (players.length < 4 || players.length > 16) {
    throw new Error('Tournament requires 4-16 players');
  }

  if (schedulingType === 'single-elimination') {
    return generateSingleEliminationBracket(players, gameDuration, courts, courtConfigs);
  } else {
    return generateDoubleEliminationBracket(players, gameDuration, courts, courtConfigs);
  }
}

/**
 * Generate single elimination bracket
 */
function generateSingleEliminationBracket(
  players: string[],
  gameDuration: number,
  courts: number,
  courtConfigs: CourtConfig[]
): Match[] {
  const bracketSize = calculateBracketSize(players.length);
  const seededPlayers = seedPlayers(players, bracketSize);
  const structure = createSingleEliminationStructure(bracketSize, gameDuration, courts, courtConfigs);
  
  return assignInitialPlayers(structure, seededPlayers);
}

/**
 * Generate double elimination bracket
 */
function generateDoubleEliminationBracket(
  players: string[],
  gameDuration: number,
  courts: number,
  courtConfigs: CourtConfig[]
): Match[] {
  const bracketSize = calculateBracketSize(players.length);
  const seededPlayers = seedPlayers(players, bracketSize);
  const structure = createDoubleEliminationStructure(bracketSize, gameDuration, courts, courtConfigs);
  
  return assignInitialPlayers(structure, seededPlayers);
}

/**
 * Calculate bracket size (next power of 2: 4, 8, or 16)
 */
function calculateBracketSize(playerCount: number): number {
  if (playerCount <= 4) return 4;
  if (playerCount <= 8) return 8;
  return 16;
}

/**
 * Seed players (1, 2, 3... with byes if needed)
 */
function seedPlayers(players: string[], bracketSize: number): Array<string | null> {
  const seeded: Array<string | null> = new Array(bracketSize).fill(null);
  
  // Standard bracket seeding order (1 vs 16, 8 vs 9, etc.)
  const seedOrder = generateSeedOrder(bracketSize);
  
  for (let i = 0; i < players.length; i++) {
    seeded[seedOrder[i]] = players[i];
  }
  
  return seeded;
}

/**
 * Generate standard bracket seed order
 */
function generateSeedOrder(size: number): number[] {
  if (size === 4) return [0, 3, 1, 2];
  if (size === 8) return [0, 7, 3, 4, 1, 6, 2, 5];
  // size === 16
  return [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
}

/**
 * Create single elimination bracket structure
 */
function createSingleEliminationStructure(
  bracketSize: number,
  gameDuration: number,
  courts: number,
  courtConfigs: CourtConfig[]
): Match[] {
  const matches: Match[] = [];
  const rounds = Math.log2(bracketSize);
  
  let matchIdCounter = 0;
  let currentTime = 0;
  let currentCourt = 0;
  
  // Generate matches for each round
  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round);
    const roundName = getRoundName(round, rounds);
    
    for (let matchNum = 0; matchNum < matchesInRound; matchNum++) {
      const matchId = `tournament-r${round}-m${matchNum + 1}`;
      const courtConfig = courtConfigs[currentCourt % courtConfigs.length];
      
      const metadata: TournamentMetadata = {
        bracketType: 'winners',
        round,
        roundName,
        matchNumber: matchNum + 1,
        bracketPosition: round === 1 ? String.fromCharCode(65 + matchNum) : undefined,
        seed1: round === 1 ? matchNum * 2 + 1 : undefined,
        seed2: round === 1 ? matchNum * 2 + 2 : undefined,
      };
      
      // Set advancement metadata
      if (round < rounds) {
        const nextMatchNum = Math.floor(matchNum / 2);
        metadata.advancesTo = `tournament-r${round + 1}-m${nextMatchNum + 1}`;
        metadata.advancesToSlot = matchNum % 2 === 0 ? 'team1' : 'team2';
      }
      
      // Set source matches for rounds after the first
      if (round > 1) {
        const prevMatch1 = matchNum * 2;
        const prevMatch2 = matchNum * 2 + 1;
        metadata.sourceMatch1 = `tournament-r${round - 1}-m${prevMatch1 + 1}`;
        metadata.sourceMatch2 = `tournament-r${round - 1}-m${prevMatch2 + 1}`;
      }
      
      matches.push({
        id: matchId,
        court: courtConfig.courtNumber,
        startTime: currentTime,
        endTime: currentTime + gameDuration,
        team1: ['TBD'] as [string],
        team2: ['TBD'] as [string],
        status: round === 1 ? 'scheduled' : 'waiting',
        isSingles: courtConfig.type === 'singles',
        isLocked: false,
        tournamentMetadata: metadata,
      });
      
      currentCourt++;
      matchIdCounter++;
      
      // Move to next time slot when all courts are used
      if (currentCourt % courts === 0) {
        currentTime += gameDuration;
      }
    }
    
    // Ensure next round starts at a new time slot
    if (currentCourt % courts !== 0) {
      currentTime += gameDuration;
      currentCourt = 0;
    }
  }
  
  return matches;
}

/**
 * Create double elimination bracket structure
 */
function createDoubleEliminationStructure(
  bracketSize: number,
  gameDuration: number,
  courts: number,
  courtConfigs: CourtConfig[]
): Match[] {
  const winnersMatches: Match[] = [];
  const losersMatches: Match[] = [];
  const rounds = Math.log2(bracketSize);
  
  let currentTime = 0;
  let currentCourt = 0;
  
  // Generate winners bracket
  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round);
    const roundName = getRoundName(round, rounds);
    
    for (let matchNum = 0; matchNum < matchesInRound; matchNum++) {
      const matchId = `tournament-w-r${round}-m${matchNum + 1}`;
      const courtConfig = courtConfigs[currentCourt % courtConfigs.length];
      
      const metadata: TournamentMetadata = {
        bracketType: 'winners',
        round,
        roundName: `Winners ${roundName}`,
        matchNumber: matchNum + 1,
        bracketPosition: round === 1 ? String.fromCharCode(65 + matchNum) : undefined,
        seed1: round === 1 ? matchNum * 2 + 1 : undefined,
        seed2: round === 1 ? matchNum * 2 + 2 : undefined,
      };
      
      // Set advancement for winners
      if (round < rounds) {
        const nextMatchNum = Math.floor(matchNum / 2);
        metadata.advancesTo = `tournament-w-r${round + 1}-m${nextMatchNum + 1}`;
        metadata.advancesToSlot = matchNum % 2 === 0 ? 'team1' : 'team2';
      } else {
        // Winners bracket final goes to grand finals
        metadata.advancesTo = 'tournament-grand-finals';
        metadata.advancesToSlot = 'team1';
      }
      
      // Set loser advancement to losers bracket
      const loserRound = (round - 1) * 2 + 1;
      if (round === 1) {
        metadata.loserAdvancesTo = `tournament-l-r1-m${matchNum + 1}`;
        metadata.loserAdvancesToSlot = 'team1';
      } else if (round < rounds) {
        const loserMatchNum = Math.floor(matchNum / 2);
        metadata.loserAdvancesTo = `tournament-l-r${loserRound}-m${loserMatchNum + 1}`;
        metadata.loserAdvancesToSlot = matchNum % 2 === 0 ? 'team1' : 'team2';
      } else {
        // Loser of winners finals goes to losers finals
        metadata.loserAdvancesTo = 'tournament-losers-finals';
        metadata.loserAdvancesToSlot = 'team2';
      }
      
      // Set source matches
      if (round > 1) {
        metadata.sourceMatch1 = `tournament-w-r${round - 1}-m${matchNum * 2 + 1}`;
        metadata.sourceMatch2 = `tournament-w-r${round - 1}-m${matchNum * 2 + 2}`;
      }
      
      winnersMatches.push({
        id: matchId,
        court: courtConfig.courtNumber,
        startTime: currentTime,
        endTime: currentTime + gameDuration,
        team1: ['TBD'] as [string],
        team2: ['TBD'] as [string],
        status: round === 1 ? 'scheduled' : 'waiting',
        isSingles: courtConfig.type === 'singles',
        isLocked: false,
        tournamentMetadata: metadata,
      });
      
      currentCourt++;
      if (currentCourt % courts === 0) {
        currentTime += gameDuration;
      }
    }
    
    if (currentCourt % courts !== 0) {
      currentTime += gameDuration;
      currentCourt = 0;
    }
  }
  
  // Generate losers bracket (simplified - 2 * (rounds - 1) rounds)
  const loserRounds = 2 * (rounds - 1);
  for (let round = 1; round <= loserRounds; round++) {
    const matchesInRound = round % 2 === 1 
      ? Math.pow(2, rounds - Math.ceil(round / 2) - 1)
      : Math.pow(2, rounds - Math.ceil(round / 2) - 1);
    
    for (let matchNum = 0; matchNum < matchesInRound; matchNum++) {
      const matchId = `tournament-l-r${round}-m${matchNum + 1}`;
      const courtConfig = courtConfigs[currentCourt % courtConfigs.length];
      
      const metadata: TournamentMetadata = {
        bracketType: 'losers',
        round,
        roundName: `Losers R${round}`,
        matchNumber: matchNum + 1,
      };
      
      // Set advancement
      if (round < loserRounds) {
        const nextMatchNum = round % 2 === 1 ? matchNum : Math.floor(matchNum / 2);
        metadata.advancesTo = `tournament-l-r${round + 1}-m${nextMatchNum + 1}`;
        metadata.advancesToSlot = round % 2 === 0 && matchNum % 2 === 1 ? 'team2' : 'team1';
      } else {
        // Losers bracket final goes to grand finals
        metadata.advancesTo = 'tournament-losers-finals';
        metadata.advancesToSlot = 'team1';
      }
      
      losersMatches.push({
        id: matchId,
        court: courtConfig.courtNumber,
        startTime: currentTime,
        endTime: currentTime + gameDuration,
        team1: ['TBD'] as [string],
        team2: ['TBD'] as [string],
        status: 'waiting',
        isSingles: courtConfig.type === 'singles',
        isLocked: false,
        tournamentMetadata: metadata,
      });
      
      currentCourt++;
      if (currentCourt % courts === 0) {
        currentTime += gameDuration;
      }
    }
    
    if (currentCourt % courts !== 0) {
      currentTime += gameDuration;
      currentCourt = 0;
    }
  }
  
  // Add losers finals
  const courtConfig = courtConfigs[0];
  losersMatches.push({
    id: 'tournament-losers-finals',
    court: courtConfig.courtNumber,
    startTime: currentTime,
    endTime: currentTime + gameDuration,
    team1: ['TBD'] as [string],
    team2: ['TBD'] as [string],
    status: 'waiting',
    isSingles: courtConfig.type === 'singles',
    isLocked: false,
    tournamentMetadata: {
      bracketType: 'finals',
      round: loserRounds + 1,
      roundName: 'Losers Finals',
      matchNumber: 1,
      advancesTo: 'tournament-grand-finals',
      advancesToSlot: 'team2',
    },
  });
  
  currentTime += gameDuration;
  
  // Add grand finals
  losersMatches.push({
    id: 'tournament-grand-finals',
    court: courtConfig.courtNumber,
    startTime: currentTime,
    endTime: currentTime + gameDuration,
    team1: ['TBD'] as [string],
    team2: ['TBD'] as [string],
    status: 'waiting',
    isSingles: courtConfig.type === 'singles',
    isLocked: false,
    tournamentMetadata: {
      bracketType: 'grand-finals',
      round: loserRounds + 2,
      roundName: 'Grand Finals',
      matchNumber: 1,
    },
  });
  
  return [...winnersMatches, ...losersMatches];
}

/**
 * Assign initial players to Round 1 matches
 */
function assignInitialPlayers(matches: Match[], seededPlayers: Array<string | null>): Match[] {
  return matches.map(match => {
    if (match.tournamentMetadata?.round === 1) {
      const seed1 = match.tournamentMetadata.seed1;
      const seed2 = match.tournamentMetadata.seed2;
      
      if (seed1 !== undefined && seed2 !== undefined) {
        const player1 = seededPlayers[seed1 - 1];
        const player2 = seededPlayers[seed2 - 1];
        
        // Handle byes
        if (!player1 && !player2) {
          return { ...match, status: 'bye' as const };
        } else if (!player1) {
          return {
            ...match,
            team1: [player2!] as [string],
            team2: [player2!] as [string],
            status: 'bye' as const,
          };
        } else if (!player2) {
          return {
            ...match,
            team1: [player1] as [string],
            team2: [player1] as [string],
            status: 'bye' as const,
          };
        } else {
          return {
            ...match,
            team1: [player1] as [string],
            team2: [player2] as [string],
            status: 'scheduled' as const,
          };
        }
      }
    }
    return match;
  });
}

/**
 * Get round name based on round number and total rounds
 */
function getRoundName(round: number, totalRounds: number): string {
  const remaining = totalRounds - round;
  
  if (remaining === 0) return 'Finals';
  if (remaining === 1) return 'Semifinals';
  if (remaining === 2) return 'Quarterfinals';
  if (remaining === 3) return 'Round of 16';
  
  return `Round ${round}`;
}
