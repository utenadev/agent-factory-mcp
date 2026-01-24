# QwenCode MCP ツール

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://img.shields.io/badge/Open%20Source-❤️-red.svg)](https://github.com/qwen-team/qwen-mcp-tool)

</div>

> QwenCode と対話するためのモデルコンテキストプロトコル（MCP）サーバー。AIが `@` 構文を使用して大規模なファイルやコードベースを直接分析できるように、Qwen の強力な機能を活用できます。

- 他の AI アシスタント経由で Qwen に自然言語で質問
- AI ワークフロー内で Qwen の強力な分析機能を直接利用

**注**: このプロジェクトは [jamubc/gemini-mcp-tool](https://github.com/jamubc/gemini-mcp-tool) に触発され、Qwen との統合用に調整されています。

## リポジトリ構造

```
qwencode-mcp-server/
├── LICENSE
├── package.json
├── README.ja.md
├── README.md
├── scripts
├── src
│   ├── constants.ts
│   ├── index.ts
│   ├── tools
│   └── utils
└── tsconfig.json
```

## 前提条件

このツールを使用する前に、以下のものがインストールされていることを確認してください：

1. **[Node.js](https://nodejs.org/)** (v16.0.0 以上)
2. **[QwenCode](https://github.com/QwenLM/Qwen)** がインストールされ、設定されていること


### インストール

このツールを使用するには、まずインストールする必要があります。これはまだnpmパッケージとして公開されていないため、GitHubから直接インストールできます：

```bash
npm install -g github:utenadev/qwencode-mcp-server
```

または、インストールせずにnpxで直接使用することもできます：

```bash
npx github:utenadev/qwencode-mcp-server
```

または、bunxを使用（Bunがインストールされている場合）：

```bash
bunx github:utenadev/qwencode-mcp-server
```

### 1行でのセットアップ

インストール後、ClaudeにMCPサーバーを登録します：

```bash
claude mcp add qwen -- npx github:utenadev/qwencode-mcp-server
```

または、bunxを使用：

```bash
claude mcp add qwen -- bunx github:utenadev/qwencode-mcp-server
```

### インストールの確認

Claude Code 内で `/mcp` と入力し、qwen MCP が有効になっていることを確認します。

---

### 代替方法：Claude Desktop からのインポート

Claude Desktop ですでに設定済みの場合：

1. Claude Desktop 設定ファイルに追加：
```json
"qwen": {
  "command": "npx",
  "args": ["github:utenadev/qwencode-mcp-server"]
}
```

または、bunxを使用：
```json
"qwen": {
  "command": "bunx",
  "args": ["github:utenadev/qwencode-mcp-server"]
}
```

2. Claude Code にインポート：
```bash
claude mcp add-from-claude-desktop
```

## 設定

MCP クライアントに MCP サーバーを登録します：

### NPX 使用の場合（推奨）

Claude Desktop 設定ファイルに以下を追加：

```json
{
  "mcpServers": {
    "qwen": {
      "command": "npx",
      "args": ["-y", "qwencode-mcp-server"]
    }
  }
}
```

### グローバルインストールの場合

グローバルにインストールした場合は、代わりにこちらの設定を使用：

```json
{
  "mcpServers": {
    "qwen": {
      "command": "npx",
      "args": ["github:utenadev/qwencode-mcp-server"]
    }
  }
}
}

または、bunxを使用する場合：

```json
{
  "mcpServers": {
    "qwen": {
      "command": "bunx",
      "args": ["github:utenadev/qwencode-mcp-server"]
    }
  }
}
}
```

**設定ファイルの場所:**

- **Claude Desktop**:
  - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
  - **Linux**: `~/.config/claude/claude_desktop_config.json`

設定を更新後、ターミナルセッションを再起動してください。

## 例ワークフロー

- **自然言語**: "index.html を説明するために qwen を使用", "巨大なプロジェクトを qwen を使って理解する", "最新ニュースを探すために qwen に依頼"
- **Claude Code**: `/qwen` と入力すると、コマンドが Claude Code のインターフェースに表示されます。

## 使用例

### ファイル参照付き（@ 構文使用）

- `@src/main.js を分析して何をするか説明するために qwen を使用`
- `現在のディレクトリを要約するために qwen を使用 @.`
- `依存関係について @package.json を分析`

### 一般的な質問（ファイルなし）

- `最新のテックニュースを探すために qwen に依頼`
- `div のセンタリングを説明するために qwen を使用`
- `@file_im_confused_about に関する React 開発のベストプラクティスについて qwen に質問`

### ツール（AI 向け）

これらのツールは AI アシスタントが使用するように設計されています。

- **`ask-qwen`**: Qwen AI に視点を求める。一般的な質問やファイルの複雑な分析に使用可能。
  - **`prompt`** （必須）: 分析リクエスト。`@` 構文を使用してファイルまたはディレクトリ参照を含めることができます（例: `@src/main.js これを説明`）または一般的な質問（例: `最新ニュースを検索してください`）。
  - **`model`** （オプション）: 使用する Qwen モデル。デフォルトは `qwen-max`。

- **`Ping`**: 簡単なテストツールでメッセージをエコーします。
- **`Help`**: QwenCode ヘルプテキストを表示します。

### スラッシュコマンド（ユーザー向け）

これらのコマンドは Claude Code のインターフェースで直接使用できます（他のクライアントとの互換性はテストされていません）。

- **/analyze**: ファイルやディレクトリを Qwen で分析するか、一般的な質問に回答。
  - **`prompt`** （必須）: 分析プロンプト。`@` 構文を使用してファイルを含めます（例: `/analyze prompt:@src/ このディレクトリを要約`）または一般的な質問（例: `/analyze prompt:最新ニュースを検索してください`）。
- **/help**: QwenCode ヘルプ情報を表示。
- **/ping**: サーバーへの接続をテスト。
  - **`message`** （オプション）: エコーするメッセージ。

## 貢献

貢献は大歓迎です！プルリクエストを自由に送信してください。

## ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています。詳細については [LICENSE](LICENSE) ファイルを参照してください。

**免責事項:** これは非公式のサードパーティーツールであり、Alibaba Cloud または Qwen チームによって提携、承認、スポンサーされたものではありません。