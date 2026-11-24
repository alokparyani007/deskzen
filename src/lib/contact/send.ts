import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { usageClientOptions } from '../usage/track';
import type { ContactRow } from './message';

export type ContactSendResult = 'sent' | 'rate_limited' | 'failed';

let client: SupabaseClient | null = null;

function contactClient(url: string, key: string): SupabaseClient {
  if (client) return client;
  const options = usageClientOptions();
  client = createClient(url, key, {
    ...options,
    auth: {
      ...options.auth,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'deskzen.contact.nosession',
    },
  });
  return client;
}

function isRateLimited(error: { message?: string; code?: string; details?: string }): boolean {
  const text = `${error.code ?? ''} ${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return text.includes('rate_limited') || error.code === 'P0001';
}

/**
 * Store one note with the public anon key. Insert only, no read-back.
 * A follow-up function emails Alok when that mailbox is configured.
 * The inbox address is not in this file.
 */
export async function sendContact(row: ContactRow): Promise<ContactSendResult> {
  if (import.meta.env.MODE === 'test') return 'sent';
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  if (!url || !key) return 'failed';
  try {
    const supabase = contactClient(url, key);
    const inserted = await supabase.from('contact_messages').insert({
      name: row.name,
      email: row.email,
      message: row.message,
    });
    if (inserted.error) return isRateLimited(inserted.error) ? 'rate_limited' : 'failed';
    try {
      await supabase.functions.invoke('notify-contact', { body: row });
    } catch {
      // The note is already stored. Mail can catch up once the secret is set.
    }
    return 'sent';
  } catch {
    return 'failed';
  }
}
