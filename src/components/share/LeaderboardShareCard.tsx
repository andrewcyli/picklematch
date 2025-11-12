import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";

interface PlayerStats {
  player: string;
  wins: number;
  losses: number;
  winRate: number;
  differential: number;
}

interface LeaderboardShareCardProps {
  stats: PlayerStats[];
  gameCode?: string;
}

export function LeaderboardShareCard({ stats, gameCode }: LeaderboardShareCardProps) {
  const topThree = stats.slice(0, 3);

  return (
    <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-2xl min-w-[600px]">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 bg-white dark:bg-gray-900 px-6 py-3 rounded-full shadow-lg mb-4">
          <Trophy className="w-8 h-8 text-accent" />
          <h1 className="text-3xl font-bold text-foreground">Tournament Leaderboard</h1>
        </div>
        {gameCode && (
          <p className="text-sm text-muted-foreground">Game Code: {gameCode}</p>
        )}
      </div>

      <div className="space-y-4">
        {topThree.map((stat, index) => (
          <Card
            key={stat.player}
            className={`p-6 ${
              index === 0
                ? "border-4 border-accent bg-accent/20"
                : "bg-white dark:bg-gray-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                  index === 0 ? "bg-yellow-400 text-yellow-900" :
                  index === 1 ? "bg-gray-300 text-gray-700" :
                  "bg-orange-300 text-orange-900"
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-2xl text-foreground">{stat.player}</span>
                    {index === 0 && <Trophy className="w-5 h-5 text-accent" />}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.wins}-{stat.losses} Record
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">{(stat.winRate * 100).toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${stat.differential >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.differential >= 0 ? '+' : ''}{stat.differential}
                  </div>
                  <div className="text-sm text-muted-foreground">Differential</div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by TeamUp • Join at teamup.app
        </p>
      </div>
    </div>
  );
}
