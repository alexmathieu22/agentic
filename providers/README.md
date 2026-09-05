# Providers

One file per backend. Each is plain shell, sourceable by anything — no tool, no
format, no parser.

Switching provider is sourcing a different file.

## Use

```bash
mkdir -p ~/.config/agents
cp providers/deepseek.env.example ~/.config/agents/deepseek.env
chmod 600 ~/.config/agents/deepseek.env
$EDITOR ~/.config/agents/deepseek.env      # fill in the key

source ~/.config/agents/deepseek.env
```

A shell function makes it one word — add to your zsh config:

```sh
agent-use() { source ~/.config/agents/"$1".env && echo "agent provider: $1"; }
```

## Model tiers

Every profile sets the same three variables, so agent definitions can name a
tier instead of a model and stay portable:

| Variable | Meaning | Used by |
|---|---|---|
| `AGENT_MODEL_FAST` | Cheap, high-volume, mechanical work | `x-model: fast` |
| `AGENT_MODEL_PRIMARY` | Default for real work | `x-model: primary` |
| `AGENT_MODEL_DEEP` | Hard reasoning, worth the cost | `x-model: deep` |

Harnesses that read model names from the environment pick these up directly.
Ones that don't take the values pasted into their own config once.

## Protocol

Harnesses speak either the OpenAI or the Anthropic wire format. Each profile
sets whichever base URL and key variables apply, so the same file works
regardless of which the harness expects.

## Rule

**No real values in this repo.** These are `.env.example` files naming
variables. `.gitignore` blocks `*.env`, and the filled-in copies live in
`~/.config/agents/` at mode 600.
