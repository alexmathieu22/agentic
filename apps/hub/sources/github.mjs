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

// Open issues of the repo checked out at `repoPath` (a path the server already knows, never user input).
export async function issues(repoPath) {
  const remote = (await run('git', ['-C', repoPath, 'remote', 'get-url', 'origin'])).stdout.trim();
  const slug = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(\.git)?$/)?.[1];
  if (!slug) throw new Error(`${remote} is not a GitHub repo`);
  const list = JSON.parse((await run('gh', ['issue', 'list', '-R', slug, '--state', 'open', '--json', 'number,title,url,updatedAt,labels', '--limit', '50'])).stdout);
  return { slug, issues: list.map((i) => ({ id: `#${i.number}`, title: i.title, url: i.url, updatedAt: i.updatedAt, labels: i.labels.map((l) => l.name) })) };
}
