#!/bin/bash
# run every smol-brains test, 3 at a time; logs in cosy/t/<name>.log, summary at the end
T=/home/user/computercooked-site/.claude/worktrees/agent-a0a2d6bd8c2b8b255/games/smol-brains/tests
O=/tmp/claude-0/-home-user-computercooked-site/9e16fbd6-0476-5ed7-a1d1-1bef57eca838/scratchpad/cosy/t
mkdir -p $O
list="${@:-$(cd $T && ls *.test.js)}"
printf '%s\n' $list | xargs -P 3 -I{} bash -c "cd $T && timeout 1500 node {} > $O/{}.log 2>&1; echo \"\$? {}\" >> $O/codes.txt"
echo "== results"; sort -k2 $O/codes.txt
