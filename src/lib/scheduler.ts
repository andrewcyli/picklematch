export interface Match {
  id: string;
  court: number;
  startTime: number;
  endTime: number;
  clockStartTime?: string;
  clockEndTime?: string;
  team1: [string, string] | [string];
  team2: [string, string] | [string];
  score?: {
    team1: number;
    team2: number;
  };
  status?: 'scheduled' | 'in-progress' | 'completed';
  actualEndTime?: number;
  isSingles?: boolean;
}

export interface CourtConfig {
  courtNumber: number;
  type: 'singles' | 'doubles';
}

export interface TeammatePair {
  player1: string;
  player2: string;
}

interface PlayerStats {
  playTime: number;
  restTime: number;
  partners: Set<string>;
  opponents: Set<string>;
  lastMatchEnd: number;
  recentPartners: string[]; // Track last 3 partners
  recentOpponents: string[]; // Track last 6 opponents
  consecutiveMatches: number; // Count consecutive matches without rest
}

export function generateSchedule(
  players: string[],
  gameDuration: number,
  totalTime: number,
  courts: number,
  startTime?: string,
  teammatePairs: TeammatePair[] = [],
  courtConfigs: CourtConfig[] = []
): Match[] {
  const matches: Match[] = [];
  const playerStats = new Map<string, PlayerStats>();

  // Initialize player stats
  players.forEach((player) => {
    playerStats.set(player, {
      playTime: 0,
      restTime: 0,
      partners: new Set(),
      opponents: new Set(),
      lastMatchEnd: 0,
      recentPartners: [],
      recentOpponents: [],
      consecutiveMatches: 0,
    });
  });

  const totalSlots = Math.floor(totalTime / gameDuration);
  const matchesPerSlot = courts;
  
  const finalCourtConfigs = courtConfigs.length > 0 
    ? courtConfigs 
    : Array.from({ length: courts }, (_, i) => ({ courtNumber: i + 1, type: 'doubles' as const }));

  let matchId = 0;

  for (let slot = 0; slot < totalSlots; slot++) {
    const slotStartTime = slot * gameDuration;
    const slotEndTime = slotStartTime + gameDuration;
    
    // Get players scheduled in previous slot by court
    const previousSlotPlayersByCourt = new Map<number, Set<string>>();
    if (slot > 0) {
      const prevSlotStart = (slot - 1) * gameDuration;
      matches
        .filter(m => m.startTime === prevSlotStart)
        .forEach(m => {
          const playersInMatch = new Set([...m.team1, ...m.team2]);
          previousSlotPlayersByCourt.set(m.court, playersInMatch);
        });
    }
    
    // Determine available players for this slot (rest management)
    const availablePlayers = new Set(players);
    const minPlayersNeeded = finalCourtConfigs.reduce((acc, config) => 
      acc + (config.type === 'singles' ? 2 : 4), 0
    );
    
    players.forEach((player) => {
      const stats = playerStats.get(player)!;
      
      // Only apply rest if player just finished playing
      if (stats.lastMatchEnd === slotStartTime) {
        // HARD LIMIT: Force rest after 3 consecutive matches
        if (stats.consecutiveMatches >= 3 && availablePlayers.size > minPlayersNeeded) {
          availablePlayers.delete(player);
          stats.restTime += gameDuration;
          stats.consecutiveMatches = 0;
        }
        // Strong encouragement: 85% rest after 2 consecutive
        else if (stats.consecutiveMatches >= 2 && availablePlayers.size > minPlayersNeeded && Math.random() < 0.85) {
          availablePlayers.delete(player);
          stats.restTime += gameDuration;
          stats.consecutiveMatches = 0;
        }
        // Light encouragement: 50% rest after 1 match
        else if (stats.consecutiveMatches >= 1 && availablePlayers.size > minPlayersNeeded && Math.random() < 0.5) {
          availablePlayers.delete(player);
          stats.restTime += gameDuration;
          stats.consecutiveMatches = 0;
        }
      }
    });

    // Track which players are scheduled in this slot (prevents court conflicts)
    const playersScheduledThisSlot = new Set<string>();
    
    for (let court = 0; court < matchesPerSlot; court++) {
      const courtConfig = finalCourtConfigs[court];
      const playersNeeded = courtConfig.type === 'singles' ? 2 : 4;
      const courtNumber = court + 1;
      
      // Get players on OTHER courts in previous slot (avoid cross-court conflicts)
      const playersOnOtherCourtsPrevSlot = new Set<string>();
      previousSlotPlayersByCourt.forEach((players, prevCourt) => {
        if (prevCourt !== courtNumber) {
          players.forEach(p => playersOnOtherCourtsPrevSlot.add(p));
        }
      });
      
      // Available for this specific court
      const availableForThisCourt = Array.from(availablePlayers).filter(
        p => !playersScheduledThisSlot.has(p) && !playersOnOtherCourtsPrevSlot.has(p)
      );
      
      if (availableForThisCourt.length < playersNeeded) continue;
      
      const match = createOptimalMatch(
        availableForThisCourt,
        playerStats,
        slotStartTime,
        slotEndTime,
        courtNumber,
        teammatePairs,
        courtConfig.type
      );

      if (match) {
        const matchWithId = { ...match, id: `match-${matchId++}` };
        
        if (startTime) {
          const [hours, minutes] = startTime.split(':').map(Number);
          const baseMinutes = hours * 60 + minutes;
          const matchStartMinutes = baseMinutes + slotStartTime;
          const matchEndMinutes = matchStartMinutes + gameDuration;
          matchWithId.clockStartTime = formatTime(matchStartMinutes);
          matchWithId.clockEndTime = formatTime(matchEndMinutes);
        }
        
        matches.push(matchWithId);
        
        // Update stats for all players in match
        [...match.team1, ...match.team2].forEach((player) => {
          const stats = playerStats.get(player)!;
          stats.playTime += gameDuration;
          stats.lastMatchEnd = slotEndTime;
          stats.consecutiveMatches++;
          availablePlayers.delete(player);
          playersScheduledThisSlot.add(player);

          // Track partnerships and opponents
          if (match.isSingles) {
            const opponent = match.team1[0] === player ? match.team2[0] : match.team1[0];
            stats.opponents.add(opponent);
            stats.recentOpponents.unshift(opponent);
            if (stats.recentOpponents.length > 4) stats.recentOpponents.pop();
          } else {
            const [p1, p2] = match.team1 as [string, string];
            const [p3, p4] = match.team2 as [string, string];
            
            let partner: string;
            let opp1: string, opp2: string;
            
            if (player === p1) { partner = p2; opp1 = p3; opp2 = p4; }
            else if (player === p2) { partner = p1; opp1 = p3; opp2 = p4; }
            else if (player === p3) { partner = p4; opp1 = p1; opp2 = p2; }
            else { partner = p3; opp1 = p1; opp2 = p2; }
            
            stats.partners.add(partner);
            stats.recentPartners.unshift(partner);
            if (stats.recentPartners.length > 3) stats.recentPartners.pop();
            
            stats.opponents.add(opp1);
            stats.opponents.add(opp2);
            stats.recentOpponents.unshift(opp1, opp2);
            if (stats.recentOpponents.length > 4) stats.recentOpponents.pop();
          }
        });
      }
    }
  }

  return matches;
}

