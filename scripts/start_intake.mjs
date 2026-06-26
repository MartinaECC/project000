import { existsSync, mkdirSync, openSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const cwd = resolve(import.meta.dirname, '..');
const envFile = process.env.DINGTALK_ENV_FILE ?? '.env.intake.local';
const fileEnv = readEnvFile(resolve(cwd, envFile));
const logsDir = resolve(
  cwd,
  process.env.OPS_ASSISTANT_LOG_DIR ??
    process.env.LOG_DIR ??
    fileEnv.OPS_ASSISTANT_LOG_DIR ??
    fileEnv.LOG_DIR ??
    'logs'
);
mkdirSync(logsDir, { recursive: true });

const out = openSync(resolve(logsDir, 'ecocc-intake.out.log'), 'a');
const err = openSync(resolve(logsDir, 'ecocc-intake.err.log'), 'a');

const child = spawn(process.execPath, ['src/index.ts', '--env-file', envFile], {
  cwd,
  env: {
    ...process.env,
    DINGTALK_ENV_FILE: envFile
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

function readEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  const values = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }
    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();
    values[key] = unquote(value);
  }
  return values;
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
