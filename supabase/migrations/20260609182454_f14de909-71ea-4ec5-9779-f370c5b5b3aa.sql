ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex');

-- Backfill any existing rows (default handles new rows; this guarantees uniqueness for old rows)
UPDATE public.repositories
SET webhook_secret = encode(gen_random_bytes(24), 'hex')
WHERE webhook_secret IS NULL OR webhook_secret = '';