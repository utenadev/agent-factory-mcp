# セキュリティ強化計画 (Phase 1) - Claude のレビューと提案

このドキュメントは、元の `PLAN_SECURITY_HARDENING.md` に対する Claude Code のレビューと追加提案をまとめたものです。

## 元の計画の評価

### ✅ 良い点

1. **包括的なアプローチ**: バリデーション、監査ログ、テストの3つの柱が明確
2. **SecurityError の標準化**: エラーハンドリングの一貫性を確保
3. **監査ログの実装**: トレーサビリティとコンプライアンス対応

### ⚠️ 懸念点と改善提案

---

## 1. 引数バリデーションの改善

### 現状の課題

元の計画では以下を一律にブロックしています：
- シェル特殊文字: `;`, `|`, `&`, `` ` ``, `(`, `)`, etc.
- ディレクトリトラバーサル: `../`, `..\\`
- 改行: `\\n`

**問題**: これらは正当なユースケースでも使用されます：
- ファイルパス: `../../data/input.json`
- マルチラインプロンプト: AI への長文入力

### 提案: コンテキスト対応バリデーション

```typescript
// src/utils/argumentValidator.ts
interface ValidationContext {
  argumentType: 'command' | 'filePath' | 'prompt' | 'generic';
  allowRelativePaths?: boolean;
  allowMultiline?: boolean;
}

class ArgumentValidator {
  validate(
    args: string[],
    context: ValidationContext = { argumentType: 'generic' }
  ): void;
}
```

### 提案: 許可リスト（Allowlist）方式

ブロックリストではなく、許可する文字/パターンを明示的に定義：

```typescript
// ファイルパス引数の場合
const ALLOWED_PATH_CHARS = /[a-zA-Z0-9_\-./]/;

// プロンプト引数の場合（より寛容）
const ALLOWED_PROMPT_CHARS = /[\\p{L}\\p{N}\\p{P}\\p{S}\\s]/u;
```

---

## 2. ホワイトリスト方式の強化

### 提案: 多層防御

| レイヤー | 保護内容 | 実装方法 |
|---------|---------|---------|
| **L1: コマンド名** | 実行許可するCLI | `allowedCommands: Set<string>` |
| **L2: オプションフラグ** | 危険なオプションを排除 | `dangerousFlags: ['--exec', '-e', '--eval']` |
| **L3: 引数値** | 値のバリデーション | 上記の context 対応バリデーション |

```typescript
// 設定例
const securityConfig = {
  allowedCommands: new Set(['qwen', 'claude', 'gemini', 'opencode']),
  dangerousFlags: new Set(['--exec', '-e', '--eval', '|', ';']),
  maxArgumentLength: 10000,
};
```

---

## 3. 監査ログの運用上の考慮

### 追加項目

1. **PII 保護**: 機密情報のマスキング
   ```typescript
   // APIキー、パスワード等を検出してマスク
   const sanitizeArgs = (args: string[]): string[] => {
     return args.map(arg => {
       // --api-key, -k, --token 等の後ろの値をマスク
       if (arg.match(/^(--api-key|--token|-k|--password|--secret)=/i)) {
         return arg.replace(/=.+$/, '=***REDACTED***');
       }
       // 長いプロンプト（1000文字以上）は短縮
       if (arg.length > 1000) {
         return arg.slice(0, 200) + '...[REDACTED ' + (arg.length - 200) + ' chars]';
       }
       // @ 構文のファイルパスも短縮（ファイル名のみ表示）
       if (arg.startsWith('@/')) {
         return '@[REDACTED PATH]';
       }
       return arg;
     });
   };
   ```

2. **ログローテーション**:
   ```typescript
   // ファイルサイズ制限（例: 10MB）
   const MAX_LOG_SIZE = 10 * 1024 * 1024;
   // ローテーション: audit.log.1, audit.log.2, ...
   ```

3. **ログレベル**: debug/info/warn/error をサポート

### 🔴 Gemini からの追加要件

**API キーと機密情報の検出パターン（強化版）**
```typescript
// 検出すべきパターン
const SENSITIVE_PATTERNS = [
  /(--api-key|--token|-k|--password|--secret|--auth-key)=/i,
  /bearer\s+[a-zA-Z0-9\-._~+/]+=*/i,  // Bearer tokens
  /sk-[a-zA-Z0-9]{48}/,                 // OpenAI API keys
  /AIza[a-zA-Z0-9\-_]{35}/,             // Google API keys
];

