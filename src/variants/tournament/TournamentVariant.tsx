/**
 * TournamentVariant - Bracket Tournament Experience
 * Placeholder for tournament mode
 */
import React from "react";
import { Routes, Route } from "react-router-dom";
import { AppShell, ResponsiveNavigation } from "@/shell";
import { Card } from "@/components/ui/card";
import { Trophy, Construction } from "lucide-react";

export const TournamentVariant: React.FC = () => {
  return (
    <AppShell
      bottomNav={<ResponsiveNavigation />}
    >
      <Card className="p-6 sm:p-8 shadow-sport border-2 border-primary/10 backdrop-blur-sm bg-card/80 flex-1 flex flex-col items-center justify-center min-h-0 mb-14">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <Construction className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Tournament Mode</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Single and double elimination bracket tournaments are coming soon. 
            This mode will feature visual brackets and automatic progression.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="w-4 h-4" />
            <span>Expected: Phase 2 of rollout</span>
          </div>
        </div>
      </Card>
    </AppShell>
  );
};

export default TournamentVariant;
