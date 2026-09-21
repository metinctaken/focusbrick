-- ====================================================
-- KASA (WALLET) MIGRATION — DÜZELTİLMİŞ VERSİYON
-- Supabase SQL Editor'e kopyala ve çalıştır
-- ====================================================

-- 1. Varsa eski tabloları temizle
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS wallet_accounts;

-- 2. Hesaplar tablosu (Başlangıç bakiyesi kolonu olmadan, sadece işlemlerle takip edilecek)
CREATE TABLE wallet_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    color           TEXT NOT NULL DEFAULT '#3b82f6',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. İşlemler tablosu
CREATE TABLE wallet_transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
    amount      NUMERIC(12, 2) NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS'yi kapat (anon key ile erişim için)
ALTER TABLE wallet_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions DISABLE ROW LEVEL SECURITY;

-- 5. Doğrulama
SELECT 'wallet_accounts' as tablo, COUNT(*) as kayit FROM wallet_accounts
UNION ALL
SELECT 'wallet_transactions', COUNT(*) FROM wallet_transactions;
