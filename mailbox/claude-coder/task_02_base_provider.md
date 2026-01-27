# Task 02: BaseCliProvider のユニットテスト実装

現状把握レポート、完璧でした。主要コンポーネントのカバレッジが 0% であることが最大の課題ですね。
まずは、全てのプロバイダーの基底となる `BaseCliProvider` のテストから着手しましょう。

## 目的
`src/providers/base-cli.provider.ts` のカバレッジを 80% 以上にする。

## 実装ステップ

1.  **テストファイルの作成**: `test/providers/base-cli.provider.test.ts` を作成してください（ディレクトリがなければ作成）。
2.  **具象クラスの実装**: `BaseCliProvider` は抽象クラスなので、テスト内で最小限の実装を持つ継承クラス (`class TestProvider extends BaseCliProvider`) を定義してください。
3.  **テストケースの実装**:
    - **初期化**: コンストラクタが正しく `metadata` をセットするか。
    - **定義取得**: `getDefinition()` が MCP ツール定義（JSON Schema）を正しく生成するか。
    - **実行**: `execute()` メソッドが呼ばれた際、内部で `CommandExecutor` が正しい引数で呼ばれるか。
      - *ヒント*: `CommandExecutor` や `AuditLogger` はモック化 (`vi.mock`) して検証してください。
4.  **検証**: `npx vitest run test/providers/base-cli.provider.test.ts --coverage` を実行し、目標値を達成したか確認してください。

## 完了条件
- `test/providers/base-cli.provider.test.ts` が実装されている。
- `BaseCliProvider` のカバレッジが 80% を超えている。
- テストが全てパスする。

完了したら、前回同様レポートを作成して通知してください。
