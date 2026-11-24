/** Pure checks for the public contact form. No network, no secrets. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ContactFields = {
  name: string;
  email: string;
  message: string;
  /** Hidden field. A filled value is treated as spam and is not stored. */
  companyUrl: string;
};

export type ContactRow = {
  name: string;
  email: string;
  message: string;
};

export type ContactPlan =
  | { ok: true; silent: true }
  | { ok: false; field: 'name' | 'email' | 'message' }
  | { ok: true; silent: false; row: ContactRow };

export function planContact(input: ContactFields): ContactPlan {
  if (input.companyUrl.trim()) return { ok: true, silent: true };
  const name = input.name.trim().replace(/\s+/g, ' ');
  const email = input.email.trim();
  const message = input.message.trim();
  if (name.length < 1 || name.length > 80) return { ok: false, field: 'name' };
  if (email.length > 200 || !EMAIL.test(email)) return { ok: false, field: 'email' };
  if (message.length < 1 || message.length > 4000) return { ok: false, field: 'message' };
  return { ok: true, silent: false, row: { name, email, message } };
}
