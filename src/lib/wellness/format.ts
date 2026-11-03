import type { WorkStyle } from '../settings/defaults';

export function formatSpan(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest}m`;
  return `${hours}h ${rest}m`;
}

export function sitStandLine(sitMs: number, standMs: number): string {
  return `Sat ${formatSpan(sitMs)}, stood ${formatSpan(standMs)}`;
}

export function stoodSummary(standMs: number): string {
  return `You stood ${formatSpan(standMs)} this week`;
}

export function homeHeadline(style: WorkStyle, minutes: number, standing: boolean): { title: string; detail: string } {
  if (style === 'stand') {
    return {
      title: `You've been standing ${minutes} minutes`,
      detail: 'Shift your weight or sit for a few minutes.',
    };
  }
  if (style === 'mixed') {
    return {
      title: standing ? 'You are standing' : 'You are sitting',
      detail: 'Your timer follows how you are actually working.',
    };
  }
  return {
    title: `You've been sitting ${minutes} minutes`,
    detail: 'A short stretch is here when you want one.',
  };
}
