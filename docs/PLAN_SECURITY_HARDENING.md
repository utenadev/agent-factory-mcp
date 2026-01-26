# セキュリティ強化計画 (Phase 1)

このドキュメントは、戦略的ロードマップで定義された **「Phase 1: 緊急セキュリティ対策」** を実行するための、Claude Code 向けの実装ガイドです。

## 目的
`agent-factory-mcp` における任意コード実行およびコマンドインジェクションの脆弱性を排除します。厳格な引数バリデーションと監査ログ（オーディットログ）を実装します。

## タスク

### 1. `SecurityError` の定義
エラーハンドリングの一貫性を保つため、カスタムエラークラスを定義します。

- **ファイル名**: `src/utils/errors.ts` (新規作成)
- **要件**:
  - `Error` クラスを継承した `SecurityError` クラスをエクスポートする。
  - エラー名（`name`）は `"SecurityError"` とする。

### 2. `ArgumentValidator` の実装
実行前に CLI 引数を検証し、危険なパターンをブロックするユーティリティを作成します。

- **ファイル名**: `src/utils/argumentValidator.ts` (新規作成)
- **依存**: `src/utils/errors.ts`
- **要件**:
  - シェル特殊文字の検出とブロック: `;`, `|`, `&`, `$`, `` ` ``, `(`, `)`, `{`, `}`, `<`, `>`, `\`, `\n`。
  - ディレクトリトラバーサルパターンの検出とブロック: `../`, `..\\`。
  - `validate(args: string[]): void` メソッドを提供し、違反がある場合は `SecurityError` をスローする。
  - ホワイトリストベースの安全な文字列のみを許可する検討（オプション）。

### 2. `AuditLogger` の実装
すべてのコマンド実行を記録する監査ログユーティリティを作成します。

- **ファイル名**: `src/utils/auditLogger.ts` (新規作成)
- **要件**:
  - ログ保存先: `~/.agent-factory-mcp/audit.log` (`os.homedir()` を使用)。
  - フォーマット: JSON Lines 形式（1行に1つのJSONオブジェクト）。
  - 記録項目:
    - `timestamp`: ISO形式の時刻
    - `command`: 実行されたベースコマンド (例: "qwen")
    - `args`: 引数の配列
    - `cwd`: 実行時のカレントディレクトリ
    - `user`: OSのユーザー名
    - `status`: "attempted"（試行） | "success"（成功） | "blocked"（ブロック済） | "failed"（失敗）
  - ログ保存先ディレクトリが存在しない場合は自動作成する。
  - ファイル書き込みエラーが発生しても、アプリケーションをクラッシュさせない。

### 3. `CommandExecutor` への統合
既存のエグゼキューターを変更し、バリデータとロガーを使用するようにします。

- **ファイル名**: `src/utils/commandExecutor.ts`
- **変更内容**:
  - `ArgumentValidator` と `AuditLogger` をインポート。
  - `executeCommand` 関数内での処理フロー:
    1. **試行の記録**: `AuditLogger.log` を status "attempted" で呼び出す。
    2. **検証**: `ArgumentValidator.validate` を呼び出す。失敗した場合は：
       - status "blocked" でログを記録。
       - `SecurityError` をスローする。
    3. **実行**: 既存の spawn ロジックを続行。
    4. **結果の記録**: プロセスの終了コードに基づき、status "success" または "failed" でログを記録。

### 4. セキュリティテストの実装
セキュリティ対策が機能しているかを確認するための新しいテストスイートを作成します。

- **ファイル名**: `test/security/security.test.ts` (ディレクトリ `test/security` を新規作成)
- **テストケース**:
  - **インジェクション防止**:
    - `; rm -rf /` のような引数を渡してブロックされるか。
    - `| ls` や `$(whoami)` などのパターンがブロックされるか。
    - 適切な `SecurityError` がスローされるか。
  - **トラバーサル防止**:
    - `../../etc/passwd` などのパス指定がブロックされるか。
  - **監査ログの確認**:
    - 有効なコマンドを実行した際、ログが生成されるか。
    - ブロックされた実行がログに "blocked" として記録されるか。

## Claude Code への実行ステップ

1.  `src/utils/errors.ts` を作成し、`SecurityError` を定義。
2.  `src/utils/argumentValidator.ts` を作成。
3.  `src/utils/auditLogger.ts` を作成。
4.  `src/utils/commandExecutor.ts` をリファクタリングして統合。
5.  `test/security/security.test.ts` を作成し、テストケースを追加。
6.  `bun test test/security/security.test.ts` を実行して、セキュリティ保護を確認。

## 合格基準
- すべてのセキュリティテストがパスすること。
- 既存の正常なツール実行（`task test-unit`）が壊れていないこと。
- 実行後、ユーザーホームディレクトリに `audit.log` が正しく生成されていること。