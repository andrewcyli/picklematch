import { useState, useEffect } from "react";
import { GameCodeDialog } from "@/components/GameCodeDialog";
import { GameSetupSection, GameConfig } from "@/components/GameSetupSection";
import { PlayerManagement } from "@/components/PlayerManagement";
import { SchedulerSection } from "@/components/SchedulerSection";
import { CheckInOut } from "@/components/CheckInOut";
import { generateSchedule, Match } from "@/lib/scheduler";
import { Trophy, Users, Calendar, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tab = "setup" | "players" | "scheduler" | "checkin";
type Step = "start" | "config" | "active";

const Index = () => {
  const [step, setStep] = useState<Step>("start");
  const [currentTab, setCurrentTab] = useState<Tab>("setup");
  const [players, setPlayers] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [teammatePairs, setTeammatePairs] = useState<{ player1: string; player2: string }[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState<string>("");
  const [showGameCodeDialog, setShowGameCodeDialog] = useState(true);
  const [checkedInPlayers, setCheckedInPlayers] = useState<string[]>([]);

  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel('game-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedGame = payload.new;
            setPlayers(updatedGame.players || []);
            setMatches((updatedGame.matches as unknown as Match[]) || []);
            setGameConfig(updatedGame.game_config as unknown as GameConfig);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const createNewGame = async () => {
    setShowGameCodeDialog(false);
    setStep("config");
    setCurrentTab("setup");
  };

  const joinExistingGame = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('game_code', code)
        .single();

      if (error || !data) {
        toast.error("Game not found. Please check the code and try again.");
        return;
      }

      setGameId(data.id);
      setGameCode(data.game_code);
      setPlayers(data.players || []);
      setGameConfig(data.game_config as unknown as GameConfig);
      setMatches((data.matches as unknown as Match[]) || []);
      setTeammatePairs((data.game_config as any)?.teammatePairs || []);
      setShowGameCodeDialog(false);
      
      if (data.matches && Array.isArray(data.matches) && data.matches.length > 0) {
        setStep("active");
        setCurrentTab("scheduler");
      } else {
        setStep("config");
        setCurrentTab("setup");
      }
      
      toast.success(`Joined game: ${code}`);
    } catch (error) {
      toast.error("Failed to join game");
      console.error(error);
    }
  };

  const handleGameSetupComplete = (config: GameConfig) => {
    setGameConfig(config);
    setCurrentTab("players");
  };

  const handlePlayersComplete = async (playerList: string[], pairs: { player1: string; player2: string }[]) => {
    setPlayers(playerList);
    setTeammatePairs(pairs);
    
    if (!gameConfig) return;

    const schedule = generateSchedule(
      playerList,
      gameConfig.gameDuration,
      gameConfig.totalTime,
      gameConfig.courts,
      undefined,
      pairs,
      gameConfig.courtConfigs
    );
    setMatches(schedule);

    try {
      if (gameId) {
        const { error } = await supabase
          .from('games')
          .update({
            players: playerList,
            game_config: { ...gameConfig, teammatePairs: pairs } as any,
            matches: schedule as any,
          })
          .eq('id', gameId);

        if (error) throw error;
      } else {
        const { data: codeData } = await supabase.rpc('generate_game_code');
        const newGameCode = codeData as string;

        const { data, error } = await supabase
          .from('games')
          .insert({
            game_code: newGameCode,
            players: playerList,
            game_config: { ...gameConfig, teammatePairs: pairs } as any,
            matches: schedule as any,
          })
          .select()
          .single();

        if (error) throw error;
        
        setGameId(data.id);
        setGameCode(newGameCode);
        toast.success(`Game created! Code: ${newGameCode}`);
      }
      
      setStep("active");
      setCurrentTab("scheduler");
    } catch (error) {
      toast.error("Failed to save game");
      console.error(error);
    }
  };

  const handleScheduleUpdate = async (newMatches: Match[], newPlayers: string[]) => {
    setMatches(newMatches);
    setPlayers(newPlayers);

    if (gameId) {
      try {
        const { error } = await supabase
          .from('games')
          .update({
            matches: newMatches as any,
            players: newPlayers,
          })
          .eq('id', gameId);

        if (error) throw error;
      } catch (error) {
        toast.error("Failed to update game");
        console.error(error);
      }
    }
  };

  const toggleCheckIn = (player: string) => {
    setCheckedInPlayers(prev => 
      prev.includes(player) 
        ? prev.filter(p => p !== player)
        : [...prev, player]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <GameCodeDialog
        open={showGameCodeDialog}
        onOpenChange={setShowGameCodeDialog}
        onJoinGame={joinExistingGame}
        onCreateGame={createNewGame}
      />

      {step === "start" && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Trophy className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Racket Match Manager
            </h1>
            <p className="text-muted-foreground">
              Smart team assignment & scoring
            </p>
          </div>
        </div>
      )}

      {step === "config" && (
        <div className="max-w-2xl mx-auto p-4">
          <header className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Setup Your Game
            </h1>
          </header>

          {currentTab === "setup" && (
            <GameSetupSection onComplete={handleGameSetupComplete} />
          )}
          
          {currentTab === "players" && (
            <PlayerManagement onComplete={handlePlayersComplete} />
          )}
        </div>
      )}

      {step === "active" && gameConfig && (
        <>
          <div className="max-w-2xl mx-auto p-4">
            {currentTab === "setup" && (
              <GameSetupSection onComplete={handleGameSetupComplete} />
            )}
            
            {currentTab === "players" && (
              <PlayerManagement onComplete={handlePlayersComplete} />
            )}
            
            {currentTab === "scheduler" && (
              <SchedulerSection
                matches={matches}
                gameConfig={gameConfig}
                allPlayers={players}
                onScheduleUpdate={handleScheduleUpdate}
              />
            )}
            
            {currentTab === "checkin" && gameCode && (
              <CheckInOut
                players={players}
                gameCode={gameCode}
                checkedInPlayers={checkedInPlayers}
                onToggleCheckIn={toggleCheckIn}
              />
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg">
            <div className="max-w-2xl mx-auto flex items-center justify-around py-2">
              <button
                onClick={() => setCurrentTab("setup")}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  currentTab === "setup" ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`}
              >
                <Trophy className="h-5 w-5" />
                <span className="text-xs font-medium">Setup</span>
              </button>

              <button
                onClick={() => setCurrentTab("players")}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  currentTab === "players" ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs font-medium">Players</span>
              </button>

              <button
                onClick={() => setCurrentTab("scheduler")}
                className={`flex flex-col items-center gap-1 px-6 py-2 rounded-full transition-all ${
                  currentTab === "scheduler" 
                    ? "text-white bg-gradient-to-br from-primary to-accent shadow-lg scale-110" 
                    : "text-muted-foreground bg-background"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentTab === "scheduler" ? "" : "border-2 border-border"
                }`}>
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">Schedule</span>
              </button>

              <button
                onClick={() => setCurrentTab("checkin")}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  currentTab === "checkin" ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`}
              >
                <UserCheck className="h-5 w-5" />
                <span className="text-xs font-medium">Check-In</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
