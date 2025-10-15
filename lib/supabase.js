import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const createUnconfiguredClient = () =>
  new Proxy(
    {},
    {
      get: () => {
        throw new Error(
          'Supabase credentials are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable data access.'
        )
      }
    }
  )

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createUnconfiguredClient()

export const isSupabaseConfigured = isConfigured