function createOptimalMatch(
  availablePlayers: string[],
  playerStats: Map<string, PlayerStats>,
  startTime: number,
  endTime: number,
  court: number,
  teammatePairs: TeammatePair[] = [],
  matchType: 'singles' | 'doubles' = 'doubles'
): Match | null {
  const playersNeeded = matchType === 'singles' ? 2 : 4;
  if (availablePlayers.length < playersNeeded) return null;

  // SINGLES LOGIC
  if (matchType === 'singles') {
    // Pick 2 fairest players (least play time)
    const sortedByFairness = [...availablePlayers].sort((a, b) => {
      const statsA = playerStats.get(a)!;
      const statsB = playerStats.get(b)!;
      return statsA.playTime - statsB.playTime;
    });
    
    // Get top candidates (players with similar low play time)
    const minPlayTime = playerStats.get(sortedByFairness[0])!.playTime;
    const fairCandidates = sortedByFairness.filter(p => 
      playerStats.get(p)!.playTime <= minPlayTime + 15
    );
    
    // Randomize from fair candidates
    const shuffled = fairCandidates.sort(() => Math.random() - 0.5);
    const [p1, p2] = shuffled.slice(0, 2);
    
    return {
      id: "",
      court,
      startTime,
      endTime,
      team1: [p1] as [string],
      team2: [p2] as [string],
      status: 'scheduled',
      isSingles: true,
    };
  }

  // DOUBLES LOGIC - Start from scratch with clean approach
  
  // Step 1: Identify the fairest players (those with least play time)
  const sortedByFairness = [...availablePlayers].sort((a, b) => {
    const statsA = playerStats.get(a)!;
    const statsB = playerStats.get(b)!;
    return statsA.playTime - statsB.playTime;
  });
  
  // Get players within fairness window (within 15 min of least played)
  const minPlayTime = playerStats.get(sortedByFairness[0])!.playTime;
  const fairCandidates = sortedByFairness.filter(p => 
    playerStats.get(p)!.playTime <= minPlayTime + 15
  );
  
  // Need at least 4 candidates for doubles
  const candidatePool = fairCandidates.length >= 4 ? fairCandidates : sortedByFairness.slice(0, Math.min(8, sortedByFairness.length));
  
  // Step 2: Try multiple random combinations from fair candidates
  let bestMatch: Match | null = null;
  let bestScore = -Infinity;
  const attempts = Math.min(50, candidatePool.length * 5);
  
  for (let i = 0; i < attempts; i++) {
    // Randomly pick 4 players from candidate pool
    const shuffled = [...candidatePool].sort(() => Math.random() - 0.5);
    const fourPlayers = shuffled.slice(0, 4);
    
    if (fourPlayers.length < 4) continue;
    
    const [p1, p2, p3, p4] = fourPlayers;
    
    // Check for bound pairs (teammates that must stay together)
    const isBoundPair12 = teammatePairs.some(pair => 
      (pair.player1 === p1 && pair.player2 === p2) || (pair.player1 === p2 && pair.player2 === p1)
    );
    const isBoundPair13 = teammatePairs.some(pair => 
      (pair.player1 === p1 && pair.player2 === p3) || (pair.player1 === p3 && pair.player2 === p1)
    );
    const isBoundPair14 = teammatePairs.some(pair => 
      (pair.player1 === p1 && pair.player2 === p4) || (pair.player1 === p4 && pair.player2 === p1)
    );
    const isBoundPair23 = teammatePairs.some(pair => 
      (pair.player1 === p2 && pair.player2 === p3) || (pair.player1 === p3 && pair.player2 === p2)
    );
    const isBoundPair24 = teammatePairs.some(pair => 
      (pair.player1 === p2 && pair.player2 === p4) || (pair.player1 === p4 && pair.player2 === p2)
    );
    const isBoundPair34 = teammatePairs.some(pair => 
      (pair.player1 === p3 && pair.player2 === p4) || (pair.player1 === p4 && pair.player2 === p3)
    );
    
    // Generate valid team configurations based on bound pairs
    const configs: [[string, string], [string, string]][] = [];
    
    if (isBoundPair12 && isBoundPair34) {
      configs.push([[p1, p2], [p3, p4]]);
    } else if (isBoundPair12) {
      configs.push([[p1, p2], [p3, p4]]);
    } else if (isBoundPair13 && isBoundPair24) {
      configs.push([[p1, p3], [p2, p4]]);
    } else if (isBoundPair13) {
      configs.push([[p1, p3], [p2, p4]]);
    } else if (isBoundPair14 && isBoundPair23) {
      configs.push([[p1, p4], [p2, p3]]);
    } else if (isBoundPair14) {
      configs.push([[p1, p4], [p2, p3]]);
    } else if (isBoundPair23) {
      configs.push([[p2, p3], [p1, p4]]);
    } else if (isBoundPair24) {
      configs.push([[p2, p4], [p1, p3]]);
    } else if (isBoundPair34) {
      configs.push([[p3, p4], [p1, p2]]);
    } else {
      // No bound pairs, try all 3 configurations
      configs.push(
        [[p1, p2], [p3, p4]],
        [[p1, p3], [p2, p4]],
        [[p1, p4], [p2, p3]]
      );
    }
    
    // Evaluate each configuration
    for (const [team1, team2] of configs) {
      const score = evaluateMatch(team1, team2, playerStats, teammatePairs);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          id: "",
          court,
          startTime,
          endTime,
          team1,
          team2,
          status: 'scheduled',
        };
      }
    }
  }
  
  return bestMatch;
}

