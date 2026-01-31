# 技術的負債と改善提案

> Agent Factory MCP - Phase 2 テスト強化作業で発見した課題と将来の改善提案
> 作成日: 2026-01-31
> 関連: docs/WorkingLog.md, docs/REPORT_KIMI_WORK.md

---

## 概要

本ドキュメントは、Phase 2 テスト強化作業中に発見した技術的課題、未対応のセキュリティリスク、および将来の改善提案を詳細に記録したものです。

---

## 1. Error Handler テストの限界

### 現状

グローバルエラーハンドラ（`process.on("unhandledRejection")` / `process.on("uncaughtException")`）は `src/index.ts` のモジュールロード時に登録される。

```typescript
// src/index.ts (line 37-47)
process.on("unhandledRejection", (reason, promise) => {
  Logger.error("Unhandled Rejection at:", promise);
  Logger.error("Reason:", reason);
});

process.on("uncaughtException", (error) => {
  Logger.error("Uncaught Exception:", error);
  process.exit(1);
});
```

### 課題

1. **モジュールキャッシュの問題**
   - Node.js/Bun のモジュールシステムは一度ロードしたモジュールをキャッシュ
   - `vi.resetModules()` や動的 `import()` でも、イベントリスナーの状態は保持される
   - 結果：テストごとにフレッシュな状態を作ることが困難

2. **process.exit() の問題**
   -  uncaughtException ハンドラは `process.exit(1)` を呼び出す
   - テスト中に実際に exit するとテストプロセス自体が終了
   - モック化は可能だが、型安全性と互換性の問題が生じる

3. **イベントリスナーの蓄積**
   - テストごとにハンドラが追加されるとリスナーが蓄積
   - メモリリークのリスク
   - 後続のテストに影響を与える可能性

### 試行した解決策

```typescript
// アプローチ1: 動的インポート（失敗）
await import("../../src/index.js");
// → モジュールキャッシュにより2回目以降の import は効果なし

// アプローチ2: process.emit() でイベント発火（部分的に成功）
process.emit("unhandledRejection", reason, promise);
// → イベントは発火するが、ハンドラの実際の動作は環境依存

// アプローチ3: beforeEach/afterEach でリスナー管理（最終的な妥協点）
process.removeAllListeners("unhandledRejection");
// → 既存のリスナーも削除してしまう副作用あり
```

### 最終判断

テストファイル `test/utils/errorHandler.test.ts` では以下の方針を採用：

1. **Logger.error のスパイテスト**（実行可能）
   - エラーログ出力の検証
   - モックによる動作確認

2. **ハンドラ登録テストのスキップ**（技術的限界）
   ```typescript
   it.skip("should have unhandledRejection handler registered when app starts", () => {
     // 実際のアプリケーション起動時にのみ有効
   });
   ```

### 推奨される対応

1. **E2Eテストでの検証**
   - 実際のアプリケーション起動時の動作を確認
   - `test/e2e-ai-flow.test.ts` パターンで実装

2. **統合テスト**
   - 子プロセスでアプリケーションを起動し、シグナル送信で検証

3. **監視・ログによる間接的検証**
   - 本番環境でのエラーログ監視
   - エラーレポーティングツール連携

---

## 2. ArgumentValidator のセキュリティギャップ

### 検出した未対応攻撃パターン

以下の攻撃パターンは、現在の `ArgumentValidator` で検出**されない**：

#### 2.1 URLエンコーディング攻撃

```
入力: %2e%2e%2fetc%2fpasswd
デコード後: ../etc/passwd
```

**リスク**: 中～高
**影響**: パストラバーサル制御の迂回
**実装状況**: テスト作成済み（スキップ状態）

```typescript
// test/security/argumentValidator-edge.test.ts
it.skip("should block URL encoded traversal (future enhancement)", () => {
  const maliciousArgs = ["%2e%2e%2fetc%2fpasswd"];
  for (const arg of maliciousArgs) {
    expect(() => {
      validator.validate([arg], { argumentType: "filePath" });
    }).toThrow(SecurityError);
  }
});
```

#### 2.2 二重エンコーディング攻撃

```
入力: %252e%252e%252f
第1デコード: %2e%2e%2f
第2デコード: ../
```

**リスク**: 高
**影響**: 多層防御の迂回
**対応案**: 再帰的デコードまたは正規化処理

