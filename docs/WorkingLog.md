# Working Log

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
- `category` 型を "qwen" から "ai" に変更
- 複数の AI プロバイダーを統一的に扱えるように

### リポジトリ名の変更とリネーム

#### qwencode-mcp-server → agent-factory-mcp
- `package.json` の name を `agent-factory-mcp` に変更
- bin 名を `agent-factory-mcp` に変更
- keywords を更新（mcp, cli, ai, agent, auto-discovery 等）
- author を `utenadev` に変更
- `src/index.ts` のサーバー名を `agent-factory-mcp` に変更
- GitHub に新しいリポジトリ `agent-factory-mcp` を作成してプッシュ
- origin リモートを `agent-factory-mcp` に切り替え

### README の刷新

#### README.md / README.ja.md の完全書き直し
- gemini-mcp-server 由来の内容を破棄して完全刷新
- agent-factory-mcp の機能に合わせた内容に
- Mermaid ダイアグラムを追加
  - アーキテクチャ図（コンポーネント関係）
  - 状態遷移図（初期化フロー）
- 3つの登録方法を明記
  - CLI 引数
  - 設定ファイル
  - ランタイム登録
- 使用例と設定スキーマ表を追加
- プロジェクト構造を更新

### ドキュメントの刷新

#### docs/index.md の更新
- agent-factory-mcp ブランディングに反映
- 完了した機能を明記
- ドキュメント構造を整理

#### docs/ROADMAP.md の更新
- すべてのフェーズを完了マーク（✅）に更新
- 実装サマリー表を追加
- 完了後の拡張機能（CLI 引数、systemPrompt、リポジトリ名変更）を追加
- 今後の拡張アイデアを追加

#### docs/ARCHITECTURE.md の新規作成
- システムアーキテクチャの詳細な説明
- Mermaid ダイアグラム
  - システム全体のコンポーネント図
  - ツール登録フローのシーケンス図
  - ツール実行フローのシーケンス図
- 各レイヤーの詳細説明
  - Server Layer
  - Provider Layer
  - Parser Layer
  - Tool Generation Layer
  - Configuration Layer
  - Execution Layer
- データフローの説明
- 設定モードの解説
- 型システムのドキュメント
- 拡張ポイントの説明
- エラーハンドリング
- セキュリティ考慮事項
- パフォーマンスの考慮事項

#### docs/API.md の新規作成
- MCP ツールの完全なリファレンス
  - `register_cli_tool`
  - `Ping`
  - `Help`
  - AI プロバイダーツールの構造
- 設定 API
  - `ai-tools.json` スキーマ
  - 設定例（基本、複数 AI ツール、高度な設定）
  - 設定ファイルの読み込み優先順位
- コマンドライン API
- 拡張ポイント
  - カスタムプロバイダーの作成方法
  - カスタムパーサーの作成方法
  - ツールミドルウェア
- TypeScript API
  - コアインターフェース
  - 登録 API
  - ツールレジストリ API
  - Config Loader API
- エラーハンドリング
- プログレス報告
- テスト API
- ベストプラクティス

### 成果
- **テストカバレッジ**: 40個のテストすべてパス
- **機能完成度**: ROADMAP のすべてのフェーズが完了 ✅
- **ドキュメント品質**: ⭐⭐⭐⭐ → ⭐⭐⭐⭐⭐
- **汎用性**: Qwen 専用 → 任意の CLI ツールに対応
- **総合評価**: ⭐⭐⭐⭐☆ → ⭐⭐⭐⭐⭐

### コミット一覧
- 8bdcc78 refactor: Migrate to Bun runtime and adopt Biome + go-task
- 46a8b5e feat: Implement CLI Help Parser for auto-discovery (ROADMAP Phase 1)
- 6c782fd feat: Add configuration-driven tool registration (ROADMAP Phase 2)
- 17ec148 feat: Add runtime tool registration (ROADMAP Phase 4)
- 4f5cf80 feat: Add systemPrompt support and CLI argument tool registration
- 1d7f807 docs: Rename to agent-factory-mcp and refresh README
- bf3441b docs: Complete documentation refresh for agent-factory-mcp

---

## 2026-01-24 (深夜)