function evaluateMatch(
  team1: [string, string],
  team2: [string, string],
  playerStats: Map<string, PlayerStats>,
  teammatePairs: TeammatePair[] = []
): number {
  let score = 0;
  const [p1, p2] = team1;
  const [p3, p4] = team2;
  
  const stats1 = playerStats.get(p1)!;
  const stats2 = playerStats.get(p2)!;
  const stats3 = playerStats.get(p3)!;
  const stats4 = playerStats.get(p4)!;
  
  // 1. FAIRNESS - Heavily reward balanced play time
  const playTimes = [stats1.playTime, stats2.playTime, stats3.playTime, stats4.playTime];
  const avgPlayTime = playTimes.reduce((a, b) => a + b, 0) / 4;
  const variance = playTimes.reduce((sum, time) => sum + Math.abs(time - avgPlayTime), 0);
  score -= variance * 2; // Strong fairness penalty
  
  // 2. RANDOMIZATION - Small random bonus (adds variety within fair choices)
  score += Math.random() * 10;
  
  // 3. AVOID RECENT PARTNERSHIPS (unless bound)
  const isBoundPair1 = teammatePairs.some(pair => 
    (pair.player1 === p1 && pair.player2 === p2) || (pair.player1 === p2 && pair.player2 === p1)
  );
  const isBoundPair2 = teammatePairs.some(pair => 
    (pair.player1 === p3 && pair.player2 === p4) || (pair.player1 === p4 && pair.player2 === p3)
  );
  
  // Reward bound pairs
  if (isBoundPair1) score += 100;
  if (isBoundPair2) score += 100;
  
  // Penalize recent partnerships (unless bound)
  if (!isBoundPair1) {
    if (stats1.recentPartners[0] === p2) score -= 40;
    else if (stats1.recentPartners.includes(p2)) score -= 20;
  }
  if (!isBoundPair2) {
    if (stats3.recentPartners[0] === p4) score -= 40;
    else if (stats3.recentPartners.includes(p4)) score -= 20;
  }
  
  // 4. AVOID RECENT OPPONENTS
  if (stats1.recentOpponents.slice(0, 2).includes(p3)) score -= 30;
  if (stats1.recentOpponents.slice(0, 2).includes(p4)) score -= 30;
  if (stats2.recentOpponents.slice(0, 2).includes(p3)) score -= 30;
  if (stats2.recentOpponents.slice(0, 2).includes(p4)) score -= 30;
  
  return score;
}

