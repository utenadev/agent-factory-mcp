# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

QwenCode MCP Server は、Model Context Protocol (MCP) を使用して AI アシスタントが Qwen AI モデルと対話できるようにするサーバーです。

現在、このプロジェクトは**単一目的の Qwen ツールから、汎用の AI プロバイダーフレームワークへの移行**が進行中です（`docs/PLAN.md` および `docs/ROADMAP.md` を参照）。

## 開発コマンド

このプロジェクトは **Bun ランタイム**を使用します。タスクランナーとして **go-task** も利用可能です。

```bash
# go-task を使用（推奨）
task build       # ビルド
task dev         # 開発（ビルドして実行）
task start       # 実行（ビルド済み）
task test        # テスト実行
task lint        # リント
task format      # フォーマット
task check       # すべての品質チェック
task --list      # 利用可能なタスクを表示

# または bun コマンドを直接使用
bun run build    # ビルド
bun run dev      # 開発（ビルドして実行）
bun run start    # 実行（ビルド済み）
bun test         # テスト実行
bun run lint     # リント（Biome）
bun run format   # フォーマット（Biome）

# 単一のテストファイルを実行
bun test test/tools.test.js
bun test test/registry.test.js
```

## アーキテクチャ

### メタデータ駆動設計

プロジェクトの核となる概念は、CLI ツールの機能を**メタデータ**として記述し、そこから MCP ツールを動的に生成することです。

```
CliToolMetadata → DynamicToolFactory → MCP Tool
```

### コアコンポーネント

| コンポーネント | 役割 | ファイル |
|--------------|------|---------|
| `AIProvider` | 全プロバイダーの共通インターフェース | `src/providers/base-cli.provider.ts` |
| `BaseCliProvider` | CLI ベースプロバイダーの抽象基底クラス | `src/providers/base-cli.provider.ts` |
| `QwenProvider` | Qwen の具象実装 | `src/providers/qwen.provider.ts` |
| `CliToolMetadata` | CLI ツールの機能を記述する型 | `src/types/cli-metadata.ts` |
| `DynamicToolFactory` | メタデータから MCP ツールを生成 | `src/tools/dynamic-tool-factory.ts` |
| `toolRegistry` | 登録されたツールの一元管理 | `src/tools/registry.ts` |

### ツール登録の流れ

1. `src/tools/index.ts` でプロバイダーをインスタンス化
2. `registerProvider(new QwenProvider())` で登録
3. `DynamicToolFactory` がメタデータから Zod スキーマと実行ロジックを生成
4. MCP サーバーがツール定義をクライアントに公開

### 進行中のリファクタリング（Phase 1-3）

- **Phase 1**: 基盤となる型とクラス構造の確立（完了）
- **Phase 2**: 既存の Qwen ロジックを新しい構造に移行（完了）
- **Phase 3**: メインアプリケーションフローとの統合（完了）

### 将来のロードマップ（Phase 4+）

- **HelpParser**: CLI `--help` 出力からメタデータを自動生成
- **汎用プロバイダー**: OpenAI、Ollama、Anthropic などのサポート
- **設定ファイル駆動**: ユーザーがコードを変更せずにツールを追加可能に

## ファイル構成

```
src/
├── index.ts              # MCP サーバーのエントリーポイント
├── constants.ts          # 定数・型定義
├── types/
│   └── cli-metadata.ts   # CliToolMetadata、CliOption などの型
├── providers/
│   ├── base-cli.provider.ts  # AIProvider インターフェース、BaseCliProvider
│   └── qwen.provider.ts      # QwenProvider の実装
├── tools/
│   ├── index.ts              # ツール登録のエントリーポイント
│   ├── registry.ts           # toolRegistry、registerProvider
│   ├── dynamic-tool-factory.ts  # メタデータからツールを生成
│   ├── simple-tools.ts       # Ping、Help などの静的ツール
│   └── ask-qwen.tool.ts      # （非推奨）QwenProvider に置換済み
└── utils/
    ├── commandExecutor.ts    # CLI コマンド実行（10分タイムアウト）
    ├── logger.ts             # ログ出力（NO_COLOR 対応）
    └── progressManager.ts    # MCP 進行状況通知
```

## 新しいプロバイダーを追加する方法

新しい AI CLI ツールをサポートする場合:

1. `src/providers/` に新しいプロバイダークラスを作成
2. `BaseCliProvider` を継承
3. `getMetadata()` を実装してツールの機能を定義
4. `src/tools/index.ts` で `registerProvider(new NewProvider())` を呼び出す

例:

```typescript
// src/providers/openai.provider.ts
export class OpenAIProvider extends BaseCliProvider {
  id = 'openai';

  getMetadata(): CliToolMetadata {
    return {
      toolName: 'ask-openai',
      description: 'Execute OpenAI CLI',
      command: 'openai',
      argument: {
        name: 'prompt',
        description: 'The prompt to send',
        type: 'string',
        required: true
      },
      options: [
        {
          name: 'model',
          flag: '-m',
          type: 'string',
          description: 'Model to use',
          choices: ['gpt-4', 'gpt-3.5-turbo']
        }
      ]
    };
  }
}
```

## MCP 進行状況通知

長時間実行されるツール（Qwen 分析など）のために、進行状況通知をサポートしています:

- `ProgressManager.startUpdates()` - 進行状況更新の開始
- `ProgressManager.updateOutput()` - 出力の更新
- `ProgressManager.stopUpdates()` - 完了時のクリーンアップ

25 秒ごとにキープアライブ通知を送信し、MCP クライアントのタイムアウトを防ぎます。

## テスト

テストは **Bun テストランナー**を使用しています:

- `test/tools.test.js` - 静的ツール（Ping、Help）のテスト
- `test/registry.test.js` - レジストリ機能のテスト
- `test/autoDiscovery.test.js` - Auto-Discovery 機能のテスト

テストは `dist/` ディレクトリ内のコンパイル済みコードに対して実行されます。

## 重要な設計上の注意点

- **静的メタデータ**: 現在、`QwenProvider` は静的なメタデータを返します。将来的には `--help` 出力のパーサーに置き換えられる予定です
- **@ 構文**: Qwen のプロンプトにファイルを含める `@filename` 構文は、`QwenProvider.execute()` で引用符で囲むことによって処理されます
- **タイムアウト**: `executeCommand` のデフォルトタイムアウトは 10 分（600000ms）です
- **カラーサポート**: `Logger` は `NO_COLOR` 環境変数を尊重します
