/**
 * AppShell - Responsive Shell Foundation
 * Provides consistent layout across all variants and viewports
 */
import React from 'react';
import { Trophy } from 'lucide-react';
import { useViewport } from '@/core/hooks/useViewport';
import { useShell } from './ShellContext';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

interface AppShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  bottomNav?: React.ReactNode;
  hideHeader?: boolean;
  hideBottomNav?: boolean;
  fullHeight?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  header,
  sidebar,
  bottomNav,
  hideHeader = false,
  hideBottomNav = false,
  fullHeight = true,
}) => {
  const { isMobilePortrait, isMobileLandscape, isTablet, isDesktop } = useViewport();
  const { isGameCodeDialogOpen } = useShell();

  // Calculate bottom padding for mobile nav
  const bottomPadding = !hideBottomNav && (isMobilePortrait || isMobileLandscape) ? 'pb-16' : '';
  
  // Calculate sidebar width for desktop
  const sidebarWidth = isDesktop && sidebar ? 'ml-64' : '';

  return (
    <div 
      className={cn(
        "min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 relative",
        fullHeight && "h-screen flex flex-col"
      )}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-10 w-64 h-64 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      {/* Left Ad Sidebar - Desktop Only */}
      {isDesktop && (
        <div className="fixed left-2 top-1/2 -translate-y-1/2 w-40 z-20">
          <ins 
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-6788044289759238"
            data-ad-slot="3260817680"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      )}

      {/* Right Ad Sidebar - Desktop Only */}
      {isDesktop && (
        <div className="fixed right-2 top-1/2 -translate-y-1/2 w-40 z-20">
          <ins 
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-6788044289759238"
            data-ad-slot="3560485991"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      )}

      {/* Desktop Sidebar */}
      {isDesktop && sidebar && (
        <aside className="fixed left-0 top-0 h-full w-64 bg-card/95 backdrop-blur-sm border-r z-30">
          {sidebar}
        </aside>
      )}

      {/* Main Content Area */}
      <main 
        className={cn(
          "relative z-10 flex-1 flex flex-col",
          sidebarWidth,
          bottomPadding,
          isDesktop ? 'px-8' : isTablet ? 'px-6' : 'px-3',
          isDesktop ? 'max-w-6xl' : 'max-w-5xl',
          "mx-auto w-full"
        )}
      >
        {/* Default Header (can be overridden) */}
        {!hideHeader && !header && (
          <header className="text-center py-2 sm:py-3 flex-shrink-0">
            <div className="flex items-center justify-center mb-2">
              <img 
                src={logo} 
                alt="PickleballMatch.Fun" 
                className="h-10 sm:h-12 md:h-14 w-auto" 
              />
            </div>
            <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm font-medium leading-relaxed px-2 sm:px-0">
              🎾 Smart team assignment & scoring. Live match scheduling with multi-court management, real-time scoring, and smart team rotation. 🏓
            </p>
          </header>
        )}

        {/* Custom Header */}
        {header && (
          <header className="flex-shrink-0">
            {header}
          </header>
        )}

        {/* Content */}
        <div className={cn(
          "flex-1 flex flex-col min-h-0",
          !hideBottomNav && (isMobilePortrait || isMobileLandscape) && "mb-14"
        )}>
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Mobile/Tablet */}
      {!hideBottomNav && (isMobilePortrait || isMobileLandscape || isTablet) && bottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          {bottomNav}
        </nav>
      )}

      {/* Desktop Navigation - Top or Sidebar handled separately */}
      {isDesktop && bottomNav && !sidebar && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t">
          <div className="max-w-6xl mx-auto px-8">
            {bottomNav}
          </div>
        </nav>
      )}
    </div>
  );
};

export default AppShell;
