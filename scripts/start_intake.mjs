import { mkdirSync, openSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const cwd = resolve(import.meta.dirname, '..');
const logsDir = resolve(cwd, 'logs');
mkdirSync(logsDir, { recursive: true });

const out = openSync(resolve(logsDir, 'ecocc-intake.out.log'), 'a');
const err = openSync(resolve(logsDir, 'ecocc-intake.err.log'), 'a');

const child = spawn(process.execPath, ['src/index.ts', '--env-file', '.env.intake.local'], {
  cwd,
  env: {
    ...process.env,
    DINGTALK_ENV_FILE: '.env.intake.local'
  },
  stdio: ['inherit', out, err],
  windowsHide: true
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