#### 2.3 Unicode正規化攻撃

```
入力: ..／etc／passwd（全角スラッシュ）
正規化後: ../etc/passwd
```

**リスク**: 中
**影響**: 視覚的に類似したパスによる欺瞞
**対応案**: Unicode正規化（NFKC/NFD）の適用

#### 2.4 Nullバイトインジェクション

```
入力: safe.txt\x00.php
解釈: PHPファイルとして扱われる可能性（C言語系のNull終端処理）
```

**リスク**: 低～中（Node.jsはNullバイトを許容）
**影響**: ファイル拡張子チェックの迂回
**対応案**: Nullバイト（\x00）の明示的拒否

#### 2.5 ホワイトスペース変形

```
入力: ..\t/etc/passwd（タブ文字）
入力: ..\n/etc/passwd（改行文字）
```

**リスク**: 低～中
**影響**: 単純な文字列マッチングの迂回
**対応案**: ホワイトスペースの正規化または明示的チェック

### 推奨される実装方針

#### Phase A: 即座に実装可能（低リスク・高効果）

1. **Nullバイトチェック**
   ```typescript
   if (arg.includes('\x00')) {
     throw SecurityErrors.nullByte();
   }
   ```

2. **URLデコード（1回）**
   ```typescript
   const decoded = decodeURIComponent(arg);
   if (this.containsTraversal(decoded)) {
     throw SecurityErrors.pathTraversal(arg);
   }
   ```

#### Phase B: 慎重な検討が必要（中～高リスク）

1. **再帰的URLデコード**
   - 最大デコード回数の設定（推奨: 3回）
   - 無限ループ防止

2. **Unicode正規化**
   - NFKC正規化の適用
   - パフォーマンス影響の測定
   - 国際化要件との衝突確認

3. **ホワイトスペース正規化**
   - タブ→スペース変換
   - 改行文字の扱い定義

### 実装優先度

| 優先度 | 対策 | リスク | 実装コスト |
|--------|------|--------|-----------|
| 高 | Nullバイト拒否 | 中 | 低 |
| 高 | URLデコード（1回） | 高 | 低 |
| 中 | 再帰的デコード | 高 | 中 |
| 中 | Unicode正規化 | 中 | 中 |
| 低 | ホワイトスペース | 低 | 中 |

---

## 3. AuditLogger のローテーション限界

### 現状の実装

```typescript
// src/utils/auditLogger.ts (line 272-296)
private rotateLogIfNeeded(): void {
  if (!fs.existsSync(this.config.logPath)) return;
  const stats = fs.statSync(this.config.logPath);
  if (stats.size < this.config.maxLogSize) return;
  this.rotateLogs();
}
```

### 未テストの機能

1. **実際のローテーション動作**
   - ファイルサイズが10MBを超えた時の挙動
   - audit.log → audit.log.1 → audit.log.2 の連鎖
   - 最大5ファイル保持の制限

2. **同時書き込みの扱い**
   - 複数プロセスからの同時アクセス
   - ファイルロック機構の欠如

3. **ディスクフル時の動作**
   - エラーの抑制と通知
   - 代替のログ出力方法

### テスト困難性

1. **ファイルサイズの生成**
   - 10MBのログファイルを生成する時間
   - テスト実行時間への影響

2. **状態のクリーンアップ**
   - 複数のローテートファイルの管理
   - テスト間の影響防止

3. **非決定論的な要素**
   - ファイルシステムの遅延
   - タイミング依存の問題

### 推奨される対応

1. **設定値の低減テスト**
   ```typescript
   maxLogSize: 1024 // 1KBに設定してテスト
   ```

2. **モックファイルシステムの使用**
   - `memfs` 等のインメモリFSを使用
   - 決定論的なテスト環境

3. **統合テストでの検証**
   - 実際の長時間実行テスト
   - ストレステスト環境

---

## 4. カバレッジレポートの可視化

### 現状

- CIでカバレッジレポートを生成
- アーティファクトとして保存（30日間）
- 手動ダウンロードが必要

### 課題

1. **即座の可視化**
   - PR時にカバレッジ変化を確認できない
   - レポーターがローカルに環境を構築する必要

2. **トレンド追跡**
   - 時間経過でのカバレッジ変化の追跡困難

### 推奨される改善

#### オプションA: shields.io バッジ（簡易）

