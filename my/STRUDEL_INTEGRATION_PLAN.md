# Strudel Original 完全統合実装計画

**作成日**: 2025-10-18  
**目標**: Strudel Original のコアモジュール完全統合による本物のStrudel体験の実現

---

## 1. 概要

現在の実装では、Web Audio APIで独自に音生成しているため、ドラム音が `bd`, `hh`, `sd`, `oh` のみに限定されている。

**解決策**: Strudel Original のモジュール群を npm 経由で統合し、以下を実現：
- ✅ 全ドラム音（50+種類）自動対応
- ✅ GitHub サンプルコード完全実行
- ✅ エフェクト処理（lpf, delay, reverb等）自動対応
- ✅ 本物のStrudel体験

---

## 2. 実装フェーズ

### Phase 1: source_of_strudel 更新
**予想時間**: 5分  
**目的**: 最新の Strudel Original コードを取得

```bash
# 既存ディレクトリ削除
rm -r source_of_strudel

# 新規クローン
git clone https://codeberg.org/uzu/strudel source_of_strudel

# バージョン確認
cat source_of_strudel/package.json | grep "version"
```

**出力**: `source_of_strudel/` に最新コード

---

### Phase 2: モジュール構成調査
**予想時間**: 30分  
**目的**: Strudel Original の npm パッケージ構成を理解

**調査項目**:
1. `source_of_strudel/package.json` の主要 dependencies
2. モジュール構成:
   - `@strudel/core` - パターン処理、Audio Context
   - `@strudel/webaudio` - Web Audio 統合
   - `@strudel/samples` - ドラムライブラリ
   - `@strudel/tone` - Tone.js 統合（オプション）
   - `@strudel/midi` - MIDI処理（オプション）
3. 各モジュールの API ドキュメント

**出力**: モジュール構成図、API 仕様書

---

### Phase 3: フロントエンド npm パッケージ追加
**予想時間**: 10分  
**目的**: Strudel Original を npm 依存関係に追加

**手順**:
```bash
cd frontend

# Strudel パッケージ追加
npm install @strudel/core @strudel/webaudio @strudel/samples

# 確認
npm list | grep strudel
```

**出力**: `frontend/package.json` に Strudel パッケージ、node_modules/ に インストール

---

### Phase 4: フロントエンド リファクタリング
**予想時間**: 1-2時間  
**目的**: 独自の音生成システムを Strudel Original に置き換え

**4.1 Audio Engine 置き換え**
- [ ] `StrudelSynthesizer` クラス削除
- [ ] `initAudio()` → Strudel Original の Audio Context を使用
- [ ] `soundFuncs` オブジェクト削除 → Strudel Sampler を使用

**4.2 Pattern Processing 統合**
```javascript
// Before (独自実装)
function playStrudelPattern(code) {
    // 手作業でパターン検出・生成
}

// After (Strudel Original)
import { evaluate } from '@strudel/core'
import { webAudio } from '@strudel/webaudio'

function playStrudelPattern(code) {
    const pattern = evaluate(code)
    pattern.play() // Strudel が全て処理
}
```

**4.3 Effects Chain 統合**
- Strudel の effect API を自動使用
- lpf, delay, reverb, distortion等 自動対応

**4.4 Playback Control 更新**
```javascript
// Before
activeIntervals = [setInterval(...), setInterval(...), ...]

// After
let player = pattern.play()
// player.stop() で完全停止
```

**出力**: 完全に Strudel Original ベースの `frontend/src/main.js`

---

### Phase 5: テスト & 検証
**予想時間**: 30分  
**目的**: 全機能が正常に動作することを確認

**5.1 基本テスト**
```javascript
// テストパターン
s("bd sd hh rim rd")
s("bd:<1 2 3>").s("crate")
```
- [ ] 全ドラム音再生確認
- [ ] パターン実行テスト
- [ ] 音質・タイミング検証

**5.2 GitHub サンプルテスト**
```javascript
// "coastline" @by eddyflux
samples('github:eddyflux/crate')
setcps(.75)
// ... 完全なパターン ...
```
- [ ] 複雑な構文対応確認
- [ ] エフェクト処理検証
- [ ] 全ドラム音再生確認

