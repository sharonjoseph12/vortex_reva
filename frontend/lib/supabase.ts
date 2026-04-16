import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// The public client uses the Anonymous Key and respects RLS policies.
// Essential for client-side Realtime and Storage access.
// If credentials are missing, we default to a mock behavior to prevent crashes.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      channel: () => ({
        on: () => ({
          subscribe: () => ({})
        }),
        subscribe: () => ({})
      }),
      removeChannel: () => ({})
    } as any;

