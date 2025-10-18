# Phase 4: Frontend リファクタリング実装ガイド

**対象**: frontend/src/main.js  
**目的**: Strudel Original API に完全移行

---

## 1. 実装戦略

### 現状（独自実装）
```javascript
// 限定的なドラム音のみ
soundFuncs = { 'bd': ..., 'hh': ..., 'sd': ..., 'oh': ... }
```

### 新実装（Strudel Original）
```javascript
import { Pattern, silence } from '@strudel/core'
import { getAudioContext, webaudioOutput } from '@strudel/webaudio'
import { transpiler } from '@strudel/transpiler'

// Strudel が全て処理（50+ドラム音、エフェクト等）
const pattern = transpiler(code)
pattern.onTrigger(webaudioOutput, 1)
```

---

## 2. 主要変更

### 削除する部分
1. **StrudelSynthesizer クラス** - 完全削除（Strudel が提供）
2. **独自音生成関数群** - playSimpleBeat, playPatternAtBeat 等
3. **soundFuncs オブジェクト** - Strudel の Sampler に置き換え
4. **手作業パターン検出** - Strudel Parser が処理

### 新規追加
1. **Strudel Core インポート**
   ```javascript
   import { Pattern, silence, repl } from '@strudel/core'
   import { getAudioContext, webaudioOutput, webaudioRepl } from '@strudel/webaudio'
   import { transpiler } from '@strudel/transpiler'
   ```

2. **webaudioRepl 初期化**
   ```javascript
   let strudelRepl = webaudioRepl({
     getTime: () => getAudioContext().currentTime,
     defaultOutput: webaudioOutput
   })
   ```

3. **パターン実行**
   ```javascript
   function playStrudelPattern(code) {
     try {
       const pattern = transpiler(code)
       pattern.onTrigger(webaudioOutput, 1)
       activePattern = pattern
     } catch (error) {
       addMessage(`Error: ${error.message}`, 'error')
     }
   }
   ```

---

## 3. 主要 API

| 関数 | 説明 | 置き換え対象 |
|------|------|----------|
| `transpiler(code)` | コード解析 → Pattern | playPatternAtBeat() |
| `pattern.onTrigger()` | トリガー登録 | setInterval() |
| `webaudioOutput` | 音再生 | soundFuncs |
| `getAudioContext()` | Audio Context | initAudio() |
| `pattern.stop()` | パターン停止 | clearInterval() |

---

## 4. 実装手順

### Step 1: インポート追加
```javascript
// 削除
// import './style.css' (そのまま)

// 追加
import { Pattern, silence } from '@strudel/core'
import { getAudioContext, webaudioOutput } from '@strudel/webaudio'
import { transpiler } from '@strudel/transpiler'
```

### Step 2: グローバル変数更新
```javascript
// 削除対象
// let synthesizer = null
// let soundFuncs = null
// let activeIntervals = []

// 追加・更新
let activePattern = null
let strudelRepl = null
```

### Step 3: initAudio() 簡素化
```javascript
function initAudio() {
  if (!getAudioContext()) {
    throw new Error('Audio context not available')
  }
  // Strudel が全て処理
}
```

### Step 4: playStrudelPattern() 置き換え
```javascript
function playStrudelPattern(code) {
  if (activePattern) {
    activePattern.stop()
  }

  try {
    const pattern = transpiler(code)
    pattern.onTrigger(webaudioOutput, 1)
    activePattern = pattern
    addMessage(`🎵 Playing: ${code}`, 'music')
  } catch (error) {
    addMessage(`Parse error: ${error.message}`, 'error')
  }
}
```

### Step 5: stopMusic() 簡素化
```javascript
function stopMusic() {
  if (activePattern) {
    activePattern.stop()
    activePattern = null
    addMessage('🛑 Music stopped', 'info')
  } else {
    addMessage('No music playing', 'info')
  }
}
```

### Step 6: 削除対象クラス・関数
- StrudelSynthesizer クラス
- playSimpleBeat()
- playMultiplePatterns()
- playPatternAtBeat()
- analyzeStrudelCode() - Strudel Parser に任せる

---

## 5. 互換性保持

### BroadcastChannel 同期
```javascript
// syncManager で既に対応
// executeCode() 内から broadcastPatternChange() 呼び出し
```

### ステータス表示
```javascript
// updateStatus() はそのまま利用可能
// WebSocket ステータスは独立
```

### エディタ検証
```javascript
// updateBasicStatus() は Strudel Parser 結果を使用
// analyzeStrudelCode() → transpiler() の結果確認
```

---

## 6. テスト項目

- [ ] 基本パターン実行: `s("bd hh sd oh")`
- [ ] 複雑なパターン: `s("bd:<1 2 3>").fast(2).lpf(1000)`
- [ ] GitHub サンプル: "coastline" パターン
- [ ] ドラム音全種類: rim, rd, conga 等
- [ ] エフェクト処理: delay, reverb, lpf
- [ ] 停止機能: stopMusic()
- [ ] BroadcastChannel 同期: 複数タブ

---

## 7. エラーハンドリング

```javascript
try {
  const pattern = transpiler(code)
  // ...
} catch (error) {
  if (error instanceof SyntaxError) {
    addMessage(`Syntax error: ${error.message}`, 'error')
  } else if (error instanceof TypeError) {
    addMessage(`Type error: ${error.message}`, 'error')
  } else {
    addMessage(`Error: ${error.message}`, 'error')
  }
}
```

---

## 注意事項

1. **transpiler が同期的に動作** - await 不要
2. **pattern.onTrigger() が音声を生成** - Web Audio API 処理
3. **setInterval 不要** - Strudel が スケジューリングを管理
4. **サンプルは自動ロード** - source_of_strudel/samples/ から

---

## 実装完了後

1. npm run dev でテスト
2. GitHub サンプルコード実行確認
3. パフォーマンス測定
4. 複数タブ同期確認
5. コミット & push
