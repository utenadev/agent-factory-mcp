# Claude Code へのセキュリティ実装指示

あなたは `agent-factory-mcp` プロジェクトのセキュリティ強化を担当するエンジニアです。
以下の指示と参照ドキュメントに従って、**Phase 1: 緊急セキュリティ対策** を実装してください。

## 1. 参照ドキュメント
まず、以下のファイルに記述された実装計画を熟読してください。
- `docs/PLAN_SECURITY_HARDENING.md` (詳細なタスク定義)

## 2. 実装タスク

`docs/PLAN_SECURITY_HARDENING.md` のタスクに加え、Gemini CLI との統合における以下の**追加必須要件**も実装してください。

### A. `autoDiscovery.ts` の脆弱性修正 (最優先)
- **現状**: `execSync` を使用して `which`/`where` コマンドを実行しており、コマンドインジェクションのリスクがある。
- **要件**: `execSync` を廃止し、`child_process.spawn` または `execFile` を使用して、シェルを経由しない安全な実行方法にリファクタリングしてください。

### B. `ArgumentValidator` の強化 (Gemini対応)
- **現状計画**: シェル特殊文字のブロックのみ。
- **追加要件**:
  - **`@` 構文の検証**: 引数が `@` で始まる場合（Gemini CLI のファイル添付機能）、その後のパスがディレクトリトラバーサル (`../`) を含んでいないか検証してください。
  - **セッションID検証**: `--resume` や `--session` に渡されるIDは、英数字と一部の記号（`-_`）のみを許可するようにしてください。

### C. `AuditLogger` のプライバシー保護
- **現状計画**: 引数をそのままログ出力。
- **追加要件**:
  - **マスキング**: 環境変数由来のAPIキーや、非常に長いプロンプト文字列（例: 1000文字以上）はログに出力せず、`[REDACTED]` または短縮形に置換してください。

### D. エラーハンドリング
- **要件**: `src/utils/errors.ts` を作成し、`SecurityError` クラスを定義・使用すること。

## 3. 作業手順

1. `src/utils/errors.ts`, `src/utils/argumentValidator.ts`, `src/utils/auditLogger.ts` を作成・実装。
2. `src/utils/commandExecutor.ts` を修正（バリデーションとログの組み込み）。
3. `src/utils/autoDiscovery.ts` をリファクタリング（`execSync` 廃止）。
4. `test/security/security.test.ts` を作成し、攻撃パターンと Gemini 特有のケース（`@../passwd` 等）をテスト。
5. 全テスト (`task check`) を実行し、既存機能への影響がないことを確認。

## 4. 完了条件
- すべてのセキュリティテストがパスする。
- `task test-unit` がパスする。
- `audit.log` に安全にログが記録される。
