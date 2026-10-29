import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';

export function prompt(label, { secret = false, defaultValue = '' } = {}) {
  if (!stdin.isTTY) throw new Error('Run this command in an interactive terminal.');
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true });
    if (secret) rl._writeToOutput = () => {};
    stdout.write(`${label}${defaultValue ? ` [${defaultValue}]` : ''}: `);
    let answered = false;
    rl.on('SIGINT', () => { rl.close(); });
    rl.on('close', () => { if (!answered) reject(new Error('Input canceled.')); });
    rl.question('', answer => {
      answered = true;
      rl.close();
      if (secret) stdout.write('\n');
      resolve(answer || defaultValue);
    });
  });
}

export async function newPassword() {
  const password = await prompt('New password (14+ characters; input hidden)', { secret: true });
  if (password.length < 14 || password.length > 256) throw new Error('Password must contain 14–256 characters.');
  const confirmation = await prompt('Confirm password (input hidden)', { secret: true });
  if (password !== confirmation) throw new Error('Passwords do not match. No change made.');
  return password;
}
