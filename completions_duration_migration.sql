-- ====================================================
-- ÇALIŞMA SÜRESİ MIGRATION
-- Supabase SQL Editor'e kopyala ve çalıştır
-- ====================================================

ALTER TABLE completions ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(5,2) DEFAULT 0;
