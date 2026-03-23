-- Supabase RLS Security Policies for Exit Exam
-- Run this in the Supabase SQL Editor for your project

-- Enable RLS on chat_messages table
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Only allow users to select messages where they are sender or receiver
CREATE POLICY "Users can view their own messages" ON chat_messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- Only allow users to insert messages as themselves
CREATE POLICY "Users can insert their own messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

-- Only allow users to update their own messages (optional, if needed)
CREATE POLICY "Users can update their own messages" ON chat_messages
  FOR UPDATE USING (
    auth.uid() = sender_id
  );

-- Only allow users to delete their own messages (optional, if needed)
CREATE POLICY "Users can delete their own messages" ON chat_messages
  FOR DELETE USING (
    auth.uid() = sender_id
  );

-- Repeat similar policies for other tables (users, tasks, etc.) as needed.
-- Example for users table:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own profile" ON users
--   FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update their own profile" ON users
--   FOR UPDATE USING (auth.uid() = id);

-- Make sure to review and adapt for all tables you want to secure!
