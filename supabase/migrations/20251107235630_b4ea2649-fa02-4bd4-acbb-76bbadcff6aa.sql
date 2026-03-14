-- Create games table to store game sessions
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_code TEXT NOT NULL UNIQUE,
  players TEXT[] NOT NULL,
  game_config JSONB NOT NULL,
  matches JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read games (public access)
CREATE POLICY "Anyone can read games"
ON public.games
FOR SELECT
USING (true);

-- Create policy to allow anyone to create games
CREATE POLICY "Anyone can create games"
ON public.games
FOR INSERT
WITH CHECK (true);

-- Create policy to allow anyone to update games
CREATE POLICY "Anyone can update games"
ON public.games
FOR UPDATE
USING (true);

-- Create index on game_code for fast lookups
CREATE INDEX idx_games_game_code ON public.games(game_code);

-- Create function to generate unique 6-character game codes
CREATE OR REPLACE FUNCTION public.generate_game_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for the games table
ALTER TABLE public.games REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;