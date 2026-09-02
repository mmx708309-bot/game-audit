import { readFile, writeFile } from 'node:fs/promises';

const email = process.env.APP_SUPPORT_EMAIL;
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error('APP_SUPPORT_EMAIL is missing or invalid');
}
const path = new URL('../client/public/privacy.html', import.meta.url);
const html = await readFile(path, 'utf8');
const updated = html.replace(
  'استخدم بريد الدعم العام المعلن في صفحة المتجر أو داخل التطبيق.',
  `تواصل معنا عبر بريد الدعم: <a href="mailto:${email}">${email}</a>.`
);
await writeFile(path, updated);
