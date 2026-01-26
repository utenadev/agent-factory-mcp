# Gemini-CLI へのレビュー依頼

以下の2つのセキュリティ強化計画ドキュメントをレビューしてください。特に Gemini CLI の観点からの意見をお願いします。

---

## 1. 元のセキュリティ強化計画

```text
# セキュリティ強化計画 (Phase 1)

このドキュメントは、戦略的ロードマップで定義された **「Phase 1: 緊急セキュリティ対策」** を実行するための実装ガイドです。

## 目的
`agent-factory-mcp` における任意コード実行およびコマンドインジェクションの脆弱性を排除します。厳格な引数バリデーションと監査ログ（オーディットログ）を実装します。

## タスク

### 1. `SecurityError` の定義
- **ファイル**: `src/utils/errors.ts` (新規)
- **要件**: `Error` クラスを継承した `SecurityError` クラス

### 2. `ArgumentValidator` の実装
- **ファイル**: `src/utils/argumentValidator.ts` (新規)
- **要件**:
  - シェル特殊文字の検出とブロック: `;`, `|`, `&`, `$`, `` ` ``, `(`, `)`, `{`, `}`, `<`, `>`, `\\n`
  - ディレクトリトラバーサルの検出: `../`, `..\\`
  - `validate(args: string[]): void` メソッド

### 3. `AuditLogger` の実装
- **ファイル**: `src/utils/auditLogger.ts` (新規)
- **要件**:
  - ログ保存先: `~/.agent-factory-mcp/audit.log`
  - フォーマット: JSON Lines
  - 記録項目: timestamp, command, args, cwd, user, status

### 4. `CommandExecutor` への統合
- **ファイル**: `src/utils/commandExecutor.ts`
- **変更内容**:
  1. 試行の記録 ("attempted")
  2. 検証（失敗時は "blocked" + SecurityError）
  3. 実行
  4. 結果の記録 ("success" または "failed")

### 5. セキュリティテストの実装
- **ファイル**: `test/security/security.test.ts`
- **テストケース**: インジェクション防止、トラバーサル防止、監査ログの確認
```

---

## 2. Claude のレビューと追加提案

```text
## Claude のレビューと提案

### 現状分析
- ✅ `commandExecutor.ts` は既に `spawn` を使用（安全）
- ✅ `AI_TOOL_WHITELIST` が既に存在（claude, opencode, gemini）
- ✅ Gemini は既にサポート済み（--resume フラグ処理あり）

### 🔴 緊急の脆弱性発見
`autoDiscovery.ts` で `execSync` が使用されており、コマンドインジェクションのリスク：
```typescript
const result = execSync(`${checkCommand} "${command}" ...`)
```

### 改善提案

#### 1. コンテキスト対応バリデーション
一律ブロックではなく、引数の種類に応じたバリデーション：
- ファイルパス: `../` を許可
- プロンプト: 改行を許可
- コマンド: 厳格な検証

#### 2. 許可リスト（Allowlist）方式
ブロックリストではなく、許可する文字/パターンを明示的に定義

#### 3. 多層防御
| レイヤー | 保護内容 |
|---------|---------|
| L1 | 実行許可するCLI（allowedCommands） |
| L2 | 危険なオプション排除（dangerousFlags） |
| L3 | 引数値のバリデーション |

#### 4. 監査ログの運用
- PII保護（機密情報のマスキング）
- ログローテーション（10MB制限等）

#### 5. Gemini 固有の考慮事項
| 項目 | 考慮事項 |
|-----|---------|
| `--resume` | セッションIDのフォーマット検証 |
| `--model` | 許可するモデルのホワイトリスト |
| `@` ファイル構文 | パストラバーサル対策 |
```

---

## Gemini-CLI への質問

1. **Gemini CLI の観点**から、上記のセキュリティ計画に追加すべき事項はありますか？

2. Gemini CLI の以下の機能について、セキュリティ上の懸念はありますか？
   - `--resume` セッションID のフォーマット
   - `--model` オプションで指定可能なモデル
   - `@filename` によるファイル添付機能

3. `autoDiscovery.ts` の `execSync` 問題について、Gemini CLI が自動検出される場合、どのような影響がありますか？

4. その他、Gemini CLI を MCP サーバーに統合する上でのセキュリティのベストプラクティスがあれば教えてください。
