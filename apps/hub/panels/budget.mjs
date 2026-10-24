// Who owes whom, from the budget CLI (see the budget skill for setup).
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export async function load() {
  try {
    return { text: (await promisify(execFile)('budget', ['balance'])).stdout.trim() };
  } catch (e) {
    throw e.code === 'ENOENT' ? new Error('budget CLI not installed, see the budget skill') : e;
  }
}
