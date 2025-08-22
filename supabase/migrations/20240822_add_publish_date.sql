-- Add publish_date column to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS publish_date TEXT; 