```markdown
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/...)
```

- GitHub Actions で Gist を更新
- README にリアルタイム表示

#### オプションB: Codecov 連携（推奨）

```yaml
# .github/workflows/ci.yml
- uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
    flags: unittests
    name: codecov-umbrella
```

- 詳細なレポート UI
- PR時の差分カバレッジ表示
- 無料でオープンソースプロジェクトに対応

#### オプションC: カスタムダッシュボード

- 自前のレポートサーバー
- セキュアな環境でのみ有効

### 実装優先度

**中**

- 品質向上には寄与するが、現状の手動確認でも可能
- Codecov連携は30分程度で設定完了

---

## 5. Vitest API互換性の問題

### 発見した差異

| API | Vitest公式 | Bun実装 | 状態 |
|-----|-----------|---------|------|
| `vi.advanceTimeBy()` | 存在 | 未実装 | エラー |
| `vi.advanceTimersByTime()` | 存在 | 存在 | 利用可能 |
| `vi.resetModules()` | 存在 | 未実装 | エラー |

### 影響範囲

- **進行中のテスト**: 回避策で対応済み
- **将来のテスト**: 注意が必要

### 推奨されるガイドライン

```typescript
// 推奨: 標準的なVitest APIのみ使用
vi.useFakeTimers();
vi.advanceTimersByTime(1000); // OK

// 回避: Bun未対応API
vi.advanceTimeBy(1000); // NG
vi.resetModules(); // NG
```

### 長期的な対応

1. **BunのVitest互換性向上を待つ**
   - Bunプロジェクトのアクティブ開発
   - 将来的な互換性向上の可能性

2. **Node.jsテストの追加**
   - CIでNode.js環境でもテスト実行
   - 完全なAPI互換性の確保

---

## 6. テスト実行速度の最適化

### 現状の計測値

```
Duration: 3.18s (transform 2.11s, tests 2.67s)
```

### ボトルネック分析

1. **transform: 2.11s**
   - TypeScriptのコンパイル時間
   - 改善余地あり

2. **collect: 3.57s**
   - テストファイルの収集・解析

3. **tests: 2.67s**
   - 実際のテスト実行時間

### 改善提案

1. **スレッド並列化**
   ```typescript
   // vitest.config.ts
   export default {
     pool: 'threads',
     poolOptions: {
       threads: {
         singleThread: false,
       },
     },
   }
   ```

2. **テストファイルの分割**
   - 巨大なテストファイルを分離
   - 並列実行の効率化

3. **インポート最適化**
   - 不要なインポートの削減
   - 動的インポートの活用

### 効果見積もり

| 改善策 | 期待効果 | 実装コスト |
|--------|---------|-----------|
| スレッド並列化 | -30% | 低 |
| ファイル分割 | -20% | 中 |
| インポート最適化 | -10% | 高 |

---

## 7. 並行作業の効率化知見

### 成功したパターン

1. **異なる関心ごとの並行**
   - Error Handler（難易度高）＋ AuditLogger PII（直接的）
   - 一方がブロックされても他方を進められる

2. **段階的な完成**
   - ベースライン実装 → エッジケース追加
   - 早期に動作するものを作成し、フィードバックを得る

3. **テストファーストの妥協**
   - 難易度の高いテストはスキップとして記録
   - 実装の制限を早期に発見・記録

### 学び

1. **制限の早期発見**
   - 実装制限をテスト作成段階で発見
   - 無理な実装を避け、将来の強化項目として記録

2. **ドキュメントの重要性**
   - スキップしたテストの理由を明記
   - 将来の開発者が理解できる記録

3. **コミット粒度**
   - 機能ごとにコミット（テスト＋実装）
   - ロールバック可能な単位

---

## まとめ

本ドキュメントで記録した課題と提案：

1. **Error Handler**: E2Eテストでの検証が必要
2. **ArgumentValidator**: URLエンコーディング等の追加対策
3. **AuditLogger**: 実際のローテーション動作の統合テスト
4. **カバレッジ**: Codecov連携による可視化
5. **Vitest互換性**: Bun未対応APIの回避
6. **テスト速度**: スレッド並列化等の最適化
7. **並行作業**: 効率的な開発パターンの確立

これらは次の開発フェーズや、セキュリティ強化Phaseで対応を検討すべき項目です。
