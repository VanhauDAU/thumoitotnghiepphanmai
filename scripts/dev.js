import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function runCommand(command, args, cwd, label) {
  const proc = spawn(command, args, {
    cwd,
    stdio: 'pipe',
    shell: true,
  });

  proc.stdout.on('data', (data) => {
    process.stdout.write(`[${label}] ${data}`);
  });

  proc.stderr.on('data', (data) => {
    process.stderr.write(`[${label}] ${data}`);
  });

  proc.on('close', (code) => {
    console.log(`[${label}] exited with code ${code}`);
  });

  return proc;
}

console.log('🚀 Đang khởi động Server và Client...\n');

const server = runCommand('npm', ['run', 'dev'], join(root, 'server'), 'SERVER');
const client = runCommand('npm', ['run', 'dev'], join(root, 'client'), 'CLIENT');

process.on('SIGINT', () => {
  server.kill();
  client.kill();
  process.exit();
});
