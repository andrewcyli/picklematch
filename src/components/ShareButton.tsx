import React from 'react';

export const ShareButton: React.FC = () => {
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pickle Match – Free Scheduler',
          text: 'Check out this pickleball round‑robin scheduler!',
          url,
        });
      } catch (e) {
        // user cancelled
      }
    } else {
      // fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 rounded bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700"
    >
      Share
    </button>
  );
};
