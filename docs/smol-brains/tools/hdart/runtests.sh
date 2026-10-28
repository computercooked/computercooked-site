#!/bin/sh
cd /home/user/computercooked-site/.claude/worktrees/agent-a51e6ade86ed61b36
for t in hd pixel possess save biomes world; do
  echo "== $t"
  timeout 1500 node games/smol-brains/tests/$t.test.js 2>&1 | tail -3
done
