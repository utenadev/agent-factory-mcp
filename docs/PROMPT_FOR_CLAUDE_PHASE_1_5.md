# Claude Code への作業指示 (Phase 1.5: Node.js 互換性と Vitest 移行)

あなたは `agent-factory-mcp` プロジェクトのエンジニアです。
以下の指示と参照ドキュメントに従って、プロジェクトのテスト基盤を Vitest に移行し、Node.js 環境との完全な互換性を確保してください。

## 1. 参照ドキュメント
まず、以下の実装計画を熟読してください。
- `docs/INSTRUCTION_FOR_CLAUDE_PHASE_1_5.md` (詳細なタスク定義)

## 2. 追加の確認・修正事項 (Gemini レビューに基づく)

`INSTRUCTION_FOR_CLAUDE_PHASE_1_5.md` のタスクに加え、以下の点も確実に実施してください。

### A. 実行環境の互換性確保
- **`package.json`**:
  - `engines` フィールドに `"node": ">=18.0.0"` を追加してください。
- **Shebang (シバン) の修正**:
  - もしソースコードやビルド成果物（`dist/index.js` 等）の先頭が `#!/usr/bin/env bun` になっている場合は、Node.js 互換の `#!/usr/bin/env node` に修正してください（または、実行時に `node dist/index.js` で起動するようにスクリプトを調整してください）。

### B. ESM インポートの検証
- **拡張子**: ソースコード内の import パスが `.js` 拡張子付きで記述されていることを維持してください（Node.js ESM 必須要件）。
  - 例: `import { ... } from "./logger.js"` (OK)
  - 例: `import { ... } from "./logger"` (NG - Node.js で動かない)

### C. テスト設定の調整
- **`vitest.config.ts` の作成**:
  - 必要であれば設定ファイルを作成し、`src` エイリアスやカバレッジ設定を適切に行ってください。
- **モックの互換性**:
  - `bun:test` のモック機能（`spyOn` 等）を使っていた場合は、`vi.spyOn` など Vitest の等価機能に書き換えてください。

## 3. 作業手順

1. `package.json` を修正し、`vitest` をインストール、`bun:test` 依存を削除。
2. テストコード (`test/**/*.ts`) の import を `vitest` に置換。
3. `Taskfile.yml` と `package.json` のスクリプトを修正。
4. Shebang や `engines` フィールドを修正。
5. GitHub Actions (`.github/workflows/ci.yml`) に Node.js マトリックスを追加。
6. `npm install` && `npm test` (Node.js環境シミュレーション) で動作確認。

## 4. 完了条件
- `bun test` コマンドではなく `vitest` (または `npm test`) でテストが実行されること。
- GitHub Actions 上で Node 18, 20, 22 および Bun 環境のすべてでテストがパスすること。
- 既存のテストケース数が減っていないこと。
