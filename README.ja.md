# Strudel MCP - 刷新版 (Bun + TypeScript)

## プロジェクト概要
LLMが自然言語から音楽パターンを生成し、ブラウザ上のStrudelエンジンで演奏するMCPサーバーシステム。

## アーキテクチャ

### バックエンド (`server-node`)
- **ランタイム**: Bun + TypeScript
- **役割**:
  - LLMとのMCP通信 (Stdio)
  - WebSocketサーバー (ポート8081)
  - フロントエンドへのパターン配信

### フロントエンド (`frontend`)
- **スタック**: Vite + React + TypeScript
- **役割**:
  - WebSocket経由でパターンを受信
  - Strudelパターンの表示
  - (次フェーズ) Strudel エンジン統合で音楽再生

## セットアップ

### 1. 依存関係のインストール
```bash
# ルートディレ clitorytで一括インストール
bun install
```

### 2. サーバービルド
```bash
cd server-node
bun run build
```

### 3. フロントエンドビルド
```bash
cd frontend
bun run build
```

## 実行方法

### 開発Mode
```bash
# サーバー起動 (別ターミナル)
cd server-node
bun run dev

# フロントエンド起動 (別ターミナル)
cd frontend
bun run dev
```

### 本番Mode
```bash
# サーバー起動
cd server-node
bun run start

# フロントエンドはdistをホスティング
cd frontend
bun run preview
```

## MCP利用方法

### Gemini CLI設定
`~/.gemini/settings.json` に追加:
```json
{
  "mcpServers": {
    "strudel-mcp": {
      "command": "bun",
      "args": ["run", "C:/workspace/strudel-mcp/server-node/dist/index.js"],
      "cwd": "C:/workspace/strudel-mcp/server-node"
    }
  }
}
```

### 利用可能ツール
- `execute_strudel_code`: Strudelパターンを実行し、WebSocket経由でフロントエンドに送信

### 使用例
```
LLM: "4beatのJazz風ドラムパターンを作って"
→ MCP toolが呼ばれ、Strudelコードが生成される
→ WebSocket経由でフロントエンドに送信
→ (将来) ブラウザで自動再生
```

## 現在の実装状況

### ✅ 完了
- [x] Bun + TypeScriptへの移行
- [x] MCP Server (stdio) の実装
- [x] WebSocketサーバーの実装
- [x] Reactフロントエンドの基本構造
- [x] WebSocket接続とパターン受信
- [x] プレミアムUIデザイン

### 🚧 次のステップ (Strudel エンジン本格統合)
- [ ] Strudelパッケージのビルド問題解決
- [ ] `@strudel/transpiler` でコードをコンパイル
- [ ] `@strudel/webaudio` で音声再生
- [ ] サンプルライブラリのロード (piano, drums, etc.)
- [ ] ジャンル別レシピの追加 (Jazz, EDM, Synth Pop)

## ディレクトリ構造
```
strudel-mcp/
├── server-node/          # MCP + WebSocketサーバー (Bun)
│   ├── src/
│   │   ├── index.ts      # エントリーポイント
│   │   ├── mcp/          # MCPサーバー実装
│   │   └── websocket/    # WebSocketマネージャー
│   └── dist/             # ビルド成果物
├── frontend/             # Webフロントエンド (Vite + React)
│   ├── src/
│   │   ├── App.tsx       # メインコンポーネント
│   │   └── App.css       # スタイル
│   └── dist/             # ビルド成果物
├── source_of_strudel/    # Strudelソースコード (submodule)
└── package.json          # ワークスペース設定
```

## トラブルシューティング

### Strudelビルドエラー
現在、Strudelの一部パッケージに依存関係の問題があります。
次フェーズで以下のアプローチを検討:
1. Strudelをnpmパッケージから直接インストール
2. 必要な機能のみを抽出して再実装
3. Strudel公式REPLをiframe統合

### WebSocket接続エラー
- サーバーが起動しているか確認: `bun run dev` (in server-node)
- ポート8081が空いているか確認

## ライセンス
このプロジェクトのライセンスは、Strudel のライセンスに準拠します。