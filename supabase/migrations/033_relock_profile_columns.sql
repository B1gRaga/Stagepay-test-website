-- Migration 009 limited what signed-in users may change on their own profile,
-- but the table-level grants came back since (checked 2026-10-21: authenticated
-- had UPDATE, INSERT and DELETE on every column, including plan and
-- subscription_expires_at). The row rule only checks that the row is yours, so
-- anyone could make their own account Business from the browser, or delete and
-- re-create their profile with any plan.
--
-- Profiles are created by the handle_new_user trigger and changed by the app
-- through /api/profile (its ALLOWED list) and the logo upload. Plans, billing
-- and team links are written only by server routes using the service role.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM anon, authenticated;

GRANT UPDATE (
  name, firm_name, phone, address, city, country, vat_number, logo_url,
  default_currency, tax_label, default_vat_rate,
  invoice_theme, brand_color_primary, brand_color_header,
  whatsapp_reminders_enabled, business_type,
  payment_methods, default_due_days
) ON public.profiles TO authenticated;
