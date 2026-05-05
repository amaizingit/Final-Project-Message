import { createClient } from '@supabase/supabase-js';

// Use (import.meta as any).env to bypass type issues while ensuring Vite compatibility
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

console.log("Supabase initialization check:", {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl ? (supabaseUrl.substring(0, 10) + "...") : "MISSING"
});

// Create client only if configured, otherwise create a mock to prevent crashing
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      from: () => ({
        select: () => ({ 
          eq: () => ({ single: () => Promise.resolve({ data: null, error: null }), maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
          ilike: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
          order: () => Promise.resolve({ data: [], error: null }), 
          limit: () => Promise.resolve({ data: [], error: null }) 
        }),
        insert: () => Promise.resolve({ data: [], error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        upsert: () => Promise.resolve({ data: [], error: null }),
      }),
      channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
      removeChannel: () => {},
      functions: {
        invoke: (name: string, options: any) => {
          console.log(`Mock invoking function ${name} with options:`, options);
          return Promise.resolve({ data: null, error: null });
        }
      }
    } as any;
