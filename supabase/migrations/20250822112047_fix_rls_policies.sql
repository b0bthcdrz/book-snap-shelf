-- Disable RLS on books table to allow inserts without authentication
ALTER TABLE books DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS enabled, you can create a policy that allows all operations
-- CREATE POLICY "Allow all operations on books" ON books FOR ALL USING (true) WITH CHECK (true);
