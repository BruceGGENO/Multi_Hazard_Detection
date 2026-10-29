import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const command = process.argv[2];
if (!['dev', 'build', 'start'].includes(command)) throw new Error('Expected dev, build or start');
const args = ['--import', new URL('../lib/network-guard.mjs', import.meta.url).href, fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)), command];
if (command !== 'build') args.push('--hostname', '127.0.0.1');
const extra = process.argv.slice(3);
if (extra.length) {
  if (command === 'build' || extra.length !== 2 || !['--port', '-p'].includes(extra[0]) || !/^\d+$/.test(extra[1]) || Number(extra[1]) < 1 || Number(extra[1]) > 65535) throw new Error('Only --port <1-65535> is allowed; host overrides are disabled');
  args.push(...extra);
}
const child = spawn(process.execPath, args, { stdio: 'inherit', windowsHide: true, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
child.on('error', () => { console.error('Local server could not start'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
