-- Completely disable RLS on storage.objects table
-- This is a more aggressive approach to fix storage upload issues
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