function sanitizeSensitiveInfo(arg: string): string {
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(arg)) {
      return arg.replace(pattern, (match) => {
        // 値の部分を ***REDACTED*** に置換
        return match.includes('=')
          ? match.split('=')[0] + '=***REDACTED***'
          : '***REDACTED***';
      });
    }
  }
  return arg;
}
```

---

## 4. Gemini-CLI との統合検討

### Gemini CLI の特性

Google の Gemini CLI は以下の特徴があります：
- **コマンド**: `gemini-chat` または `gemini`
- **引数**: プロンプトを直接渡すか、ファイルを `@` で指定
- **オプション**: `--model`, `--temperature`, `--output` 等

### セキュリティ上の考慮点

| 項目 | 考慮事項 |
|-----|---------|
| **ファイル指定** | `@filename` 構文の解釈が必要（パストラバーサル対策） |
| **プロンプト** | ユーザー入力をそのまま渡す → インジェクションリスク |
| **出力先** | `--output file` のファイルパスバリデーション |
| **モデル指定** | `--model` のホワイトリスト（任意モデル実行の防止） |

### 🔴 Gemini からの追加要件（重要）

**A. `@` 構文の厳格な検証**
```typescript
// @ で始まる引数の検証
function validateAtSyntax(arg: string): void {
  if (!arg.startsWith('@')) return;

  const filePath = arg.slice(1);
  // パストラバーサルをブロック
  if (filePath.includes('../') || filePath.includes('..\\')) {
    throw new SecurityError('Path traversal detected in @ syntax');
  }
  // 絶対パスのみ許可（またはCWD内の相対パス）
}
```

**B. セッションID のフォーマット検証**
```typescript
// --resume や --session に渡されるIDの検証
const SESSION_ID_PATTERN = /^[a-zA-Z0-9\-_]+$/;

function validateSessionId(id: string): void {
  if (!SESSION_ID_PATTERN.test(id)) {
    throw new SecurityError('Invalid session ID format');
  }
  if (id.length > 256) {
    throw new SecurityError('Session ID too long');
  }
}
```

**C. 長いプロンプトのログ対策**
```typescript
// ログ出力時に長いプロンプトを短縮
const MAX_PROMPT_LOG_LENGTH = 200; // ログ用は短めに

function sanitizeForLogging(arg: string): string {
  if (arg.length > MAX_PROMPT_LOG_LENGTH) {
    return arg.slice(0, MAX_PROMPT_LOG_LENGTH) + '...[TRUNCATED]';
  }
  return arg;
}
```

### Gemini 向け追加バリデーション

```typescript
// src/providers/gemini.provider.ts (提案)
class GeminiProvider extends BaseCliProvider {
  private readonly ALLOWED_MODELS = new Set([
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
  ]);

  validateOptions(options: Record<string, unknown>): void {
    // モデル名の検証
    if (options.model && !this.ALLOWED_MODELS.has(options.model as string)) {
      throw new SecurityError(`Unknown model: ${options.model}`);
    }

    // 出力先ファイルのパス検証
    if (options.output) {
      ArgumentValidator.validateFilePath(options.output as string);
    }
  }
}
```

---

## 5. 実装の優先順位（修正提案）

### Phase 1A: 緊急対策（今回）

1. ✅ `SecurityError` の定義
2. ✅ `ArgumentValidator` の実装（コンテキスト対応版）
3. ✅ `AuditLogger` の実装（PII保護付き）
4. ✅ `CommandExecutor` への統合
5. ✅ セキュリティテストの実装

### Phase 1B: プロバイダー個別の対策

1. 各プロバイダー（Qwen, Claude, Gemini, OpenCode）の固有バリデーション
2. `@` ファイル指定構文の統一処理とセキュリティ
3. 危険オプションのブロックリスト実装

### Phase 1C: 運用改善

1. ログローテーション
2. セキュリティ設定の外部化（config.json）
3. セキュリティ監査ダッシュボード（オプション）

---

## 6. テストケースの追加提案

### 既存の正常系を壊さないためのテスト

```typescript
describe('ArgumentValidator - Regression Tests', () => {
  test('正当な相対パスを許可する', () => {
    expect(() => validate(['../../data/input.json'], { argumentType: 'filePath' }))
      .not.toThrow();
  });

  test('マルチラインプロンプトを許可する', () => {
    const multiline = 'Line 1\\nLine 2\\nLine 3';
    expect(() => validate([multiline], { argumentType: 'prompt' }))
      .not.toThrow();
  });

  test('Unicode 文字を含むプロンプトを許可する', () => {
    expect(() => validate(['こんにちは 世界 🌍'], { argumentType: 'prompt' }))
      .not.toThrow();
  });
});
```

### エッジケース

```typescript
describe('ArgumentValidator - Edge Cases', () => {
  test('空文字列の配列を処理', () => {
    expect(() => validate([''])).not.toThrow(); // または throw? 要検討
  });

  test('非常に長い引数を拒否', () => {
    const longArg = 'a'.repeat(10001);
    expect(() => validate([longArg])).toThrow(SecurityError);
  });

  test('ヌルバイトを含む引数を拒否', () => {
    expect(() => validate(['test\\x00file'])).toThrow(SecurityError);
  });
});
```

### Gemini 固有のテストケース

```typescript
describe('ArgumentValidator - Gemini Requirements', () => {
  describe('@ syntax validation', () => {
    test('@ で始まる相対パスを許可', () => {
      expect(() => ArgumentValidator.validateAtSyntax('@/file.txt'))
        .not.toThrow();
    });

    test('@ で始まるトラバーサルパスをブロック', () => {
      expect(() => ArgumentValidator.validateAtSyntax('@../../etc/passwd'))
        .toThrow(SecurityError);
    });

    test('@ で始まるWindowsトラバーサルをブロック', () => {
      expect(() => ArgumentValidator.validateAtSyntax('@..\\..\\windows\\system32'))
        .toThrow(SecurityError);
    });
  });

  describe('Session ID validation', () => {
    test('有効なセッションIDを許可', () => {
      expect(() => ArgumentValidator.validateSessionId('session-123_abc'))
        .not.toThrow();
    });

    test('無効な文字を含むセッションIDを拒否', () => {
      expect(() => ArgumentValidator.validateSessionId('session.123'))
        .toThrow(SecurityError);
    });

    test('長すぎるセッションIDを拒否', () => {
      const longId = 'a'.repeat(257);
      expect(() => ArgumentValidator.validateSessionId(longId))
        .toThrow(SecurityError);
    });
  });
});

