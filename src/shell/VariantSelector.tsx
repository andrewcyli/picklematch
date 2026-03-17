/**
 * VariantSelector - Landing page for choosing between game modes
 * Modern, responsive card-based design
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Users, 
  Target, 
  ArrowRight,
  Sparkles,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useViewport } from '@/core/hooks/useViewport';
import type { VariantType } from '@/core/types';
import logo from '@/assets/logo.png';

interface VariantCardProps {
  id: VariantType;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  color: string;
  onSelect: (id: VariantType) => void;
  recommended?: boolean;
}

const VariantCard: React.FC<VariantCardProps> = ({
  id,
  title,
  description,
  icon,
  features,
  color,
  onSelect,
  recommended = false,
}) => {
  const { isMobilePortrait } = useViewport();

  return (
    <Card 
      className={cn(
        "relative overflow-hidden group cursor-pointer",
        "transition-all duration-300 ease-out",
        "hover:shadow-xl hover:scale-[1.02]",
        "border-2 border-transparent hover:border-primary/20",
        "bg-gradient-to-br from-card to-card/95",
        isMobilePortrait ? "p-5" : "p-6"
      )}
      onClick={() => onSelect(id)}
    >
      {/* Recommended badge */}
      {recommended && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            <Sparkles className="w-3 h-3" />
            Popular
          </span>
        </div>
      )}

      {/* Color accent */}
      <div 
        className={cn(
          "absolute top-0 left-0 w-full h-1",
          color
        )} 
      />

      {/* Icon */}
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
        "bg-gradient-to-br shadow-lg",
        color.replace('bg-', 'from-').replace('500', '500'),
        color.replace('bg-', 'to-').replace('500', '600'),
        "text-white"
      )}>
        {icon}
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {description}
      </p>

      {/* Features */}
      <ul className="space-y-2 mb-5">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button 
        className={cn(
          "w-full group-hover:shadow-md transition-all duration-200",
          color.replace('bg-', 'bg-').replace('500', '600'),
          "text-white hover:opacity-90"
        )}
      >
        Start {title}
        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
      </Button>
    </Card>
  );
};

const VARIANTS: Omit<VariantCardProps, 'onSelect'>[] = [
  {
    id: 'classic',
    title: 'Classic Round-Robin',
    description: 'Everyone plays with everyone. Perfect for casual meetups and practice sessions.',
    icon: <Calendar className="w-6 h-6" />,
    features: [
      'Smart team rotation ensures balanced play',
      'Flexible player check-in/out',
      'Live score tracking',
      'Individual player statistics',
    ],
    color: 'bg-blue-500',
    recommended: true,
  },
  {
    id: 'tournament',
    title: 'Tournament Bracket',
    description: 'Single or double elimination tournaments for competitive play.',
    icon: <Trophy className="w-6 h-6" />,
    features: [
      '4, 8, or 16 team brackets',
      'Single or double elimination',
      'Visual bracket progression',
      'Automatic winner advancement',
    ],
    color: 'bg-amber-500',
  },
  {
    id: 'qualifier',
    title: 'Qualifier Stage',
    description: 'Group stage followed by knockout rounds. Best of both worlds.',
    icon: <Target className="w-6 h-6" />,
    features: [
      'Round-robin groups of 3-4 teams',
      'Top teams advance to bracket',
      'Combined standings view',
      'Two-phase tournament flow',
    ],
    color: 'bg-emerald-500',
  },
];

export const VariantSelector: React.FC = () => {
  const navigate = useNavigate();
  const { isMobilePortrait, isMobileLandscape, isDesktop } = useViewport();

  const handleSelect = (variant: VariantType) => {
    navigate(`/${variant}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <img 
                src={logo} 
                alt="PickleballMatch.Fun" 
                className="h-12 sm:h-16 w-auto" 
              />
            </div>
            <p className="text-center text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Choose your game mode to get started. Each mode offers a different tournament experience.
            </p>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-8">
          <div className={cn(
            "max-w-6xl mx-auto grid gap-4 sm:gap-6",
            isMobilePortrait ? "grid-cols-1" : 
            isMobileLandscape ? "grid-cols-3" :
            isDesktop ? "grid-cols-3" : "grid-cols-2"
          )}>
            {VARIANTS.map((variant) => (
              <VariantCard
                key={variant.id}
                {...variant}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* Footer info */}
          <div className="mt-8 sm:mt-12 text-center">
            <p className="text-xs text-muted-foreground">
              All modes support real-time scoring, player notifications, and multi-court management.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default VariantSelector;