**5.3 既存機能テスト**
- [ ] BroadcastChannel 同期が機能すること
- [ ] WebSocket 接続確立
- [ ] 音声停止機能

**5.4 パフォーマンス測定**
```bash
# バンドルサイズ確認
npm run build
# dist/ サイズ確認 (target: < 1MB gzipped)

# 初期ロード時間測定
# Chrome DevTools Performance タブ
```

**出力**: テスト結果レポート、パフォーマンス メトリクス

---

### Phase 6: ドキュメント & コミット
**予想時間**: 20分  
**目的**: 変更を記録し、リポジトリに統合

**6.1 ドキュメント更新**
- [ ] `README.md` に Strudel Original 統合を記載
- [ ] `CONTRIBUTING.md` に新しいアーキテクチャ説明
- [ ] `frontend/README.md` を作成（フロントエンド構成）

**6.2 テスト結果ドキュメント**
- [ ] `TEST_RESULTS.md` に統合テスト結果追加
- [ ] スクリーンショット撮影（images/ に保存）
- [ ] パフォーマンス メトリクス記録

**6.3 Git コミット (複数段階)**
```bash
# コミット 1: source_of_strudel 更新
git add source_of_strudel/
git commit -m "feat: update source_of_strudel to latest Strudel Original"

# コミット 2: npm パッケージ追加
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add Strudel Original npm dependencies (@strudel/core, @strudel/webaudio, @strudel/samples)"

# コミット 3: フロントエンド リファクタリング
git add frontend/src/main.js
git commit -m "refactor: replace custom audio engine with Strudel Original integration

- Remove StrudelSynthesizer class
- Integrate @strudel/core pattern engine
- Use @strudel/webaudio for audio context
- Full drum library and effects support (50+ sounds)
- Automatic pattern processing and effects handling"

# コミット 4: テスト & ドキュメント
git add TEST_RESULTS.md README.md CONTRIBUTING.md frontend/README.md images/
git commit -m "test: verify Strudel Original integration and document results

- Test all drum sounds (50+ samples)
- Verify GitHub sample patterns ('coastline' etc)
- Confirm effects processing
- Measure performance metrics
- Update documentation"

# Push
git push origin main
```

**出力**: 完成したリポジトリ、GitHub にアップロード

---

## 3. 実装タイムライン

| Phase | 内容 | 難易度 | 予想時間 | 状態 |
|-------|------|--------|----------|------|
| 1 | source_of_strudel 更新 | 低 | 5分 | ⏳ |
| 2 | モジュール調査 | 中 | 30分 | ⏳ |
| 3 | npm 統合 | 低 | 10分 | ⏳ |
| 4 | フロントエンド リファクタリング | 高 | 1-2時間 | ⏳ |
| 5 | テスト & 検証 | 中 | 30分 | ⏳ |
| 6 | ドキュメント & コミット | 低 | 20分 | ⏳ |

**合計**: 2.5-3時間

---

## 4. リスク & 対策

| リスク | 可能性 | 対策 |
|--------|--------|------|
| バンドルサイズ増加 (3MB+) | 中 | Tree-shaking、lazy loading、非必須 Effect 除外 |
| 依存関係競合 | 低 | npm の version pinning で固定 |
| ブラウザ互換性 | 低 | Chrome/Firefox/Safari テスト |
| パフォーマンス低下 | 中 | CLS, LCP, FID モニタリング、CPU プロファイリング |
| Strudel API 変更 | 低 | source_of_strudel の CHANGELOG 確認 |

---

## 5. 成功基準

✅ 全ドラム音（50+種類）が再生可能  
✅ GitHub サンプルコード（"coastline" 等）完全実行  
✅ エフェクト処理が自動対応（lpf, delay, reverb等）  
✅ BroadcastChannel 同期機能が維持  
✅ バンドルサイズ < 1MB (gzipped)  
✅ テスト結果ドキュメント完成  
✅ GitHub にアップロード完了  
✅ パフォーマンス メトリクス記録  

---

## 6. 参考資料

- **Strudel Original**: https://codeberg.org/uzu/strudel
- **Strudel 公式**: https://strudel.cc
- **npm Packages**: https://www.npmjs.com/search?q=%40strudel
- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

**次ステップ**: Phase 1 実行開始