describe('AuditLogger - PII Protection', () => {
  test('APIキーをマスクする', () => {
    const args = ['--api-key=sk-1234567890abcdef'];
    const sanitized = AuditLogger.sanitizeArgs(args);
    expect(sanitized).toEqual(['--api-key=***REDACTED***']);
  });

  test('長いプロンプトを短縮する', () => {
    const longPrompt = 'a'.repeat(1500);
    const sanitized = AuditLogger.sanitizeForLogging(longPrompt);
    expect(sanitized.length).toBeLessThan(300);
    expect(sanitized).toContain('[TRUNCATED]');
  });

  test('@構文のパスをマスクする', () => {
    const args = ['@/home/user/sensitive.txt'];
    const sanitized = AuditLogger.sanitizeArgs(args);
    expect(sanitized).toEqual(['@[REDACTED PATH]']);
  });
});
```

---

---

## 緊急の脆弱性発見

### 🔴 `autoDiscovery.ts` での `execSync` 使用

**問題**: `src/utils/autoDiscovery.ts` で `execSync` が使用されており、コマンドインジェクションのリスクがあります：

```typescript
// 21行目 - 危険！
const result = execSync(`${checkCommand} "${command}" 2> /dev/null || echo ""`)

// 41行目 - も同様
const versionOutput = execSync(`"${executablePath}" --version 2> /dev/null || ...`)

// 79行目 - も同様
const helpOutput = execSync(`"${executablePath}" --help 2> /dev/null || echo ""`)
```

**現状の緩和策**:
- `AI_TOOL_WHITELIST` でコマンド名を制限（`claude`, `opencode`, `gemini` のみ）
- これにより、攻撃者が任意のコマンドを実行することは防いでいる

**推奨対策**:
- `execSync` を `spawn` ベースの `executeCommand` に置き換え
- 引数を配列として渡すことで、シェルインジェクションを完全に防ぐ

---

## 更新された実装の優先順位

### Phase 0: 緊急脆弱性修正

1. ✅ **`autoDiscovery.ts` の `execSync` を `executeCommand` に置き換え**
   - `findExecutable` 関数
   - `getToolVersion` 関数
   - `checkToolCompatibility` 関数

### Phase 1A: 基本セキュリティ対策（元の計画）

1. ✅ `SecurityError` の定義
2. ✅ `ArgumentValidator` の実装（コンテキスト対応版）
3. ✅ `AuditLogger` の実装（PII保護付き）
4. ✅ `CommandExecutor` への統合
5. ✅ セキュリティテストの実装

### Phase 1B-B: Gemini 固有の対策（Gemini からのフィードバックを反映）

Gemini は既にホワイトリストに含まれていますが、以下の追加バリデーションを実装：

| 項目 | 実装内容 | 優先度 |
|-----|---------|-------|
| **`@` 構文** | `../` を含むパスをブロック（`@../../etc/passwd` 等） | 🔴 必須 |
| **セッションID** | 英数字と `-_` のみ許可、最大256文字 | 🔴 必須 |
| **`--model`** | 許可するモデルのホワイトリスト | 🟡 推奨 |
| **APIキー** | ログ出力時にマスク（`--api-key=***`） | 🔴 必須 |
| **長いプロンプト** | 1000文字以上はログで短縮表示 | 🔴 必須 |

### 具体的な実装例

```typescript
// src/utils/argumentValidator.ts (Gemini 要件対応)
export class ArgumentValidator {
  // @ 構文の検証
  static validateAtSyntax(arg: string): void {
    if (!arg.startsWith('@')) return;

    const filePath = arg.slice(1);
    // パストラバーサル検出
    if (filePath.includes('../') || filePath.includes('..\\')) {
      throw new SecurityError(
        'Path traversal detected in @ syntax: ' + arg
      );
    }
    // 絶対パスチェック（必要に応じて）
    if (filePath.startsWith('/') || filePath.match(/^[a-zA-Z]:\\/)) {
      // 絶対パスを許可するか、CWD内のみに制限するか
      // ここではCWD内のみを許可する例
      throw new SecurityError('Absolute paths not allowed in @ syntax');
    }
  }

