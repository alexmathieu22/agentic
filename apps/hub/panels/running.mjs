// This week's training and today's verdict, from the running-coach CLI.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const COACH = fileURLToPath(new URL('../../../domains/life/running/skills/running-coach/', import.meta.url));
const coach = async (...args) => JSON.parse((await run('uv', ['run', 'scripts/coach.py', ...args, '--json'], { cwd: COACH })).stdout);

export async function load() {
  const [today, week] = await Promise.all([coach('today'), coach('week')]);
  return { plannedKm: week.planned_km, doneKm: week.done_km, today: today.plans };
}

export async function detail() {
  const [runs, week] = await Promise.all([coach('runs', '--days', '28'), coach('week')]);
  return { runs, week };
}
