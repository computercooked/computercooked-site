#!/bin/bash
# usage: run.sh <tag> mins seeds...   (base* = scratch copy dir named before "_", e.g. base44_x; anything else = worktree)
# RUN=n varies the seeded randomness (ladder.js seeds Math.random from the island seed and RUN)
S=/tmp/claude-0/-home-user-computercooked-site/9e16fbd6-0476-5ed7-a1d1-1bef57eca838/scratchpad/cosy
tag=$1; mins=$2; shift 2
case "$tag" in base*) L=$S/${tag%%_*}/games/smol-brains/tests/_load.js;; *) L=/home/user/computercooked-site/.claude/worktrees/agent-a0a2d6bd8c2b8b255/games/smol-brains/tests/_load.js;; esac
for seed in "$@"; do LOADER=$L DIAG=1 node $S/ladder.js $seed $mins > $S/$tag-$seed.txt 2>&1 & done
wait; echo all-done
