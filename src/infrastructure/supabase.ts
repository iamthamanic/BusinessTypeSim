import { createClient, type Session } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const cloudConfigured = Boolean(url && publishableKey)
export const supabase = cloudConfigured ? createClient(url as string, publishableKey as string) : null

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function signInWithEmail(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase ist nicht konfiguriert.' }
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  return error ? { error: error.message } : {}
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut()
}
