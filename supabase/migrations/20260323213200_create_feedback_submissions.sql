CREATE TABLE public.feedback_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('improvement', 'bug')),
  message TEXT NOT NULL CHECK (char_length(message) >= 8),
  contact TEXT NULL,
  game_code TEXT NULL,
  page_url TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create feedback submissions"
ON public.feedback_submissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only service role can read feedback submissions"
ON public.feedback_submissions
FOR SELECT
USING (false);

CREATE INDEX idx_feedback_submissions_created_at ON public.feedback_submissions(created_at DESC);
CREATE INDEX idx_feedback_submissions_category ON public.feedback_submissions(category);
