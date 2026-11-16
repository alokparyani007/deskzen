import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isAnonSessionId, safeUsagePath } from '../usage/events';
import { anonSessionId, usageClientOptions } from '../usage/track';
import { feedbackMessage } from './prompt';

export type FeedbackRating = 'up' | 'down';

/** The only fields the browser may insert. */
export type FeedbackInsert = {
  rating: FeedbackRating;
  message: string | null;
  anon_session: string;
  page: string | null;
};

export function feedbackInsert(input: {
  rating: string;
  message: string;
  sessionId: string;
  page: string | null | undefined;
}): FeedbackInsert | null {
  if (input.rating !== 'up' && input.rating !== 'down') return null;
  if (!isAnonSessionId(input.sessionId)) return null;
  return {
    rating: input.rating,
    message: feedbackMessage(input.message),
    anon_session: input.sessionId,
    page: safeUsagePath(input.page),
  };
}

/**
 * Builds one row and hands it to insert. A bad rating or session id is dropped.
 * insert receives only rating, message, anon_session, and page.
 */
export async function deliverFeedback(
  input: { rating: string; message: string; page?: string | null },
  deps: { sessionId: string; insert: (row: FeedbackInsert) => Promise<boolean> },
): Promise<boolean> {
  const row = feedbackInsert({
    rating: input.rating,
    message: input.message,
    sessionId: deps.sessionId,
    page: input.page,
  });
  if (!row) return false;
  try {
    return await deps.insert(row);
  } catch {
    return false;
  }
}

let client: SupabaseClient | null = null;

async function insertWithAnonKey(row: FeedbackInsert): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  if (!url || !key) return false;
  try {
    const options = usageClientOptions();
    client ??= createClient(url, key, {
      ...options,
      auth: { ...options.auth, storageKey: 'deskzen.feedback.nosession' },
    });
    const { data } = await client.auth.getSession();
    // A signed-in token would carry an account id. This client keeps persistSession off.
    if (data.session) return false;
    const { error } = await client.from('feedback').insert({
      rating: row.rating,
      message: row.message,
      anon_session: row.anon_session,
      page: row.page,
    });
    return !error;
  } catch {
    return false;
  }
}

/** Stores a thumbs rating and an optional note. Never sends a camera frame. */
export function submitFeedback(input: {
  rating: string;
  message: string;
  page?: string | null;
}): Promise<boolean> {
  if (import.meta.env.MODE === 'test') return Promise.resolve(false);
  return deliverFeedback(input, {
    sessionId: anonSessionId(),
    insert: insertWithAnonKey,
  });
}
