import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/index.ts', 'src/worker.ts'], outdir: 'dist', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, legalComments: 'eof' });
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json'], { stdio: 'inherit' });
let notices = 'Bundled third-party licenses\n\n';
for (const name of ['qrcode-generator', 'gifuct-js', 'gifenc', 'js-binary-schema-parser']) {
 const root = pathToFileURL(dirname(require.resolve(name + '/package.json')) + '/');
 let license;
 for (const file of ['LICENSE', 'LICENSE.txt', 'LICENSE.md']) { try { license = await readFile(new URL(file, root), 'utf8'); break; } catch {} }
 if (!license && name === 'qrcode-generator') license = (await readFile(require.resolve(name), 'utf8')).split('var qrcode =')[0] + '\nPermission is hereby granted' + (await readFile(require.resolve('gifenc/package.json').replace('package.json', 'LICENSE.md'), 'utf8')).split('Permission is hereby granted')[1];
 if (!license) throw new Error('Missing license for ' + name);
 notices += name + '\n' + license + '\n\n';
}
await writeFile('THIRD_PARTY_NOTICES.txt', notices);
