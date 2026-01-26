# Claude Code への作業指示書 (Phase 0 & 1A)

`docs/PLAN_SECURITY_HARDENING_CLAUDE.md` で合意された計画に基づき、以下のタスクを実行してください。

## 優先順位
**Phase 0 (緊急)** を最優先で完了させ、その後に **Phase 1A** に着手してください。

---

## Phase 0: 緊急脆弱性修正 (`autoDiscovery.ts`)

`src/utils/autoDiscovery.ts` 内の `execSync` 使用箇所をすべて排除し、安全な `child_process.spawn` (または `commandExecutor` 経由) に置き換えてください。

**修正対象:**
1. `findExecutable` 関数: `which`/`where` コマンド実行部分。
2. `getToolVersion` 関数: `--version` 実行部分。
3. `checkToolCompatibility` 関数: `--help` 実行部分。

**要件:**
- シェル (`shell: true`) を使用せず、引数を配列として渡すこと。
- `execSync` を完全に削除すること。

---

## Phase 1A: セキュリティ基盤実装

以下の順序でセキュリティモジュールを実装・統合してください。

### 1. エラー定義 (`src/utils/errors.ts`)
- `SecurityError` クラスを定義してください。

### 2. 引数バリデーター (`src/utils/argumentValidator.ts`)
- **コンテキスト対応**: 引数の種類（コマンド、ファイルパス、プロンプト）に応じた検証ロジックを実装。
- **Gemini 要件の統合**:
  - `@` 構文のチェック（`../` パストラバーサルの禁止）。
  - セッションIDのフォーマット検証（英数字と `-_` のみ）。
- **共通要件**:
  - シェル特殊文字のブロック。
  - ディレクトリトラバーサルのブロック。

### 3. 監査ロガー (`src/utils/auditLogger.ts`)
- **PII 保護機能**:
  - APIキー（`--api-key=...` 等）の値を `***REDACTED***` に置換。
  - 1000文字を超える長いプロンプトは短縮して記録。
- **ログ出力**: `~/.agent-factory-mcp/audit.log` に JSON Lines 形式で出力。

### 4. 実行基盤への統合 (`src/utils/commandExecutor.ts`)
- `executeCommand` 内で以下のフローを実装:
  1. `AuditLogger.log` ("attempted")
  2. `ArgumentValidator.validate` (失敗時は "blocked" ログ + `SecurityError`)
  3. `spawn` 実行
  4. `AuditLogger.log` ("success" or "failed")

---

## 検証

1. **セキュリティテストの作成**: `test/security/security.test.ts`
   - インジェクション攻撃パターン（`; rm -rf` 等）
   - トラバーサル攻撃パターン（`../../etc/passwd` 等）
   - Gemini `@` 構文攻撃パターン（`@../passwd`）
   - 正常なユースケース（相対パス、マルチラインプロンプト）
   - 監査ログの生成とマスキング確認
2. **テスト実行**: `bun test test/security/security.test.ts` がパスすること。
3. **回帰テスト**: `task test-unit` がパスすること。
