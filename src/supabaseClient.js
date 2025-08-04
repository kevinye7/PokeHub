import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://esoedbcazqfvywhamtff.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzb2VkYmNhenFmdnl3aGFtdGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjA2NzQsImV4cCI6MjA2OTQ5NjY3NH0.4Kxp8L6w_2iZlIJosFunzAndxjeCRamZl-Ppr6z7oWY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)