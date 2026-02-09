/*
  # Create notification_settings table

  1. New Tables
    - `notification_settings`
      - `id` (uuid, primary key)
      - `store_id` (uuid, foreign key to stores.id, unique per store)
      - `telegram_enabled` (boolean, default false) - master toggle for Telegram
      - `telegram_chat_id` (text, nullable) - Telegram chat/group ID
      - `telegram_bot_token` (text, nullable) - Telegram bot token
      - `browser_enabled` (boolean, default false) - master toggle for browser push
      - `notify_price_drop` (boolean, default true) - alert when competitor price drops
      - `notify_margin_warning` (boolean, default true) - alert when margin below threshold
      - `notify_stock_change` (boolean, default true) - alert on stock status change
      - `notify_competitor_change` (boolean, default true) - alert on competitor price change
      - `margin_threshold` (numeric, default 10) - minimum margin % before warning
      - `price_change_threshold` (numeric, default 5) - minimum price change % to alert
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `notification_settings` table
    - Add policy for authenticated users to manage their own notification settings
      (via store ownership check through stores table)

  3. Notes
    - One notification_settings row per store (unique constraint on store_id)
    - Telegram bot token stored as plain text in DB (user-provided bot, not system secret)
    - threshold values allow per-store customization of alert sensitivity
*/

CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  telegram_enabled boolean NOT NULL DEFAULT false,
  telegram_chat_id text DEFAULT NULL,
  telegram_bot_token text DEFAULT NULL,
  browser_enabled boolean NOT NULL DEFAULT false,
  notify_price_drop boolean NOT NULL DEFAULT true,
  notify_margin_warning boolean NOT NULL DEFAULT true,
  notify_stock_change boolean NOT NULL DEFAULT true,
  notify_competitor_change boolean NOT NULL DEFAULT true,
  margin_threshold numeric NOT NULL DEFAULT 10,
  price_change_threshold numeric NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_store_notification UNIQUE (store_id)
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view their notification settings"
  ON notification_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = notification_settings.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can insert their notification settings"
  ON notification_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = notification_settings.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can update their notification settings"
  ON notification_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = notification_settings.store_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = notification_settings.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can delete their notification settings"
  ON notification_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = notification_settings.store_id
      AND stores.user_id = auth.uid()
    )
  );
