# Agent Factory MCP

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://img.shields.io/badge/Open%20Source-❤️-red.svg)](https://github.com/utenadev/agent-factory-mcp)

</div>

> CLI ツールを自動発見して MCP ツールとして登録する汎用モデルコンテキストプロトコル（MCP）サーバー。任意の CLI ツール（Qwen、Ollama、Aider など）をペルソナ設定付きの AI エージェントに変換できます。

## 特徴

- **自動発見**: CLI の `--help` 出力を自動的に解析してツールメタデータを生成
- **ゼロコード登録**: 設定ファイルまたはコマンドライン引数でツールを登録
- **ペルソナサポート**: システムプロンプトを設定して専門化された AI エージェントを作成
- **マルチプロバイダー**: 複数の AI ツールを同時に使用（Qwen、Gemini、Aider など）
- **ランタイム登録**: MCP プロトコル経由で新しいツールを動的に追加

## アーキテクチャ

```mermaid
graph TB
    subgraph "MCP クライアント"
        A[Claude Desktop / Claude Code]
    end

    subgraph "Agent Factory MCP サーバー"
        B[サーバーエントリーポイント]
        C[設定ローダー]
        D[ツールレジストリ]
        E[動的ツールファクトリー]

        subgraph "プロバイダー"
            F[QwenProvider]
            G[GenericCliProvider]
        end

        subgraph "パーサー"
            H[HelpParser]
        end
    end

    subgraph "CLI ツール"
        I[qwen]
        J[gemini]
        K[aider]
        L[ollama]
        M[...任意の CLI ツール]
    end

    A -->|stdio| B
    B --> C
    B -->|CLI 引数| G
    C -->|設定読み込み| D
    G -->|作成| D
    D --> E
    E -->|生成| F
    F -->|実行| I
    F -->|実行| J
    F -->|実行| K
    G -->|--help 解析| H
    H -->|メタデータ| G
```

## 状態遷移

```mermaid
stateDiagram-v2
    [*] --> 初期化

    初期化 --> 設定読み込み: 起動
    初期化 --> CLI引数処理: CLI 引数あり

    設定読み込み --> CLI引数処理: 設定読み完了
    CLI引数処理 --> プロバイダー登録

    プロバイダー登録 --> プロバイダー作成: ツール利用可能
    プロバイダー登録 --> プロバイダースキップ: ツール未検出

    プロバイダー作成 --> ツール生成
    プロバイダースキップ --> プロバイダー登録: 次のツール

    ツール生成 --> ツール登録
    ツール登録 --> プロバイダー登録: 次のツール

    プロバイダー登録 --> サーバー稼働: すべてのツール処理完了
    サーバー稼働 --> [*]: MCP リクエスト待機中

    サーバー稼働 --> ランタイム登録: register_cli_tool 呼び出し
    ランタイム登録 --> サーバー稼働: ツール追加

    note right of 設定読み込み
        ai-tools.json または
        .qwencoderc.json を読み込み
    end note

    note right of CLI引数処理
        次のような CLI 引数を解析:
        npx agent-factory-mcp qwen gemini aider
    end note
```

## インストール

```bash
# npm 経由でインストール
npm install -g agent-factory-mcp

# または npx でインストールなしで使用
npx agent-factory-mcp

# または bun で使用
bunx agent-factory-mcp
```

## 設定

### 方法 1: コマンドライン引数

CLI 引数で直接ツールを登録：

```bash
npx agent-factory-mcp qwen gemini aider
```

### 方法 2: 設定ファイル

プロジェクトルートに `ai-tools.json` を作成：

