/**
 * Responsive Viewport Hook
 * Detects viewport size for responsive design
 */
import { useState, useEffect } from 'react';
import type { ViewportSize } from '@/core/types';

interface ViewportState {
  size: ViewportSize;
  isMobilePortrait: boolean;
  isMobileLandscape: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

const getViewportSize = (width: number, height: number): ViewportSize => {
  if (width < 640) {
    return height > width ? 'mobile-portrait' : 'mobile-landscape';
  }
  if (width < 1024) return 'tablet';
  return 'desktop';
};

export const useViewport = (): ViewportState => {
  const [state, setState] = useState<ViewportState>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const size = getViewportSize(width, height);
    return {
      size,
      isMobilePortrait: size === 'mobile-portrait',
      isMobileLandscape: size === 'mobile-landscape',
      isTablet: size === 'tablet',
      isDesktop: size === 'desktop',
      width,
      height,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const size = getViewportSize(width, height);
      
      setState({
        size,
        isMobilePortrait: size === 'mobile-portrait',
        isMobileLandscape: size === 'mobile-landscape',
        isTablet: size === 'tablet',
        isDesktop: size === 'desktop',
        width,
        height,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return state;
};
