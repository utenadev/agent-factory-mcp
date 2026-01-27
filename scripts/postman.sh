#!/bin/bash
# usage: ./scripts/postman.sh [相手の名前] [メッセージ] [ファイルパス]

TARGET_NAME=$1
MSG=$2
FILE=$3

# 名前からペインIDを逆引き
# 形式: "1:gemini-planner" -> "1"
PANE_ID=$(tmux list-panes -a -F "#P:#{pane_title}" | grep ":$TARGET_NAME" | cut -d: -f1)

if [ -z "$PANE_ID" ]; then
  echo "Agent '$TARGET_NAME' not found."
  exit 1
fi

# 郵便投函と通知
# 相手のペインにテキストを送り込み、Enterキー (C-m) を押下させる
tmux send-keys -t "$PANE_ID" "🔔 $MSG"
tmux send-keys -t "$PANE_ID" C-m

if [ -n "$FILE" ]; then
  tmux send-keys -t "$PANE_ID" "# 詳細: $FILE"
  tmux send-keys -t "$PANE_ID" C-m
fi
