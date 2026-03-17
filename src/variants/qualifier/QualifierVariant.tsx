/**
 * QualifierVariant - Group Stage + Knockout Experience
 * Placeholder for qualifier mode
 */
import React from "react";
import { Routes, Route } from "react-router-dom";
import { AppShell, ResponsiveNavigation } from "@/shell";
import { Card } from "@/components/ui/card";
import { Target, Construction } from "lucide-react";

export const QualifierVariant: React.FC = () => {
  return (
    <AppShell
      bottomNav={<ResponsiveNavigation />}
    >
      <Card className="p-6 sm:p-8 shadow-sport border-2 border-primary/10 backdrop-blur-sm bg-card/80 flex-1 flex flex-col items-center justify-center min-h-0 mb-14">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <Construction className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Qualifier Mode</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Group stage followed by knockout rounds. Perfect for larger tournaments 
            where you want round-robin groups advancing to a bracket.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="w-4 h-4" />
            <span>Expected: Phase 3 of rollout</span>
          </div>
        </div>
      </Card>
    </AppShell>
  );
};

export default QualifierVariant;
