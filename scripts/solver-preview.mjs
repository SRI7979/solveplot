// Run the isolated frontend without changing the main app or its dev server.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2] === 'build' ? 'build' : 'dev';
loadEnvConfig(root, mode === 'dev');
// Keep dev and build on the same bundler: Turbopack's workspace discovery
// otherwise picks up the parent app's proxy instead of this isolated preview.
const args = [require.resolve('next/dist/bin/next'), mode, 'prototypes/solver', ...(mode === 'dev' ? ['--webpack', '--port', '3001'] : ['--webpack'])];
const child = spawn(process.execPath, args, { cwd: root, env: process.env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { process.stderr.write(`${error.message}\n`); process.exit(1); });
child.on('exit', code => process.exit(code ?? 1));
