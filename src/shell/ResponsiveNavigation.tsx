/**
 * ResponsiveNavigation - Modern navigation that adapts to viewport
 * Mobile: Bottom tab bar
 * Tablet: Collapsible side rail or bottom nav
 * Desktop: Sidebar or top navigation
 */
import React from 'react';
import { 
  Settings2, 
  Users, 
  Calendar, 
  Trophy, 
  History,
  UserCircle,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewport } from '@/core/hooks/useViewport';
import { useShell } from '@/shell/ShellContext';
import type { Section } from '@/core/types';
import { Button } from '@/components/ui/button';

interface NavItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface ResponsiveNavigationProps {
  disabled?: boolean;
  onBack?: () => void;
  showBackButton?: boolean;
  className?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'setup', label: 'Setup', icon: <Settings2 className="w-5 h-5" /> },
  { id: 'players', label: 'Players', icon: <Users className="w-5 h-5" /> },
  { id: 'matches', label: 'Matches', icon: <Calendar className="w-5 h-5" /> },
  { id: 'leaderboard', label: 'Standings', icon: <Trophy className="w-5 h-5" /> },
  { id: 'history', label: 'History', icon: <History className="w-5 h-5" /> },
];

export const MobileBottomNav: React.FC<ResponsiveNavigationProps> = ({
  disabled = false,
  className,
}) => {
  const { activeSection, setActiveSection, isPlayerView } = useShell();

  return (
    <div 
      className={cn(
        "bg-card/95 backdrop-blur-md border-t border-border/50",
        "safe-area-bottom",
        className
      )}
    >
      <div className="flex items-center justify-around h-14 sm:h-16">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => !disabled && !item.disabled && setActiveSection(item.id)}
            disabled={disabled || item.disabled}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full",
              "transition-colors duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              activeSection === item.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
              (disabled || item.disabled) && "opacity-50 cursor-not-allowed"
            )}
            aria-label={item.label}
            aria-current={activeSection === item.id ? 'page' : undefined}
          >
            <span className={cn(
              "transition-transform duration-200",
              activeSection === item.id && "scale-110"
            )}>
              {item.icon}
            </span>
            <span className="text-[10px] mt-0.5 font-medium">
              {item.label}
            </span>
            {activeSection === item.id && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export const DesktopSidebar: React.FC<ResponsiveNavigationProps> = ({
  disabled = false,
  className,
}) => {
  const { activeSection, setActiveSection } = useShell();

  return (
    <div className={cn("flex flex-col h-full py-6", className)}>
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold text-foreground">PickleMatch</h2>
        <p className="text-xs text-muted-foreground mt-1">Tournament Manager</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => !disabled && !item.disabled && setActiveSection(item.id)}
            disabled={disabled || item.disabled}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
              "transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              activeSection === item.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              (disabled || item.disabled) && "opacity-50 cursor-not-allowed"
            )}
            aria-current={activeSection === item.id ? 'page' : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
            {activeSection === item.id && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </nav>

      <div className="px-4 pt-6 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          v2.0.0 • Prototype Build
        </p>
      </div>
    </div>
  );
};

export const PlayerViewHeader: React.FC<{
  playerName: string;
  onExit: () => void;
}> = ({ playerName, onExit }) => {
  const { isMobilePortrait } = useViewport();

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-primary/10">
      <div className="flex items-center gap-2">
        <UserCircle className="w-5 h-5 text-primary" />
        <span className="font-medium text-sm">Playing as: {playerName}</span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onExit}
        className="h-8 text-xs"
      >
        {isMobilePortrait ? 'Exit' : 'Exit Player View'}
      </Button>
    </div>
  );
};

export const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = (props) => {
  const { isDesktop } = useViewport();
  
  if (isDesktop) {
    return <DesktopSidebar {...props} />;
  }
  
  return <MobileBottomNav {...props} />;
};

export default ResponsiveNavigation;
