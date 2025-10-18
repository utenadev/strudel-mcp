# Strudel Original - モジュール構成分析

**実施日**: 2025-10-18  
**ソース**: source_of_strudel (codeberg.org/uzu/strudel)  
**Version**: 0.5.0

---

## 1. モノリポジトリ構成

Strudel Original は **pnpm workspaces** を使用したモノリポジトリ。

### root package.json

```
@strudel/monorepo (v0.5.0)
├─ dependencies (workspace packages):
│  ├─ @strudel/core
│  ├─ @strudel/mini
│  ├─ @strudel/tonal
│  ├─ @strudel/transpiler
│  ├─ @strudel/webaudio
│  └─ @strudel/xen
```

---

## 2. 利用可能なパッケージ (packages/)

### 必須パッケージ
1. **@strudel/core** ✅
   - パターン処理エンジン
   - Audio Context 管理
   - タイミング・スケジューリング
   - 最も重要

2. **@strudel/webaudio** ✅
   - Web Audio API 統合
   - Sampler/Synth エンジン
   - ドラム音・楽器サンプル
   - エフェクト処理

3. **@strudel/mini** ✅
   - Mini-notation パーサー
   - パターン構文処理

### 補助パッケージ
4. **@strudel/sampler** ✅
   - サンプル管理
   - ドラムライブラリ（samples/ に格納）

5. **@strudel/tonal** (オプション)
   - Tone.js 統合
   - 音程処理

6. **@strudel/midi** (オプション)
   - MIDI 出力
   - MIDI デバイス接続

### その他パッケージ
- codemirror - エディタ統合
- draw - ビジュアライゼーション
- embed - 埋め込み機能
- midi - MIDI 処理
- osc - OSC 通信
- repl - REPL 実装
- tidal - Haskell Tidal 互換
- transpiler - トランスパイラ
- web - Web 版 UI

---

## 3. ドラムサンプル位置

```
source_of_strudel/
├─ samples/
│  ├─ crate/ - GitHub サンプル ("coastline" 等)
│  ├─ superdough/ - 基本ドラム
│  ├─ supradough/ - 拡張ドラム
│  └─ ... (多数)
```

**重要**: 全ドラム音はここにある。Web Audio で直接ロード可能。

---

## 4. 必要な npm パッケージ (frontend)

```json
{
  "dependencies": {
    "@strudel/core": "0.5.0",
    "@strudel/webaudio": "0.5.0",
    "@strudel/mini": "0.5.0",
    "@strudel/tonal": "0.5.0"
  }
}
```

---

## 5. API 概要

### 基本的な使用例

```javascript
import { evaluate } from '@strudel/core'
import { getAudioContext, Synth, Sampler } from '@strudel/webaudio'

// パターン定義
const pattern = evaluate(`
  s("bd sd hh oh").fast(2)
`)

// Audio Context 初期化
const ctx = getAudioContext()

// サンプラー初期化
const sampler = new Sampler(ctx)

// 再生
const player = pattern
  .withAudio(sampler)
  .play()

// 停止
player.stop()
```

---

## 6. 主要 API

| API | 説明 | 対応 |
|-----|------|------|
| `evaluate(code)` | コード評価 → Pattern | ✅ |
| `Pattern.play()` | パターン再生 | ✅ |
| `Sampler` | サンプル再生エンジン | ✅ |
| `getAudioContext()` | Audio Context 取得 | ✅ |
| `withAudio()` | オーディオ出力設定 | ✅ |
| Effects (lpf, delay, reverb) | エフェクト処理 | ✅ |

---

## 7. 統合戦略

### 現在の問題
- 独自の音生成（bd, hh, sd, oh のみ）
- ドラム音が限定的

### 解決方法
1. **frontend/package.json** に @strudel/* パッケージ追加
2. **frontend/src/main.js** でコア API を使用
3. **source_of_strudel/samples** から自動ロード
4. Strudel の `toPlayer()` で全ドラムエフェクト対応

### 統合ステップ
```
frontend/package.json
├─ @strudel/core (パターン処理)
├─ @strudel/webaudio (Audio + Sampler)
├─ @strudel/mini (Parser)
└─ @strudel/tonal (音程処理)
        ↓
        Strudel Original が全てを処理
        - 50+ ドラム音
        - 全エフェクト
        - パターン構文
```

---

## 8. 次ステップ

✅ Phase 2: モジュール調査（完了）

⏳ Phase 3: npm パッケージ追加
- frontend/package.json を更新
- npm install 実行

---

## 参考資料

- **リポジトリ**: https://codeberg.org/uzu/strudel
- **Package Structure**: source_of_strudel/packages/
- **Sample Library**: source_of_strudel/samples/
