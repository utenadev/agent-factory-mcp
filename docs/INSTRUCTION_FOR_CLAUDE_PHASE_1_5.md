# Claude Code への作業指示書 (Phase 1.5: Node.js 互換性と Vitest 移行)

現在、プロジェクトは `bun:test` に強く依存しており、Node.js 環境での互換性が失われています。
Phase 1B に進む前に、テスト基盤を `vitest` に移行し、Node.js 環境での動作を保証してください。

## 目的
- **Node.js 互換性の確保**: ユーザーが `npx` (Node.js) でツールを利用できるようにする。
- **クロスランタイムテスト**: 開発は Bun、CI は Node.js (18, 20, 22) + Bun の両方でテストをパスさせる。

## タスク

### 1. 依存関係の入替え
- `package.json` を修正:
  - `vitest` を `devDependencies` にインストール。
  - `bun:test` への依存（型定義など）を削除、または `vitest` と競合しないように調整。

### 2. テストコードの置換 (`test/**/*.test.ts`, `test/**/*.test.js`)
すべてのテストファイルにおいて、インポート元を変更してください。

- **変更前**: `import { ... } from "bun:test"`
- **変更後**: `import { ... } from "vitest"`

※ `bun:test` 特有の機能（もしあれば）を使用している箇所は、Vitest の等価な機能に書き換えてください。

### 3. スクリプトと設定の更新
- **`package.json`**:
  - `"test"`: `"vitest run"`
  - `"test:unit"`: `"vitest run --exclude test/e2e-ai-flow.test.ts"`
  - `"test:e2e"`: `"vitest run test/e2e-ai-flow.test.ts"`
- **`Taskfile.yml`**:
  - テスト関連のコマンドを `bun test` から `vitest run` (または `npm test` 経由) に変更。
  - `{{.BUN_BIN}}` の代わりに、実行環境に応じて `bun` または `node` (npx) が使われるように調整（`npm run` 経由にするのが無難）。

### 4. CI ワークフローの更新 (`.github/workflows/ci.yml`)
Node.js と Bun の両方でテストを実行するようにマトリックスビルドを設定してください。

```yaml
strategy:
  matrix:
    os: [ubuntu-latest]
    node-version: [18.x, 20.x, 22.x]
    # Bun は別途ステップ、またはマトリックスに含める
```

- Node.js 環境では `npm install` && `npm test` (vitest) を実行。
- Bun 環境では `bun install` && `bun test` (vitest) を実行。

### 5. ソースコードの互換性チェック
- コード内で `Bun.xxx` などの Bun 固有 API を使用していないか確認し、使用している場合は `process` や `child_process` などの Node.js 標準 API、または条件分岐によるポリフィルに置き換えてください。
  - 例: `Bun.spawn` -> `child_process.spawn` (現状は `child_process` を使用しているはずだが要確認)

## 検証手順

1. **Bun 環境での実行**: `bun install && task test` がパスすること。
2. **Node.js 環境での実行**: `npm install && npm test` がパスすること（手元に Node があれば）。
3. **CI の通過**: 更新した `ci.yml` が GitHub Actions 上ですべての Job (Node 18/20/22, Bun) でパスすること。
