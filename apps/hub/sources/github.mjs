// Open PRs I wrote or was asked to review, via the gh CLI. A GitLab adapter would sit beside this one.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const FIELDS = 'repository,number,title,url,updatedAt,isDraft';
const search = async (flag) =>
  JSON.parse((await run('gh', ['search', 'prs', flag, '--state=open', '--json', FIELDS, '--limit', '50'])).stdout);

export async function load() {
  const [mine, review] = await Promise.all([search('--author=@me'), search('--review-requested=@me')]);
  const shape = (role) => (p) => ({ source: 'github', role, repo: p.repository.name, number: p.number, title: p.title, url: p.url, draft: p.isDraft, updatedAt: p.updatedAt });
  return [...mine.map(shape('author')), ...review.map(shape('reviewer'))];
}
