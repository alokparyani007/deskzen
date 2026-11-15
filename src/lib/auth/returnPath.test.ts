import { describe, expect, it } from 'vitest';
import { clearReturnPath, peekReturnPath, rememberReturnPath, returnPathFrom, safeReturnPath } from './returnPath';

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

describe('sign-in return path', () => {
  it('allows in-app paths and drops everything else', () => {
    expect(safeReturnPath('/live')).toBe('/live');
    expect(safeReturnPath('/set-my-zen?pose=sit')).toBe('/set-my-zen?pose=sit');
    expect(safeReturnPath('/app/privacy')).toBe('/app/privacy');
    expect(safeReturnPath('/settings')).toBe('/settings');
    expect(safeReturnPath('https://evil.example/app')).toBeNull();
    expect(safeReturnPath('//evil.example/app')).toBeNull();
    expect(safeReturnPath('/login')).toBeNull();
    expect(safeReturnPath('/privacy')).toBeNull();
    expect(safeReturnPath('/learn/afternoon-slump')).toBeNull();
    expect(safeReturnPath('javascript:alert(1)')).toBeNull();
    expect(safeReturnPath('/\\evil')).toBeNull();
  });

  it('prefers the query, then router state, then the app home', () => {
    expect(returnPathFrom('/live', '/settings')).toBe('/live');
    expect(returnPathFrom(null, '/progress')).toBe('/progress');
    expect(returnPathFrom('/login', 'https://evil.example')).toBe('/app');
    expect(returnPathFrom(null, null)).toBe('/app');
  });

  it('remembers a return path until it is used or it expires', () => {
    const storage = memory();
    rememberReturnPath('/app', storage, 1_000);
    expect(peekReturnPath(storage, 1_000)).toBeNull();
    rememberReturnPath('/live?debug=1', storage, 1_000);
    expect(peekReturnPath(storage, 1_000)).toBe('/live?debug=1');
    expect(peekReturnPath(storage, 1_000 + 60 * 60 * 1000 + 1)).toBeNull();
    rememberReturnPath('/reminders', storage, 5_000);
    clearReturnPath(storage);
    expect(peekReturnPath(storage, 5_000)).toBeNull();
  });
});
