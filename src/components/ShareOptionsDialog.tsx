import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  Link as LinkIcon,
  MessageCircle,
  Twitter,
  Facebook,
  Linkedin,
  Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard, getPlatformShareUrl, formatShareText } from "@/lib/share-utils";
import { createShareableResult } from "@/lib/share-service";
import { exportElementAsImage, downloadImage, blobToFile } from "@/lib/image-export";
import { LeaderboardShareCard } from "./share/LeaderboardShareCard";

interface ShareOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareType: 'leaderboard' | 'bracket' | 'history' | 'player';
  shareData: any;
  gameId?: string;
  gameCode?: string;
}

export function ShareOptionsDialog({
  open,
  onOpenChange,
  shareType,
  shareData,
  gameId,
  gameCode,
}: ShareOptionsDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const shareCardRef = useRef<HTMLDivElement>(null);

  const generateShareUrl = async () => {
    if (shareUrl) return shareUrl;
    if (!gameId) {
      toast({
        title: "Error",
        description: "Game ID is required to create a shareable link",
        variant: "destructive",
      });
      return null;
    }

    setIsGenerating(true);
    try {
      const result = await createShareableResult({
        gameId,
        shareType,
        snapshotData: shareData,
      });

      if (result.success && result.shareUrl) {
        setShareUrl(result.shareUrl);
        return result.shareUrl;
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create share link",
          variant: "destructive",
        });
        return null;
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    const url = await generateShareUrl();
    if (!url) return;

    const success = await copyToClipboard(url);
    if (success) {
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handlePlatformShare = async (platform: string) => {
    const url = await generateShareUrl();
    if (!url) return;

    const text = formatShareText(shareType, shareData);
    const shareUrl = getPlatformShareUrl(platform, url, text);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadImage = async () => {
    if (!shareCardRef.current) return;

    setIsGenerating(true);
    try {
      const result = await exportElementAsImage(shareCardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      if (result.success && result.blob) {
        downloadImage(result.blob, `${shareType}-${Date.now()}.png`);
        toast({
          title: "Downloaded!",
          description: "Image saved to your device",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate image",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareImage = async () => {
    if (!shareCardRef.current) return;

    setIsGenerating(true);
    try {
      const result = await exportElementAsImage(shareCardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      if (result.success && result.blob) {
        const file = await blobToFile(result.blob, `${shareType}.png`);
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Tournament ${shareType}`,
            text: formatShareText(shareType, shareData),
          });
          toast({
            title: "Shared!",
            description: "Image shared successfully",
          });
        } else {
          // Fallback to download
          downloadImage(result.blob, `${shareType}-${Date.now()}.png`);
          toast({
            title: "Downloaded",
            description: "Image saved (sharing not supported on this device)",
          });
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast({
          title: "Error",
          description: "Failed to share image",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share {shareType}</DialogTitle>
          <DialogDescription>
            Choose how you want to share this content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share as Link */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Share Link</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                disabled={isGenerating}
                className="flex-col h-auto py-3"
              >
                <LinkIcon className="w-5 h-5 mb-1" />
                <span className="text-xs">Copy Link</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePlatformShare('whatsapp')}
                disabled={isGenerating}
                className="flex-col h-auto py-3"
              >
                <MessageCircle className="w-5 h-5 mb-1" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePlatformShare('twitter')}
                disabled={isGenerating}
                className="flex-col h-auto py-3"
              >
                <Twitter className="w-5 h-5 mb-1" />
                <span className="text-xs">Twitter</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePlatformShare('facebook')}
                disabled={isGenerating}
                className="flex-col h-auto py-3"
              >
                <Facebook className="w-5 h-5 mb-1" />
                <span className="text-xs">Facebook</span>
              </Button>
            </div>
          </div>

          {/* Share as Image */}
          {shareType === 'leaderboard' && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Share as Image</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button
                  variant="outline"
                  onClick={handleShareImage}
                  disabled={isGenerating}
                  className="flex-col h-auto py-3"
                >
                  <ImageIcon className="w-5 h-5 mb-1" />
                  <span className="text-xs">Share Image</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadImage}
                  disabled={isGenerating}
                  className="flex-col h-auto py-3"
                >
                  <Download className="w-5 h-5 mb-1" />
                  <span className="text-xs">Download</span>
                </Button>
              </div>

              {/* Preview */}
              <div className="relative overflow-hidden rounded-lg border bg-muted/20">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                    Preview
                  </div>
                </div>
                <div className="scale-[0.3] origin-top-left w-[333%] h-[333%] pointer-events-none">
                  <div ref={shareCardRef}>
                    <LeaderboardShareCard stats={shareData.stats || []} gameCode={gameCode} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
