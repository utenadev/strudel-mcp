# Strudel MCP - Model Context Protocol Integration for Strudel

LLMがStrudelパターンを生成・実行できるMCPサーバーシステム

## 概要

Strudel MCPは、Large Language Models (LLM) が [Strudel](https://strudel.cc/) - ライブコーディング音楽のためのJavaScriptライブラリ - と連携できるようにします。

- 自然言語コマンドでStrudelパターンを実行
- 現在のパターン状態を取得
- Context7統合によるStrudelドキュメント参照
- ジャンル別プリセット（Jazz, EDM, Synth-pop, Ambient, Hip-hop）

## アーキテクチャ

```
┌─────────────┐    MCP     ┌──────────────┐    WebSocket    ┌─────────────┐
│   LLM       │ ◄──────► │ strudel-mcp  │ ◄─────────────► │  Strudel    │
│  (Qwen/     │  Protocol │   Server     │   Communication │  Frontend   │
│  Gemini)    │           │ (Node.js)    │                 │  (React)    │
└─────────────┘           └──────────────┘                 └─────────────┘
```

### コンポーネント

- **server-node**: MCP + WebSocketサーバー (Bun/TypeScript)
- **frontend**: React + TypeScript + Vite ベースのWebアプリ
- **Strudel統合**: @strudel/core, @strudel/webaudio, @strudel/transpiler

## クイックスタート

### 必須要件
- **Bun (>=1.0)** - 推奨ランタイム
- WebSocket/Web Audio API対応ブラウザ

> **注意**: このプロジェクトはBunを使用することを推奨します。Node.jsでも動作しますが、パフォーマンスと開発体験の観点からBunの使用を強く推奨します。

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/utenadev/strudel-mcp.git
cd strudel-mcp

# サーバー依存関係をインストール
cd server-node
bun install
cd ..

# フロントエンド依存関係をインストール
cd frontend
bun install
cd ..
```

### 実行

```bash
# ターミナル1: サーバー起動
cd server-node
bun run dev

# ターミナル2: フロントエンド起動
cd frontend
bun run dev
```

### テスト

```bash
cd frontend
bun run test  # 23テスト
```

## 機能

### ローカルStrudel再生
- **iframe不要** - Web Audio APIで直接再生
- useStrudelフック（初期化、評価、再生、停止）
- WebSocket経由でLLMからパターンを自動受信・再生

### ジャンル別プリセット

| ジャンル | プリセット例 |
|---------|-------------|
| Jazz | Swing Groove, Jazz Ballad, Bebop Run |
| EDM | House Beat, Dubstep Drop, Trance Arp |
| Synth-pop | Retro Synth, New Wave |
| Ambient | Ambient Drone, Texture Pad |
| Hip-hop | Boom Bap, Trap Beat |

### MCPツール

- `execute_strudel_code` - Strudelパターンを実行
- `get_current_pattern` - 現在のパターンを取得
- `get_strudel_knowledge` - Strudelドキュメント参照

## プロジェクト構造

```
strudel-mcp/
├── server-node/               # Node.js MCPサーバー
│   ├── src/
│   │   ├── index.ts          # メインエントリ
│   │   ├── mcp/              # MCPプロトコルハンドラ
│   │   ├── websocket/        # WebSocketマネージャー
│   │   └── utils/            # ユーティリティ
│   ├── test/                 # サーバーテスト
│   └── package.json
├── frontend/                  # Reactフロントエンド
│   ├── src/
│   │   ├── App.tsx           # メインコンポーネント
│   │   ├── hooks/            # React hooks (useStrudel, useWebSocket)
│   │   ├── presets/          # ジャンル別プリセット
│   │   ├── types/            # TypeScript型定義
│   │   └── test/             # フロントエンドテスト
│   ├── vitest.config.ts
│   └── package.json
├── docs/                      # ドキュメント
└── source_of_strudel/         # Strudelソース参照 (git submodule)
```

## 技術スタック

- **ランタイム**: Bun (推奨)
- **バックエンド**: TypeScript + Express + @modelcontextprotocol/sdk
- **フロントエンド**: React + TypeScript + Vite
- **オーディオ**: Strudelパッケージ (@strudel/core, @strudel/webaudio, @strudel/transpiler)
- **通信**: WebSocketプロトコル
- **テスト**: Vitest + React Testing Library

## LLM設定

### Gemini CLI

`~/.gemini/settings.json`:
```json
{
  "mcpServers": {
    "strudel-mcp": {
      "command": "bun",
      "args": ["run", "dist/index.js"],
      "cwd": "/path/to/strudel-mcp/server-node"
    }
  }
}
```

### Claude Desktop / Qwen (Node.js使用時)

```json
{
  "mcpServers": {
    "strudel-mcp": {
      "command": "bun",
      "args": ["run", "dist/index.js"],
      "cwd": "/path/to/strudel-mcp/server-node"
    }
  }
}
```

> **推奨**: Bunを使用することで起動時間が短縮され、メモリ使用量も削減されます。

## トラブルシューティング

### WebSocket接続エラー
- サーバーが起動しているか確認
- ポート8081が使用可能か確認
- ファイアウォール設定を確認

### オーディオが再生されない
- ブラウザのオーディオ権限を確認
- ページをクリックしてオーディオコンテキストを初期化
- Web Audio API対応ブラウザを使用

## ライセンス

このプロジェクトはAGPL-3.0ライセンスの下で提供されます（Strudelプロジェクトと同様）。