  // セッションIDの検証
  static validateSessionId(id: string): void {
    // 英数字とハイフン、アンダースコアのみ
    const validPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!validPattern.test(id)) {
      throw new SecurityError(
        'Invalid session ID format. Only alphanumeric, -, _ allowed'
      );
    }
    if (id.length > 256) {
      throw new SecurityError('Session ID too long (max 256 chars)');
    }
  }

  // 引数配列全体の検証（Gemini 要件統合）
  static validateWithGeminiRequirements(
    args: string[],
    context: ValidationContext = { argumentType: 'generic' }
  ): void {
    for (const arg of args) {
      // @ 構文の検証
      this.validateAtSyntax(arg);

      // セッションIDの検証（--resume, --session の値）
      if (arg.startsWith('--resume=') || arg.startsWith('--session=')) {
        const sessionId = arg.split('=')[1];
        if (sessionId) this.validateSessionId(sessionId);
      }
    }

    // 既存のバリデーションも実行
    this.validate(args, context);
  }
}
```

---

## まとめ

元の計画は良い出発点ですが、以下の強化を推奨します：

1. **一律ブロック → コンテキスト対応**: 引数の種類に応じたバリデーション
2. **ブロックリスト → 許可リスト**: セキュリティの原則
3. **多層防御**: コマンド名、オプション、引数値の各レイヤーで保護
4. **運用上の考慮**: PII保護、ログローテーション、設定の外部化
5. **回帰テスト**: 正常なユースケースを壊さない保証
6. **🔴 緊急**: `autoDiscovery.ts` の `execSync` を `spawn` に置き換え

---

## Gemini からのフィードバック（反映済み）

以下の追加要件を **Phase 1B-B** に統合しました：

| 追加要件 | 内容 |
|---------|------|
| `@` 構文の検証 | `../` パストラバーサルをブロック |
| セッションID検証 | 英数字と `-_` のみ、最大256文字 |
| APIキーマスキング | ログ出力時に `***REDACTED***` に置換 |
| 長いプロンプト対策 | 1000文字以上は短縮してログ出力 |

---

## 次のステップ

1. ✅ ドキュメントの調整完了
2. ⏭️ **実装開始**: `src/utils/errors.ts` から開始
3. ⏭️ `autoDiscovery.ts` の `execSync` を `executeCommand` に置き換え（最優先）

---

## Gemini によるレビュー結果 (2026-01-26)

### 完了確認
以下のフェーズの実装と動作検証が完了しました。

| フェーズ | 実装項目 | ステータス | 備考 |
|---|---|---|---|
| **Phase 0** | `autoDiscovery.ts` の `execSync` 排除 | ✅ 完了 | `spawn` ベースの `executeCommand` に置換済 |
| **Phase 1A** | 基本セキュリティ対策 | ✅ 完了 | `ArgumentValidator`, `AuditLogger` 実装済 |
| **Phase 1B** | プロバイダー個別の対策 | ✅ 完了 | `GenericCliProvider` でバリデーション適用 |
| **Phase 1B-B** | Gemini 固有の対策 | ✅ 完了 | `@` 構文, `sessionId` 検証実装済 |
| **Phase 1C** | 運用改善 | ✅ 完了 | ログローテーション, 設定外部化実装済 |

### 品質評価
1. **セキュリティ**: バリデーションロジック、PII保護、ログローテーションはいずれも要件を満たしており、セキュアな設計になっています。
2. **Gemini 対応**: 特有の `@` 構文やセッションIDに対するバリデーションが適切に組み込まれています。
3. **テスト**: 新規セキュリティテスト (34ケース) および既存ユニットテスト (52ケース) が全てパスしており、品質と互換性が担保されています。

### 次のステップ
Phase 1.5 (Vitest 移行と Node.js 互換性確保) へ進みます。

---

## 参照ドキュメント

- `docs/PLAN_SECURITY_HARDENING.md` - 元の実装計画
- `docs/PROMPT_FOR_GEMINI.md` - Gemini へのレビュー依頼
- `docs/PROMPT_FOR_CLAUDE.md` - Gemini からのフィードバック

