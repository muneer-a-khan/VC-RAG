import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
    "File storage operations will fail."
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

// Storage bucket name for file uploads
export const STORAGE_BUCKET = 'chat-files'

