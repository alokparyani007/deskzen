export type FeedbackOffer = { page: string | null };

let offer: FeedbackOffer | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getFeedbackOffer(): FeedbackOffer | null {
  return offer;
}

export function subscribeFeedback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openFeedback(page: string | null): void {
  offer = { page };
  emit();
}

export function dismissFeedback(): void {
  if (!offer) return;
  offer = null;
  emit();
}
