ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS api_token text UNIQUE;
UPDATE public.projects SET api_token = encode(gen_random_bytes(24), 'hex') WHERE api_token IS NULL;
ALTER TABLE public.projects ALTER COLUMN api_token SET DEFAULT encode(gen_random_bytes(24), 'hex');
ALTER TABLE public.projects ALTER COLUMN api_token SET NOT NULL;