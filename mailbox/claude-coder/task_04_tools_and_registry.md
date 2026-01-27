# Task 04: DynamicToolFactory と Registry のテスト実装

プロバイダーと設定の強化、お疲れ様です。エラーハンドリングが充実し、堅牢性が一段と高まりました。
次に、これらを統合して MCP ツールを動的に生成・管理する「ツール層」のテストを固めましょう。

## 目的
1. `src/tools/dynamic-tool-factory.ts` のカバレッジを 80% 以上にする。
2. `src/tools/registry.ts` のカバレッジを 80% 以上にする。

## 指示

### 1. DynamicToolFactory のテスト
- **ファイル**: `test/tools/dynamic-tool-factory.test.ts` を作成。
- **テスト項目**:
  - `CliToolMetadata` から正しい MCP ツール定義（UnifiedTool）が生成されるか。
  - `Zod` スキーマがメタデータのオプション（string, boolean, number, file）に合わせて正しく構築されるか。
  - `systemPrompt` がツールの説明（description）に正しく組み込まれるか。
  - 生成されたツールの `execute` 関数を呼んだ際、プロバイダーの `execute` が正しく呼び出されるか。

### 2. Registry のテスト
- **ファイル**: `test/tools/registry.test.ts` (既存があれば修正、なければ作成) を更新。
- **テスト項目**:
  - `registerProvider()` でプロバイダーが正しく追加・管理されるか。
  - `getTools()` で登録された全てのツールが取得できるか。
  - `getTool()` で名前から特定のツールを検索できるか。
  - プロンプトのリスト (`getPrompts()`) が正しく生成されるか。

## 完了条件
- `DynamicToolFactory` および `Registry` のカバレッジが 80% を超えていること。
- 統合的なツール登録・取得フローがテストされていること。
- 既存のテストが全てパスすること。

完了したら、レポートを作成して通知してください。
