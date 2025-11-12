export function canUseWebShare(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

export async function shareViaWebAPI(data: {
  title: string;
  text: string;
  url?: string;
  files?: File[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!canUseWebShare()) {
      return { success: false, error: 'Web Share API not supported' };
    }

    await navigator.share(data);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled the share
      return { success: false, error: 'Share cancelled' };
    }
    console.error('Error sharing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share',
    };
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

export function formatShareText(type: string, stats?: any): string {
  switch (type) {
    case 'leaderboard':
      return `Check out the tournament leaderboard! 🏆`;
    case 'bracket':
      return `View the tournament bracket! 🎯`;
    case 'history':
      return `See all the match results! 📊`;
    case 'player':
      return `Check out my tournament stats! 🎾`;
    default:
      return `Check out these tournament results!`;
  }
}

export function getPlatformShareUrl(platform: string, url: string, text: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  switch (platform) {
    case 'whatsapp':
      return `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    default:
      return url;
  }
}
