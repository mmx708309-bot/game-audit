import { readFile, writeFile } from 'node:fs/promises';

const files = [
  'client/index.html',
  'client/public/privacy.html',
  'capacitor.config.ts',
  'android/app/src/main/res/values/strings.xml',
  'android/app/src/main/assets/capacitor.config.json',
  'android/app/src/main/assets/public/index.html',
  'android/app/src/main/assets/public/privacy.html',
  'STORE_LISTING_AR.md',
  'ANDROID_ADMOB.md',
  'ideas.md',
  'privacy-verification.md',
];
const oldName = 'تحدّي الـ50 ألف سؤال';
const newName = 'فكّر بسرعة';
for (const relative of files) {
  const path = new URL(`../${relative}`, import.meta.url);
  const source = await readFile(path, 'utf8');
  await writeFile(path, source.replaceAll(oldName, newName));
}
console.log(`renamed ${files.length} branding files`);
