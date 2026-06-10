-- Migration 092: Secure helper for Edge Functions to read named Vault secrets.

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.marketing_get_vault_secret(p_secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret
  INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = p_secret_name
  LIMIT 1;

  RETURN v_secret;
END;
$$;
