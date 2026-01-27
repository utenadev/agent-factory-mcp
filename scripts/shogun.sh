#!/bin/bash

# Agent Factory Shogun - 出陣スクリプト
# tmux を用いて Gemini (Planner) と Claude (Coder) の協働環境を一撃で構築する。

SESSION_NAME="agent-factory-shogun"
GEMINI_TITLE="gemini-planner"
CLAUDE_TITLE="claude-coder"

# 1. 既存セッションの確認とリセット
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
  echo "⚠️  Session '$SESSION_NAME' already exists."
  echo "Killing existing session to restart..."
  tmux kill-session -t $SESSION_NAME
fi

# 2. 新セッションの作成 (Geminiの陣地)
echo "🏯 Establishing Shogun HQ..."	mux new-session -d -s $SESSION_NAME -n "HQ"
# 左ペイン: Gemini (ID: 0.0)	mux select-pane -t $SESSION_NAME:0.0 -T "$GEMINI_TITLE"

# 3. 画面分割 (Claudeの陣地)
echo "⚔️  Summoning Claude Coder..."	mux split-window -h -t $SESSION_NAME:0.0
# 右ペイン: Claude (ID: 0.1)	mux select-pane -t $SESSION_NAME:0.1 -T "$CLAUDE_TITLE"

# 4. 環境変数とエイリアスの注入
# Gemini側 (左)	mux send-keys -t $SESSION_NAME:0.0 "export AGENT_ROLE=planner" C-m	mux send-keys -t $SESSION_NAME:0.0 "export PARTNER_ID=$SESSION_NAME:0.1" C-m	mux send-keys -t $SESSION_NAME:0.0 "alias notify='sh scripts/postman.sh $CLAUDE_TITLE'" C-m	mux send-keys -t $SESSION_NAME:0.0 "clear" C-m	mux send-keys -t $SESSION_NAME:0.0 "echo '🤖 Gemini Planner Ready.'" C-m	mux send-keys -t $SESSION_NAME:0.0 "echo 'Type 
notify "message"
 to send instructions to Claude.'" C-m

# Claude側 (右)	mux send-keys -t $SESSION_NAME:0.1 "export AGENT_ROLE=coder" C-m	mux send-keys -t $SESSION_NAME:0.1 "export PARTNER_ID=$SESSION_NAME:0.0" C-m	mux send-keys -t $SESSION_NAME:0.1 "alias report='sh scripts/postman.sh $GEMINI_TITLE'" C-m	mux send-keys -t $SESSION_NAME:0.1 "clear" C-m	mux send-keys -t $SESSION_NAME:0.1 "echo '👨‍💻 Claude Coder Summoned.'" C-m
# Claude を起動する準備 (ユーザーが Enter を押すだけで起動できるようにしておく)	mux send-keys -t $SESSION_NAME:0.1 "claude" 

# 5. セッションへの接続
echo "🚀 All systems go. Attaching to session..."
# もし既に tmux 内にいる場合は switch-client、そうでなければ attach
if [ -n "$TMUX" ]; then
  tmux switch-client -t $SESSION_NAME
else
  tmux attach-session -t $SESSION_NAME
fi
