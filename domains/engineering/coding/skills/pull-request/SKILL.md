---
name: pull-request
description: >
  Use when opening a pull or merge request, writing its description, or
  preparing a branch to be reviewed. Covers the checks before opening, what the
  description must carry that the diff cannot, and sizing. For commits,
  branches and rewriting history, use git-workflow instead.
x-domain: engineering.coding
x-requires: [git]
---

# Pull requests

## When this applies

The work is finished and is about to be shown to someone. Not for committing or
tidying history — that is `git-workflow`, which runs first.

## Know the host before you start

Nothing below is GitHub-specific. Determine the host from the repository
itself, which is authoritative:

```bash
git remote get-url origin
```

| Host | CLI | Calls it |
|---|---|---|
| GitHub | `gh` | pull request |
| GitLab | `glab` | merge request |
| Forgejo / Gitea | `tea` | pull request |

Use the host's own word for it rather than translating. For preferences that
cannot be inferred — branch naming, the account to act as, the fallback when a
repository has no remote — read `~/.config/agents/git.yaml` (template:
`config/git.yaml`). If neither the remote nor the config answers the question,
ask rather than assuming GitHub.

## The gate

**Never open a PR without showing the commits and the description first.**
Opening one is outward-facing and awkward to take back: it notifies people,
starts CI, and the first version is what reviewers form an opinion from.

Show, then wait:

```bash
git log --oneline <base>..HEAD     # the commits
git diff <base>...HEAD --stat      # the shape of the change
```

If anything needs reordering, rewording or splitting, do it now —
`git rebase -i <base>`. After review starts, history is no longer yours to
rewrite.

## Before opening

1. **Rebase onto the base branch.** Review a change against where it will land,
   not where it started.
2. **Read your own diff, all of it.** You will find leftover debug output, a
   commented block, a file you never meant to stage. Finding it yourself costs
   nothing; a reviewer finding it costs a round trip.
3. **Run the tests, and say you did.** Not "should be fine".
4. **Check what the branch actually contains.** `git diff <base>...HEAD --stat`
   catches the file you forgot was in there.

## The description

The diff already says *what changed*. The description carries what the diff
cannot:

```markdown
## Why
The problem, and why now. A reviewer who disagrees with this section
should not bother reading the diff yet.

## What
The approach, in a few sentences. Name the alternative you rejected when
the choice was not obvious.

## Verification
The command you ran and what it showed. Steps to check it by hand where
that applies.

## Notes
Anything out of scope, deliberately deferred, or risky. Say what you are
least sure about — it directs review where it is worth spending.
```

Rules:

- **Title in Conventional Commits form**, describing the whole change:
  `feat(auth): add device-code login`. It usually becomes the squash message.
- **Link the issue** so it closes on merge: `Closes #412`.
- **Do not restate the diff.** A bullet per file is noise; reviewers can read.
- **Flag your own uncertainty.** "I'm unsure the retry belongs at this layer"
  gets you a better review than silence.
- **Follow the repository's attribution convention**, if it has one.

## Sizing

If the description needs more than a short paragraph under *What*, the PR is
probably several changes. Split it — a reviewer's attention per line falls
sharply with size, so two 200-line PRs get more real scrutiny than one of 400.

A pure refactor and a behaviour change belong in different PRs even when one
enabled the other, for the same reason they belong in different commits.

## Draft or ready

Open as a **draft** when the work continues, when CI has not passed yet, or
when you want direction on the approach before the detail is reviewed. Mark it
ready only when you would be comfortable with it merging as-is.

## Merging

Squash or rebase — **never a merge commit**. Both keep the default branch
linear; the difference is whether the individual commits survive.

| | Use when |
|---|---|
| **Squash** | The default. The branch is one logical change, and its intermediate commits were steps toward it rather than things worth keeping. |
| **Rebase** | The commits are individually meaningful and independently revertable — several atomic changes that happened to be reviewed together. |

When squashing, **the squash message is the one that survives**, so write it
rather than accepting the concatenation of every commit subject that the host
offers by default. Conventional Commits form, and a body explaining why.

Delete the branch on merge. A merged branch left behind is a branch someone
will later mistake for unmerged work.

## After opening

- **Respond to every comment**, even if only to say you disagree and why.
- **Push fixes as new commits** while review is in progress, so reviewers can
  see what changed since they looked. Tidy up at the end if the project squashes.
- **Never force-push a branch under active review** unless you say so first —
  it destroys the reviewer's place.

## Done when

The commits were shown and approved before opening, the description explains why
rather than what, the verification is stated with real output, and you would
merge it yourself.
