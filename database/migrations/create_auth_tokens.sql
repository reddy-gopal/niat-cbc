CREATE TABLE IF NOT EXISTS public.auth_tokens (
  token      TEXT        PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON public.auth_tokens (user_id);
