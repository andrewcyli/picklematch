import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ShareOptionsDialog } from "./ShareOptionsDialog";
import { canUseWebShare, shareViaWebAPI, formatShareText } from "@/lib/share-utils";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  shareType: 'leaderboard' | 'bracket' | 'history' | 'player';
  shareData: any;
  gameId?: string;
  gameCode?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ShareButton({
  shareType,
  shareData,
  gameId,
  gameCode,
  variant = "outline",
  size = "sm",
  className,
}: ShareButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const handleQuickShare = async () => {
    // If Web Share API is available, use it directly
    if (canUseWebShare()) {
      const text = formatShareText(shareType, shareData);
      const title = `Tournament ${shareType.charAt(0).toUpperCase() + shareType.slice(1)}`;
      
      const result = await shareViaWebAPI({
        title,
        text,
        url: window.location.href,
      });

      if (result.success) {
        toast({
          title: "Shared!",
          description: "Content shared successfully",
        });
      } else if (result.error !== 'Share cancelled') {
        // If Web Share fails, show options dialog
        setShowDialog(true);
      }
    } else {
      // No Web Share API, show options dialog
      setShowDialog(true);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleQuickShare}
        className={className}
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>

      <ShareOptionsDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        shareType={shareType}
        shareData={shareData}
        gameId={gameId}
        gameCode={gameCode}
      />
    </>
  );
}
