# Task 03: GenericCliProvider と ConfigLoader の強化

`BaseCliProvider` のカバレッジ 98% 達成、素晴らしいです！
基盤が固まったので、次は「設定の読み込み」と「AIツールの動的プロバイダー」の信頼性を高めましょう。

## 目的
1. `src/providers/generic-cli.provider.ts` のカバレッジを 80% 以上にする。
2. `src/utils/configLoader.ts` のエラーハンドリングに関するテストを拡充し、堅牢性を高める。

## 指示

### 1. GenericCliProvider のテスト
- **ファイル**: `test/providers/generic-cli.provider.test.ts` を作成。
- **テスト項目**:
  - `ai-tools.json` の設定から正しくプロバイダーが生成されるか。
  - `defaultArgs` (デフォルト引数) が正しく反映されるか。
  - `--version` チェックなど、ツールの生存確認ロジックの検証。
  - プロンプトの構築、セッション管理（`sessionId`）のロジック。

### 2. ConfigLoader のテスト拡充
- **ファイル**: `test/configLoader.test.ts` (既存) を修正。
- **追加テスト項目**:
  - 不正な JSON 形式の読み込み。
  - スキーマ違反（必須フィールド `command` がない、`enabled` が文字列になっている等）の挙動。
  - 設定ファイルが存在しない場合のデフォルト挙動。
  - ファイルの読み取り権限がない場合のエラー処理。

## 完了条件
- `GenericCliProvider` のカバレッジが 80% を超えていること。
- `ConfigLoader` で異常系（エラーパターン）のテストが網羅されていること。
- 既存のテストが全てパスすること。

完了したら、レポートを作成して通知してください。
