---
name: budget
description: >
  Use when the user tells you about spending or paying back money in the
  shared budget with their partner — "I paid 45 at IGA", "add 30 for dinner,
  split 50/50", "my partner paid the hydro bill", "I bought her concert
  ticket", "rent is 1400 every month", "she sent me 200" — or asks "how much
  does she owe me", "who owes who", "what did we spend this month", or wants
  the budget CLI set up. Drives the `budget` CLI of the self-hosted budget
  app. Not for investments, net worth or other budgeting tools.
metadata:
  domain: life.finance
compatibility: Requires python3 and the budget app's CLI (set up on first use)
---

# Budget

Turns what the user says about money into `budget` CLI calls against their
self-hosted budget app, and reports what the app answered. Nothing about the
user is stored here: names, categories and the split come from the app.

## When this applies

Adding expenses, checking who owes whom, or reading a month's budget. **Not**
for editing or deleting an expense, recording a payback, or changing
categories and plans — the CLI can't, so point the user to the app's
Shared/Mine tab (✎ edits, × deletes, Settle up records a payback) or Settings.

## First use in a session

Run `budget categories` and `budget balance`. If both work, keep the category
names (never guess one that isn't listed) and the two names in the balance
line, so "she paid" becomes `--paid-by <her name>`. Otherwise set it up:

1. **`budget` not found.** The CLI is `cli.py` in the budget app's repository.
   Ask the user where their checkout is, or for the repository to clone
   (`gh repo clone <owner/repo> <dir>`). Then link it onto the PATH:
   `mkdir -p ~/.local/bin && ln -sf <checkout>/cli.py ~/.local/bin/budget`.
   If `command -v budget` still fails, `~/.local/bin` isn't on the PATH: tell
   the user the line to add to their shell profile rather than editing it.
2. **"not set up yet".** Ask for the app's address — the tailnet one; the
   public one is behind a login a script can't pass — and their name as shown
   in the app.
3. **Prerequisite: the address answers from this machine.** Before setup, run
   `curl -s -o /dev/null -w "%{http_code}\n" <address>`. `200` means go on.
   `000` usually means this machine can't resolve the internal hostname: it is
   only known to a LAN or tailnet DNS (a rewrite, a split-DNS zone) this machine
   isn't using, or the tailnet's MagicDNS suffix shadows that zone. Confirm by
   reaching the internal gateway's IP directly:
   `curl -s -o /dev/null -w "%{http_code}\n" --resolve <host>:443:<gateway-ip> <address>`.
   If that answers, the user adds `<gateway-ip> <host>` to `/etc/hosts` — a
   system file needing sudo, so give them the line rather than editing it. It
   goes stale if the gateway's IP changes; a DNS record for the host is the
   lasting fix.
4. Run `budget setup --url <address> --me <name>`: it checks both against the
   app and saves them. Relay its error if one is wrong.
5. Rerun `budget balance` to confirm, then carry on with what the user asked.

Show each command before running it; these change the user's machine.

## Adding an expense

Build one `budget add AMOUNT "DESCRIPTION" -c CATEGORY [flags]` per expense
the user mentioned.

| The user says | Flag |
|---|---|
| "I paid" / nothing about who paid | (default, paid by them) |
| "she paid", "<partner's name> paid" | `--paid-by <partner's name>` (from the balance line; the CLI checks it) |
| "split evenly", "half each", "50/50" | `--split 50/50` |
| "for her", "I bought her …", "my treat for him" — paid entirely for the other | `--split all` |
| "I'll cover 30%" — their own share | `--split 30` |
| nothing about the split | (default: by income) |
| "just for me", "my own", clothes or hobbies of their own | `--personal` (and a category from "Yours") |
| "yesterday", "last Friday", a date | `--date YYYY-MM-DD`, worked out from today's date |
| "every month", "monthly", "each 1st" | `--monthly` with `--date` at the first occurrence |

- Description: the merchant or item, short — "IGA", "Concert ticket".
- Category: pick the obvious match from the listed names (groceries store →
  Groceries). If two fit or none does, ask once, offering the listed names.
- "She sent me 200" is a payback, not an expense: send them to Settle up in
  the app.
- Run the commands one at a time. If one fails, nothing was added for it —
  relay the error, fix the flag, rerun only that one. If unsure whether
  something went in, check `budget month` before retrying; never add twice.

## Reading

- "Who owes who" → `budget balance`.
- "What did we spend", "how's the budget" → `budget month [YYYY-MM]`, then
  summarise: what's over plan, what's left, the balance. Don't paste the whole
  output back unless asked.

## Done when

Every expense the user described shows an `Added …` line (or the user was
asked about the one ambiguity), and you've told them the balance line the CLI
printed after the last one.
