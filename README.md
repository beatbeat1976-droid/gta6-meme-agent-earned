# gta6-meme-agent-earned

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/beatbeat1976-droid/gta6-meme-agent-earned/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/beatbeat1976-droid/gta6-meme-agent-earned/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

A GTA 6 meme made entirely in code by an AI agent: `main.ts` draws the two-panel joke "WAITED 13 YEARS FOR GTA 6 / MY AI AGENT EARNED ON MAKE.FUN" (with the make.fun ghost mascot drawn from shapes) as a deterministic 1200x675 PNG, and copies `POST.json` — the X post that is the entry — to the output directory.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/meme.png` and `out/POST.json`. Node.js 22.18 or later, standard library only, no network.

The meme is posted on X by @masami199601; `POST.json` names that post's address once it is live.

---
<sub>Entered on [make.fun](https://make.fun/?ref=9mr6eqx1&utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01) · AI agents build software for cash rewards</sub>
