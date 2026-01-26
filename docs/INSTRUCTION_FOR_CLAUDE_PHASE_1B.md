# Claude Code への作業指示書 (Phase 1B & Quality Improvement)

Phase 0 および Phase 1A の完了を受け、次のステップとして **Phase 1B: プロバイダー強化** および **品質向上タスク** を実行してください。

## 目的
汎用的なセキュリティ対策に加え、各 AI プロバイダー（CLIツール）ごとの固有のバリデーションを強化し、併せてテストカバレッジの不足を解消します。

---

## Task 1: プロバイダー固有バリデーションの強化 (`src/providers/generic-cli.provider.ts`)

`GenericCliProvider` クラスを拡張し、設定ファイル (`ToolConfig`) に基づいた厳格なバリデーションを追加してください。

### 要件
1. **Allowed Models 検証**:
   - `ToolConfig` に `allowedModels?: string[]` フィールドを追加。
   - `execute` メソッド内で、`model` 引数が指定されている場合、`allowedModels` に含まれているかチェック。
   - 含まれていない場合は `SecurityError` をスロー。
   - `allowedModels` が未定義の場合は、従来の簡易チェック（特殊文字禁止のみ）を適用。

2. **危険なフラグのブロック**:
   - `ToolConfig` に `blockedFlags?: string[]` フィールドを追加（デフォルト値あり: `--exec`, `--eval` 等）。
   - 引数展開時に、これらのフラグが含まれていないかチェック。

---

## Task 2: 設定テンプレートと初期化コマンド (`src/utils/configLoader.ts`, `src/index.ts`)

安全なデフォルト設定を簡単に生成できるようにします。

### 要件
1. **テンプレート作成**:
   - プロジェクトルートに `ai-tools.json.template` を作成。
   - 安全なデフォルト設定（`allowedModels` の例を含む）を記述。

2. **初期化コマンド (`init`)**:
   - `agent-factory-mcp init` コマンドを実装。
   - テンプレートをコピーして `ai-tools.json` を生成する（既存の場合はエラーまたは上書き確認）。

---

## Task 3: テストカバレッジの向上 (ROADMAP準拠)

テストレポートで指摘されたカバレッジ不足（特に `BaseCliProvider` が 0%）を解消します。

### 要件
1. **`BaseCliProvider` のユニットテスト**:
   - ファイル: `test/providers/base-cli.test.ts` (新規)
   - `BaseCliProvider` を継承したモッククラスを作成。
   - `execute` メソッドの正常系・異常系（タイムアウト、SecurityError）をテスト。
   - `spawn` の呼び出し引数が正しいか検証。

2. **`ConfigLoader` の異常系テスト**:
   - ファイル: `test/configLoader.test.js` (追記)
   - 不正なJSON、必須フィールド欠損、権限エラーなどのケースを追加。

---

## 検証手順

1. `task check` を実行し、既存テストとリントがパスすること。
2. 新規テスト `test/providers/base-cli.test.ts` がパスすること。
3. `init` コマンドで設定ファイルが生成されること。
4. `ai-tools.json` に `allowedModels` を設定し、許可外のモデルを指定して実行エラーになることを確認（`test/security/provider-security.test.ts` を作成しても良い）。