### Auto-Discovery機能の検証と改善

#### 1. ホワイトリストの更新
- `src/utils/autoDiscovery.ts` の `AI_TOOL_WHITELIST` をプロジェクトの要件に合わせて更新
- 対象ツール: `qwen`, `aider`, `gemini`, `opencode`, `crush`, `vibe`

#### 2. テストの修正とBun対応
- `test/autoDiscovery.test.ts` を Bun test スタイルにリファクタリング
- モックの実装を修正し、新しいホワイトリストに基づいてテストが通過することを確認

#### 3. 実環境での検証
- 手動検証用スクリプト `run-discovery.ts` を作成し、実際の PATH 環境下での動作を確認
- 以下のツールが正常に検出されることを確認:
  - opencode
  - gemini
  - qwen
  - aider
  - vibe

**検証に使用したスクリプト (run-discovery.ts):**
```typescript
import { discoverCompatibleTools } from "./src/utils/autoDiscovery.js";
import { Logger } from "./src/utils/logger.js";

async function runDiscovery() {
  console.log("Starting Auto-Discovery...");
  console.log("Searching for: qwen, aider, gemini, opencode, crush, vibe\n");

  const tools = await discoverCompatibleTools();

  if (tools.length === 0) {
    console.log("No compatible tools found in your PATH.");
  } else {
    console.log(`Found ${tools.length} compatible tool(s):`);
    tools.forEach(tool => {
      console.log(`- ${tool.toolName} (command: ${tool.command})`);
      console.log(`  Description: ${tool.description}`);
      if (tool.options.length > 0) {
        console.log(`  Options: ${tool.options.length} detected`);
      }
      console.log("");
    });
  }
}

runDiscovery().catch(err => {
  console.error("Discovery failed:", err);
});
```

---

## 2026-01-25 (早朝)

### Auto-Discovery機能の最適化と完成

#### 1. ホワイトリスト方式への変更
- パフォーマンスと安全性を考慮し、Auto-Discoveryのロジックを全ファイルスキャンからホワイトリストベース（`AI_TOOL_WHITELIST`）の検索に変更
- `src/utils/autoDiscovery.ts` を大幅にリファクタリング
- `findExecutable` 関数を実装し、`which` / `where` コマンドで効率的にツールを探索
- ホワイトリストを `opencode`, `gemini` に設定（実環境での動作確認済み）

#### 2. バージョン追跡機能の実装
- CLI ツールのバージョン番号を自動検出し、設定ファイルに保存する機能を追加
- `CliToolMetadata` と `ToolConfig` に `version` フィールドを追加
- `getToolVersion` 関数を実装し、`--version` や `-v` フラグからバージョン番号を抽出
- 数字のみのバージョン番号（例：Gemini CLI の `0.25.2`）にも対応する強力な正規表現を実装
- 重いCLIツール（Gemini等）のためにタイムアウトを延長

#### 3. バグ修正と環境整備
- 初期化時に Auto-Discovery が成功しても設定がリロードされないバグを修正（`src/index.ts`）
- `tsconfig.json` のモジュール設定を `NodeNext` に戻し、Bun/ESM 環境でのビルドを正常化
- `ai-tools.json` を `.gitignore` に追加

#### 4. ドキュメントの整備
- `README.md` と `README.ja.md` に Auto-Discovery の実行条件（設定ファイルがない場合のみ）と再実行方法を明記
- 日本語ドキュメント (`README.ja.md`) を最新の英語ドキュメントと同期

### 成果
- **安全性向上**: 未知の実行ファイルへのアクセスを排除
- **パフォーマンス向上**: 全スキャン方式（数分）からホワイトリスト検索（数秒）へ劇的に改善
- **UX向上**: バージョン情報の自動記録により、環境の再現性が向上

### コミット一覧
- c69705a refactor: optimize auto-discovery logic to use whitelist-first lookup
- adebcf8 fix: ensure config is reloaded after auto-discovery in initialization
- 6c81bf1 feat: enhance auto-discovery with whitelist support and documentation
- c45afb3 feat: add tool version tracking to auto-discovery and configuration
- b66865c docs: update README.md and sync README.ja.md
