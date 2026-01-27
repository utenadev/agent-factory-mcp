#!/bin/bash

# Agent Factory MCP - 開発環境セットアップスクリプト (PCP Protocol 対応)
# このスクリプトは tmux セッションを作成し、Gemini と Claude の連携準備を整えます。

SESSION_NAME="agent-factory-mcp"

# セッションが既に存在するか確認
tmux has-session -t $SESSION_NAME 2>/dev/null

if [ $? != 0 ]; then
  echo "Setting up new tmux session: $SESSION_NAME"

  # 1. セッション作成 (最初のウィンドウを gemini-planner に)
  tmux new-session -d -s $SESSION_NAME -n "gemini-planner"
  tmux select-pane -T "gemini-planner"

  # 2. 2つ目のウィンドウを作成 (claude-coder)
  tmux new-window -t $SESSION_NAME:2 -n "claude-coder"
  tmux select-pane -t $SESSION_NAME:2 -T "claude-coder"

  # 3. 3つ目のウィンドウを作成 (PCP Protocol Documentation)
  tmux new-window -t $SESSION_NAME:3 -n "pcp-protocol"
  tmux send-keys -t $SESSION_NAME:3 "cat docs/PCP_PROTOCOL.md" C-m

  # 各ウィンドウの初期ディレクトリとメッセージ設定
  tmux send-keys -t $SESSION_NAME:1 "export AGENT_NAME=gemini-planner" C-m
  tmux send-keys -t $SESSION_NAME:1 "echo 'Welcome, Gemini-Planner. Ready for orchestration.'" C-m

  tmux send-keys -t $SESSION_NAME:2 "export AGENT_NAME=claude-coder" C-m
  tmux send-keys -t $SESSION_NAME:2 "echo 'Welcome, Claude-Coder. Awaiting instructions via mailbox/claude-coder/'" C-m

  # 最初のウィンドウを選択
  tmux select-window -t $SESSION_NAME:1
else
  echo "Session $SESSION_NAME already exists."
fi

# セッションにアタッチ
tmux attach-session -t $SESSION_NAME