```json
{
  "$schema": "./schema.json",
  "version": "1.0",
  "tools": [
    {
      "command": "qwen",
      "alias": "code-reviewer",
      "description": "セキュリティとパフォーマンスに焦点を当てたコードレビューエキスパート",
      "systemPrompt": "あなたはシニアコードレビュアーです。セキュリティ脆弱性、パフォーマンス問題、保守性に焦点を当ててください。"
    },
    {
      "command": "qwen",
      "alias": "doc-writer",
      "description": "技術ドキュメントスペシャリスト",
      "systemPrompt": "あなたは開発者向けに明確で簡潔な技術ドキュメントを書きます。"
    }
  ]
}
```

### 方法 3: ランタイム登録

`register_cli_tool` MCP ツールを使用：

```
register_cli_tool({
  command: "ollama",
  alias: "local-llm",
  description: "Ollama経由でローカルLLMモデルを実行",
  systemPrompt: "あなたはローカルで実行されている役立つAIアシスタントです。",
  persist: true
})
```

## MCP クライアント設定

### Claude Desktop

Claude Desktop 設定ファイルに追加：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agent-factory": {
      "command": "npx",
      "args": ["agent-factory-mcp", "qwen", "gemini", "aider"]
    }
  }
}
```

### Claude Code CLI

```bash
claude mcp add agent-factory -- npx agent-factory-mcp qwen gemini aider
```

## 使用例

### 専門化されたエージェントの使用

```bash
# セキュリティ重視のコードレビュー
"code-reviewerを使ってこのファイルのセキュリティ問題を分析してください"

# ドキュメント生成
"doc-writerにこのモジュールのAPIドキュメントを生成させます"

# 一般的なAI支援
"ask-qwenを使ってこのコードを説明してください"
```

### 複数のAIツール

```bash
# タスクに応じて異なるAIを使用
"gemini-visionを使ってこのスクリーンショットを分析してください"
"aiderを使ってこの関数をリファクタリングしてください"
"qwenを使って変更点をレビューしてください"
```

## 設定スキーマ

完全な設定スキーマは `schema.json` を参照してください：

| フィールド | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `command` | string | ✅ | 登録するCLIコマンド（例: "qwen", "ollama"） |
| `enabled` | boolean | ❌ | ツールが有効かどうか（デフォルト: true） |
| `alias` | string | ❌ | カスタムツール名（デフォルト: "ask-{command}"） |
| `description` | string | ❌ | カスタムツール説明 |
| `systemPrompt` | string | ❌ | AIペルソナ用のシステムプロンプト |
| `providerType` | string | ❌ | プロバイダータイプ: "cli-auto" または "custom" |
| `defaultArgs` | object | ❌ | デフォルト引数値 |

## 開発

```bash
# 依存関係をインストール
bun install

# ビルド
bun run build

# テスト実行
bun test

# 型チェック
bun run type-check

# リント
bun run lint

# フォーマット
bun run format
```

## プロジェクト構造

```
agent-factory-mcp/
├── src/
│   ├── index.ts              # サーバーエントリーポイント
│   ├── constants.ts          # 定数
│   ├── providers/            # プロバイダー実装
│   │   ├── base-cli.provider.ts
│   │   ├── generic-cli.provider.ts
│   │   └── qwen.provider.ts
│   ├── tools/                # ツールレジストリとファクトリー
│   │   ├── registry.ts
│   │   ├── dynamic-tool-factory.ts
│   │   └── simple-tools.ts
│   ├── parsers/              # CLIヘルプパーサー
│   │   └── help-parser.ts
│   ├── types/                # TypeScript型定義
│   │   └── cli-metadata.ts
│   └── utils/                # ユーティリティ
│       ├── configLoader.ts
│       ├── commandExecutor.ts
│       ├── logger.ts
│       └── progressManager.ts
├── test/                     # テストファイル
├── ai-tools.json.example     # 設定例
├── schema.json               # JSONスキーマ
└── Taskfile.yml              # タスクランナー設定
```

## コントリビューション

貢献大歓迎です！お気軽にプルリクエストを送信してください。

## ライセンス

MIT ライセンス - 詳細は [LICENSE](LICENSE) を参照してください。
