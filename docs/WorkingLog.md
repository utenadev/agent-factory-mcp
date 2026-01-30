# Working Log

## 2026-01-31

### Kimi K2.5 開発能力評価：Phase 2 テスト強化

**実施日**: 2026-01-31  
**テストランナー**: Vitest (Bun対応、Node.js 18/20/22互換性あり)  
**実行コマンド**: `bun run test:unit --coverage`

#### 実施内容
ROADMAP.md Phase 2 の未完了項目に対してTDDスタイルで実装。

#### テスト実行結果（最終）
```
Test Files  14 passed (15) | 1 failed (setupWizard.test.ts - 既存の問題)
Tests       226 passed | 3 skipped
Duration    15.01s
```

**新規追加テスト**: 21テスト  
**全テスト数**: 226テスト（新規含む）

#### 追加: ast-grep 参考資料の保存 ✅
- ユーザー提供の ast-grep 資料 URL を保存
- ファイル: `docs/ast-grep-references.md`
- 内容: チートシート、実践例、パターン集のリンクと活用場面のメモ
- 用途: 将来の大規模リファクタリング時の参考

#### Task 1: Logger のテスト強化 ✅
**目的**: Logger のカバレッジ向上と動作検証

**実装したテスト**:
- 基本ログメソッド（info, warn, error, success）のテスト
- 複数引数のハンドリングテスト
- DEBUG環境変数によるdebug()メソッドの制御テスト
- toolInvocation() メソッドのテスト
- LOG_PREFIX の出力確認テスト

**成果物**: `test/utils/logger.test.ts` (11テスト、全パス)

**学び**:
- 実際のLOG_PREFIXはconstants.tsで定義された"[QWENCMP]"であることが判明
- テスト作成時は実装の詳細を確認することが重要

---

#### Task 2: カバレッジレポート自動化 ✅
**目的**: CI/CD でカバレッジレポートを自動生成

**実装内容**:
- `.github/workflows/ci.yml` にカバレッジステップを追加
- テスト実行時に `--coverage` フラグを追加
- Bunランタイムでのみカバレッジレポートをアーティファクトとして保存
- 30日間の保持期間を設定

**変更ファイル**: `.github/workflows/ci.yml`

**実装詳細**:
```yaml
- name: Run Unit Tests with Coverage
  run: ${{ matrix.test_cmd }} -- --coverage

- name: Upload coverage report
  if: ${{ matrix.runtime == 'bun' }}
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
    retention-days: 30
```

---

#### Task 3: ProgressManager のテスト追加 ✅
**目的**: MCP プログレス通知機能のテストカバレッジ向上

**実装したテスト**:
- sendNotification() の各種シナリオ（tokenあり/なし、数値token）
- updateOutput() の出力保存機能
- startUpdates() の初期化とprogress data返却
- stopUpdates() の完了通知とクリーンアップ
- メッセージローテーションの時間経過テスト

**成果物**: `test/utils/progressManager.test.ts` (10テスト、全パス)

**技術的課題と解決**:
- Vitestの`vi.advanceTimeBy`がBunでは使えない問題
- `vi.advanceTimersByTime`に置き換えて解決
- Fake timersを使用した非同期テストの制御

---

### 残タスク
- Task 4: Error Handler のテスト追加（グローバルエラーハンドリング）
- Task 5: セキュリティテストの拡充（ArgumentValidator, AuditLogger）

これらは追加開発としてPLAN.mdに記録済み。

---

## 2026-01-24

### QwenCode MCP Serverの作成とリポジトリ構造の変更
- gemini-mcp-toolを参考に、QwenCode用のMCPサーバーを作成
- アプリケーション名を「Qwen CLI」から「QwenCode」に変更
- ファイル名を「qwen-cli」から「qwen」に変更
- リポジトリ構造を変更し、qwen-mcp-toolサブディレクトリからルートディレクトリにファイルを移動
- README.mdとREADME.ja.mdを更新し、リポジトリ構造を反映
- package.jsonのパッケージ名を「qwen-mcp-tool」から「qwencode-mcp-server」に変更
- バイナリ名を「qwen-mcp」から「qwencode-mcp」に変更
- constants.tsのCLI定数をQWENCODEに変更
- qwenExecutor.tsのCLI実行エラーメッセージを「Qwen CLI」から「QwenCode」に変更
- index.tsのサーバー名を「qwen-cli-mcp」から「qwencode-mcp」に変更
- READMEファイルのセットアップコマンドを修正し、npmパッケージが存在しないことを考慮
- bunxコマンドの使用例をREADMEファイルに追加
- リポジトリをprivateからpublicに変更し、GitHubで公開可能に
- 変更内容をローカルコミットし、GitHubリポジトリにプッシュ