function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function regenerateScheduleFromSlot(
  players: string[],
  playedMatches: Match[],
  fromSlotStart: number,
  gameDuration: number,
  totalTime: number,
  courts: number,
  startTime?: string,
  teammatePairs: TeammatePair[] = [],
  courtConfigs: CourtConfig[] = []
): Match[] {
  const playerStats = new Map<string, PlayerStats>();

  // Initialize all players with zero stats
  players.forEach((player) => {
    playerStats.set(player, {
      playTime: 0,
      restTime: 0,
      partners: new Set(),
      opponents: new Set(),
      lastMatchEnd: 0,
      recentPartners: [],
      recentOpponents: [],
      consecutiveMatches: 0,
    });
  });

  // Update stats from played matches
  playedMatches.forEach((match) => {
    [...match.team1, ...match.team2].forEach((player) => {
      const stats = playerStats.get(player);
      if (stats) {
        stats.playTime += gameDuration;
        stats.lastMatchEnd = match.endTime;
        stats.consecutiveMatches++;

        const [p1, p2] = match.team1;
        const [p3, p4] = match.team2;
        
        if (player === p1) {
          stats.partners.add(p2);
          stats.recentPartners.unshift(p2);
          stats.opponents.add(p3);
          stats.opponents.add(p4);
          stats.recentOpponents.unshift(p3, p4);
        } else if (player === p2) {
          stats.partners.add(p1);
          stats.recentPartners.unshift(p1);
          stats.opponents.add(p3);
          stats.opponents.add(p4);
          stats.recentOpponents.unshift(p3, p4);
        } else if (player === p3) {
          stats.partners.add(p4);
          stats.recentPartners.unshift(p4);
          stats.opponents.add(p1);
          stats.opponents.add(p2);
          stats.recentOpponents.unshift(p1, p2);
        } else if (player === p4) {
          stats.partners.add(p3);
          stats.recentPartners.unshift(p3);
          stats.opponents.add(p1);
          stats.opponents.add(p2);
          stats.recentOpponents.unshift(p1, p2);
        }
        
        // Keep only last 3 partners and 6 opponents
        if (stats.recentPartners.length > 3) stats.recentPartners.pop();
        if (stats.recentOpponents.length > 6) stats.recentOpponents.pop();
      }
    });
  });

  // Generate new matches starting from fromSlotStart
  const newMatches: Match[] = [...playedMatches];
  const totalSlots = Math.floor(totalTime / gameDuration);
  const matchesPerSlot = courts;
  
  // Initialize court configs if not provided (default to doubles)
  const finalCourtConfigs = courtConfigs.length > 0 
    ? courtConfigs 
    : Array.from({ length: courts }, (_, i) => ({ courtNumber: i + 1, type: 'doubles' as const }));

  const allTeams: [string, string][] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      allTeams.push([players[i], players[j]]);
    }
  }

  let matchId = playedMatches.length;
  const startSlot = Math.floor(fromSlotStart / gameDuration);

  for (let slot = startSlot; slot < totalSlots; slot++) {
    const slotStartTime = slot * gameDuration;
    const slotEndTime = slotStartTime + gameDuration;
    const availablePlayers = new Set(players);
    
    // Get players scheduled in previous slot by court to prevent cross-court disruptions
    const previousSlotPlayersByCourt = new Map<number, Set<string>>();
    if (slot > 0) {
      const prevSlotStart = (slot - 1) * gameDuration;
      newMatches
        .filter(m => m.startTime === prevSlotStart)
        .forEach(m => {
          const playersInMatch = new Set([...m.team1, ...m.team2]);
          previousSlotPlayersByCourt.set(m.court, playersInMatch);
        });
    }
    
    // Enforce rest after consecutive matches with graduated approach
    players.forEach((player) => {
      const stats = playerStats.get(player);
      if (!stats) return;
      
      const minPlayersNeeded = finalCourtConfigs.reduce((acc, config) => 
        acc + (config.type === 'singles' ? 2 : 4), 0
      );
      
      // Force rest after 3 consecutive matches (hard limit)
      if (stats.lastMatchEnd === slotStartTime && stats.consecutiveMatches >= 3) {
        if (availablePlayers.size > minPlayersNeeded) {
          availablePlayers.delete(player);
          stats.restTime += gameDuration;
          stats.consecutiveMatches = 0;
        }
      }
      // Strong encouragement (85%) to rest after 2 consecutive matches
      else if (stats.lastMatchEnd === slotStartTime && stats.consecutiveMatches >= 2) {
        if (availablePlayers.size > minPlayersNeeded && Math.random() < 0.85) {
          availablePlayers.delete(player);
          stats.restTime += gameDuration;
          stats.consecutiveMatches = 0;
        }
      }
      // Light encouragement (50%) to rest after 1 match
      else if (stats.lastMatchEnd === slotStartTime && availablePlayers.size > minPlayersNeeded) {
        if (Math.random() < 0.5) {
          availablePlayers.delete(player);
          stats.restTime += gameDuration;
          stats.consecutiveMatches = 0;
        }
      }
    });

    // Track which players are already scheduled in this time slot (prevents court conflicts)
    const playersScheduledThisSlot = new Set<string>();
    
    for (let court = 0; court < matchesPerSlot; court++) {
      const courtConfig = finalCourtConfigs[court];
      const playersNeeded = courtConfig.type === 'singles' ? 2 : 4;
      const courtNumber = court + 1;
      
      // Get players who were on THIS court in previous slot (they can stay on same court)
      const playersOnThisCourtPrevSlot = previousSlotPlayersByCourt.get(courtNumber) || new Set();
      
      // Get players who were on OTHER courts in previous slot (they should NOT be on this court)
      const playersOnOtherCourtsPrevSlot = new Set<string>();
      previousSlotPlayersByCourt.forEach((players, prevCourt) => {
        if (prevCourt !== courtNumber) {
          players.forEach(p => playersOnOtherCourtsPrevSlot.add(p));
        }
      });
      
      // Filter out players already scheduled on other courts in this slot
      // AND players who were on different courts in previous slot (prevents cross-court rushes)
      const availableForThisCourt = Array.from(availablePlayers).filter(
        p => !playersScheduledThisSlot.has(p) && !playersOnOtherCourtsPrevSlot.has(p)
      );
      
      if (availableForThisCourt.length < playersNeeded) continue;
      
      const match = createOptimalMatch(
        availableForThisCourt,
        playerStats,
        slotStartTime,
        slotEndTime,
        court + 1,
        teammatePairs,
        courtConfig.type
      );

      if (match) {
        const matchWithId = { ...match, id: `match-${matchId++}` };
        
        if (startTime) {
          const [hours, minutes] = startTime.split(':').map(Number);
          const baseMinutes = hours * 60 + minutes;
          
          const matchStartMinutes = baseMinutes + slotStartTime;
          const matchEndMinutes = matchStartMinutes + gameDuration;
          
          matchWithId.clockStartTime = formatTime(matchStartMinutes);
          matchWithId.clockEndTime = formatTime(matchEndMinutes);
        }
        
        newMatches.push(matchWithId);
        
        [...match.team1, ...match.team2].forEach((player) => {
          const stats = playerStats.get(player)!;
          stats.playTime += gameDuration;
          stats.lastMatchEnd = slotEndTime;
          stats.consecutiveMatches++;
          availablePlayers.delete(player);
          playersScheduledThisSlot.add(player); // Prevent same player on multiple courts

          if (match.isSingles) {
            const opponent = match.team1[0] === player ? match.team2[0] : match.team1[0];
            stats.opponents.add(opponent);
            stats.recentOpponents.unshift(opponent);
            if (stats.recentOpponents.length > 6) stats.recentOpponents.pop();
          } else {
            const [p1, p2] = match.team1 as [string, string];
            const [p3, p4] = match.team2 as [string, string];
            
            if (player === p1) {
              stats.partners.add(p2);
              stats.recentPartners.unshift(p2);
              stats.opponents.add(p3);
              stats.opponents.add(p4);
              stats.recentOpponents.unshift(p3, p4);
            } else if (player === p2) {
              stats.partners.add(p1);
              stats.recentPartners.unshift(p1);
              stats.opponents.add(p3);
              stats.opponents.add(p4);
              stats.recentOpponents.unshift(p3, p4);
            } else if (player === p3) {
              stats.partners.add(p4);
              stats.recentPartners.unshift(p4);
              stats.opponents.add(p1);
              stats.opponents.add(p2);
              stats.recentOpponents.unshift(p1, p2);
            } else {
              stats.partners.add(p3);
              stats.recentPartners.unshift(p3);
              stats.opponents.add(p1);
              stats.opponents.add(p2);
              stats.recentOpponents.unshift(p1, p2);
            }
            
            // Keep only last 3 partners and 6 opponents
            if (stats.recentPartners.length > 3) stats.recentPartners.pop();
            if (stats.recentOpponents.length > 6) stats.recentOpponents.pop();
          }
        });
      }
    }
  }

  return newMatches;
}
