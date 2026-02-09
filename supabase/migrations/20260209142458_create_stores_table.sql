/*
  # Create stores table

  1. New Tables
    - `stores`
      - `id` (uuid, primary key, auto-generated)
      - `user_id` (uuid, references auth.users, NOT NULL)
      - `name` (text, store name)
      - `marketplace` (text, e.g. 'trendyol', 'hepsiburada', 'amazon_tr')
      - `api_key_enc` (text, AES-256 encrypted API key)
      - `iv` (text, initialization vector for decryption)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `stores` table
    - Users can only access their own stores
*/

CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  marketplace text NOT NULL,
  api_key_enc text,
  iv text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stores"
  ON stores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own stores"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stores"
  ON stores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stores"
  ON stores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