### コードレビューと改善（第2フェーズ）
以下のブランチで改善を実施し、mainブランチにマージ：

#### 1. fix/unify-naming-and-improvements
- README.md / README.ja.md 内のパッケージ名を統一（qwen-mcp-tool → qwencode-mcp-server）
- src/index.ts:256 のコードフォーマット修正（1行複数ステートメントを分割）
- src/tools/registry.ts:71 のコードフォーマット修正
- constants.ts の「Un-used」コメントを削除
- executeCommand にタイムアウト処理を追加（デフォルト10分）
- 定数の整合性修正（DEFAULTS.MODEL を "qwen-max" に変更）
- 基本テストスイートを追加（14個のテスト、すべて通過）
- .gitignore を追加

#### 2. fix/additional-code-improvements
- src/index.ts:44 の変数宣言を分割
- 未使用の sendNotification 関数を削除
- ProgressNotificationParams インターフェースを追加
- as any を型ガードに置き換え
- logger.ts に NO_COLOR / TERM=dumb サポートを追加

#### 3. refactor/easy-refactor
- 進捗管理機能を src/utils/progressManager.ts に分離
- index.ts を 270行 → 140行に簡素化（-48%）
- ProgressManager オブジェクトで機能を整理

#### 4. docs/fix-documentation-issues
- JSON 構文エラーを修正（余分な閉じ括弧を削除）
- リポジトリ構造を更新（.gitignore、test/、progressManager.ts を追加、scripts/ を削除）
- バッジURLを修正（qwen-mcp-tool → qwencode-mcp-server）
- スラッシュコマンドの記述を修正（/qwen を削除、ask-qwen ツールを明確化）
- 前提条件を明確化（QwenCode → Qwen CLI アクセス）

### 成果
- テストカバレッジ: ⭐ → ⭐⭐⭐（14個のテストを追加）
- コード品質: ⭐⭐⭐ → ⭐⭐⭐⭐
- ドキュメント品質: ⭐⭐ → ⭐⭐⭐⭐
- 総合評価: ⭐⭐⭐☆☆ → ⭐⭐⭐⭐☆

### コミット一覧
- 5f9d0a3 refactor: unify package naming and improve code quality
- 7ba3931 refactor: additional code quality improvements
- 319bf12 refactor: extract progress management to separate module
- d77bd29 docs: fix documentation issues

---

## 2026-01-24 (後半)

### 汎用プロバイダーフレームワークの実装（ROADMAP Phase 1-4）

#### Phase 1: Help Parser 実装
- `src/parsers/help-parser.ts` を作成
- CLI の `--help` 出力を解析して構造化メタデータを生成
- GNU スタイル、commander.js スタイルのヘルプ出力に対応
- 型推論（boolean, string, number, file）を実装
- `test/help-parser.test.js` に12個のテストを作成（すべてパス）

#### Phase 2: 設定ファイル駆動のツール登録
- `src/providers/generic-cli.provider.ts` を作成
- `src/utils/configLoader.ts` を作成（Zod バリデーション付き）
- `ai-tools.json` 設定ファイルを読み込んでツールを自動登録
- `schema.json` と `ai-tools.json.example` を作成
- `test/configLoader.test.js` に8個のテストを作成（すべてパス）

#### Phase 3: 高度なパースとサブコマンド対応
- `CliToolMetadata` に `toolType` と `subcommands` を追加
- `HelpParser` にサブコマンド検出・パース機能を実装
- `test/subcommands.test.js` に6個のテストを作成（すべてパス）

#### Phase 4: ランタイム管理
- `register_cli_tool` システムツールを実装
- `ConfigLoader` に `save()` と `addTool()` メソッドを追加
- MCP プロトコル経由で動的にツールを登録可能に

### 機能拡張

#### systemPrompt サポート
- `ToolConfig` に `systemPrompt` フィールドを追加
- `CliToolMetadata` に `systemPrompt` フィールドを追加
- AI エージェントのペルソナ設定が可能に
- `DynamicToolFactory` で systemPrompt をツール説明に組み込み

#### CLI 引数によるツール登録
- `src/index.ts` にコマンドライン引数のパース処理を追加
- `npx agent-factory-mcp qwen gemini aider` のように直接ツールを指定可能に
- `GenericCliProvider.isCommandAvailable` の改善（which + --version フォールバック）

#### カテゴリの汎用化
- `category` 型を 