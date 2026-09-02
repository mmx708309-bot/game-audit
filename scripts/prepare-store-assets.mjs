import { mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
await mkdir('/home/ubuntu/webdev-static-assets', { recursive: true });
const script = `from PIL import Image
icon = Image.open('/home/ubuntu/webdev-static-assets/tahaddi-50k-icon.png').convert('RGB')
icon.resize((512,512), Image.Resampling.LANCZOS).save('/home/ubuntu/webdev-static-assets/tahaddi-50k-icon-512.png', optimize=True)
feature = Image.open('/home/ubuntu/webdev-static-assets/tahaddi-50k-feature.png').convert('RGB')
w,h = feature.size
target_ratio = 1024/500
crop_h = int(w/target_ratio)
y0 = max(0, min(h-crop_h, 80))
feature.crop((0,y0,w,y0+crop_h)).resize((1024,500), Image.Resampling.LANCZOS).save('/home/ubuntu/webdev-static-assets/tahaddi-50k-feature-1024x500.png', optimize=True)
`;
await exec('python3', ['-c', script]);
console.log('store assets prepared');
