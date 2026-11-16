import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from '@supabase/supabase-js';
import { usageClientOptions } from '../usage/track';
import type { FeedbackInsert } from './prompt';

export type FeedbackSender = (row: FeedbackInsert) => Promise<void> | void;

/**
 * Separate from the sign-in client.
 * persistSession is off, so a signed-in person's access token is never attached.
 * return=minimal avoids reading the row back. There is no select policy.
 */
export function feedbackClientOptions(): SupabaseClientOptions<'public'> {
  const options = usageClientOptions();
  return {
    ...options,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'deskzen.feedback.nosession',
    },
  };
}

let feedbackClient: SupabaseClient | null = null;

async function insertFeedback(row: FeedbackInsert): Promise<void> {
  if (import.meta.env.MODE === 'test') throw new Error('skipped');
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  if (!url || !key) throw new Error('missing');
  feedbackClient ??= createClient(url, key, feedbackClientOptions());
  const { data } = await feedbackClient.auth.getSession();
  if (data.session) throw new Error('session');
  const payload: FeedbackInsert = {
    rating: row.rating,
    message: row.message,
    anon_session: row.anon_session,
    page: row.page,
  };
  const { error } = await feedbackClient.from('feedback').insert(payload);
  if (error) throw error;
}

/** Sends the four allowed columns. Returns false when the insert does not land. */
export async function sendFeedback(
  row: FeedbackInsert,
  send?: FeedbackSender,
): Promise<boolean> {
  try {
    if (send) {
      await send(row);
      return true;
    }
    await insertFeedback(row);
    return true;
  } catch {
    return false;
  }
}
