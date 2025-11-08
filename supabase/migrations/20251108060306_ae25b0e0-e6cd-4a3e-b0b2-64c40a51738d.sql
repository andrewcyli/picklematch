-- Add creator_id column to games table
ALTER TABLE public.games 
ADD COLUMN creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_games_creator_id ON public.games(creator_id);

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create games" ON public.games;
DROP POLICY IF EXISTS "Anyone can read games" ON public.games;
DROP POLICY IF EXISTS "Anyone can update games" ON public.games;

-- Create secure policies based on creator ownership
CREATE POLICY "Users can create their own games" 
ON public.games 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can read their own games" 
ON public.games 
FOR SELECT 
USING (auth.uid() = creator_id);

CREATE POLICY "Users can update their own games" 
ON public.games 
FOR UPDATE 
USING (auth.uid() = creator_id);