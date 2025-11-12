-- Create shared_results table for social sharing
CREATE TABLE IF NOT EXISTS public.shared_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  share_type TEXT NOT NULL CHECK (share_type IN ('leaderboard', 'bracket', 'history', 'player')),
  snapshot_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on share_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_shared_results_token ON public.shared_results(share_token);

-- Create index on game_id for cleanup
CREATE INDEX IF NOT EXISTS idx_shared_results_game_id ON public.shared_results(game_id);

-- Enable RLS
ALTER TABLE public.shared_results ENABLE ROW LEVEL SECURITY;

-- Anyone can read shared results (public sharing)
CREATE POLICY "Anyone can read shared results"
ON public.shared_results
FOR SELECT
USING (expires_at > now());

-- Anyone can create shared results
CREATE POLICY "Anyone can create shared results"
ON public.shared_results
FOR INSERT
WITH CHECK (true);

-- Create function to cleanup expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.shared_results
  WHERE expires_at < now();
END;
$$;