import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { Share2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

interface CheckInOutProps {
  players: string[];
  gameCode: string;
  checkedInPlayers: string[];
  onToggleCheckIn: (player: string) => void;
}

export const CheckInOut = ({ players, gameCode, checkedInPlayers, onToggleCheckIn }: CheckInOutProps) => {
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?join=${gameCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join our game!',
          text: `Join our racket match with code: ${gameCode}`,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col items-center gap-4 p-6 bg-primary/10 rounded-lg border border-primary/20">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Game Code</p>
          <p className="text-3xl font-bold font-mono tracking-wider text-primary">{gameCode}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg">
          <QRCodeSVG 
            value={`${window.location.origin}?join=${gameCode}`}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>
        
        <Button onClick={handleShare} variant="outline" className="w-full max-w-xs">
          <Share2 className="mr-2 h-4 w-4" />
          Share Game Link
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Player Check-In</h3>
          <Badge variant="secondary">
            {checkedInPlayers.length} / {players.length} checked in
          </Badge>
        </div>

        <Card className="p-4 max-h-[500px] overflow-y-auto">
          <div className="space-y-2">
            {players.map((player, index) => {
              const isCheckedIn = checkedInPlayers.includes(player);
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    isCheckedIn ? "bg-primary/10 border border-primary/20" : "bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{player}</span>
                    {isCheckedIn && (
                      <Badge variant="default" className="text-xs">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Checked In
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant={isCheckedIn ? "destructive" : "default"}
                    size="sm"
                    onClick={() => onToggleCheckIn(player)}
                  >
                    {isCheckedIn ? (
                      <>
                        <UserX className="h-4 w-4 mr-1" />
                        Check Out
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-1" />
                        Check In
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};
