-- Migration 004: Create invoice-pdfs storage bucket for WhatsApp PDF delivery
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoice-pdfs', 'invoice-pdfs', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
