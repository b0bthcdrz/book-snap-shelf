-- Disable RLS on storage buckets to allow uploads without authentication
-- This allows the covers bucket to accept uploads from the application

-- Create a policy that allows all operations on the covers bucket
CREATE POLICY "Allow all operations on covers bucket" ON storage.objects
FOR ALL USING (bucket_id = 'covers') WITH CHECK (bucket_id = 'covers');

-- Alternative: If the above doesn't work, you can also try disabling RLS on the storage.objects table
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
