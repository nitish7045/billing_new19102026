-- Client-based Hisab cycles for the billing app.
-- Run this migration in the Supabase SQL Editor before using the updated app.
-- Existing invoice and received_payment records are not modified.

ALTER TABLE public.hisab_cycles
  ADD COLUMN IF NOT EXISTS client_name text;

UPDATE public.hisab_cycles
SET client_name = 'General'
WHERE client_name IS NULL OR btrim(client_name) = '';

ALTER TABLE public.hisab_cycles
  ALTER COLUMN client_name SET DEFAULT 'General';

ALTER TABLE public.hisab_cycles
  ALTER COLUMN client_name SET NOT NULL;

-- One invoice can be linked to only one Hisab cycle.
CREATE UNIQUE INDEX IF NOT EXISTS hisab_cycle_bills_invoice_unique
  ON public.hisab_cycle_bills (invoice_id);

-- One received payment can be linked to only one Hisab cycle.
CREATE UNIQUE INDEX IF NOT EXISTS hisab_cycle_payments_payment_unique
  ON public.hisab_cycle_payments (payment_id);

CREATE INDEX IF NOT EXISTS hisab_cycles_user_client_number_idx
  ON public.hisab_cycles (user_id, client_name, cycle_number DESC);

CREATE INDEX IF NOT EXISTS hisab_cycles_user_client_status_idx
  ON public.hisab_cycles (user_id, client_name, status);
