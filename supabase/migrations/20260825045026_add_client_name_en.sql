-- クライアント名の英語表記を保存するための追加列です。
-- 既存データを壊さないよう、既存のname列と同じく更新可能なnullable列として追加します。
alter table if exists public.clients
    add column if not exists name_en text;
