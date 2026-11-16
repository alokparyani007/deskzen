import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { usageClientOptions } from '../usage/track';
import type { FeedbackRow } from './row';

let client: SupabaseClient | null = null;

function feedbackClient(url: string, key: string): SupabaseClient {
  if (client) return client;
  const options = usageClientOptions();
  client = createClient(url, key, {
    ...options,
    auth: {
      ...options.auth,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'deskzen.feedback.nosession',
    },
  });
  return client;
}

/** Insert one answer. No read-back. A failure stays quiet so Live view keeps going. */
export async function sendFeedback(row: FeedbackRow): Promise<void> {
  if (import.meta.env.MODE === 'test') return;
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  if (!url || !key) return;
  try {
    const payload: FeedbackRow = {
      feedback_id: row.feedback_id,
      anon_session: row.anon_session,
      question: row.question,
      answer: row.answer,
      page: row.page,
    };
    await feedbackClient(url, key).from('feedback').insert(payload);
  } catch {
    // Optional feedback must never break the session.
  }
}
