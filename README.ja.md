# Strudel MCP

このプロジェクトは、[Strudel](https://strudel.cc/) (Webブラウザ上で動作するライブコーディング環境) を [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) を介して操作するためのサーバーです。

LLM (大規模言語モデル) が、自然言語で音楽の指示を出すことで、Strudel REPL で音楽を生成・演奏・変更することができます。

## 機能と目的

- **LLMとの連携**: LLM が自然言語で音楽の指示を出し、このサーバーがそれを解釈して Strudel に送信します。
- **Strudel REPLの制御**: LLM からの指示に従って、Strudel REPL でコードを実行し、音楽を生成・演奏します。
- **双方向通信**: Strudel REPL からの応答（現在のコードなど）を LLM に返します。
- **ライブコーディング支援**: LLM と Strudel を組み合わせることで、より直感的で創造的なライブコーディング体験を提供します。
- **組み込みドキュメント**: 外部依存のないStrudel知識ベースを内包し、LLMが常に最新の文法にアクセス可能です。

## 概要

このプロジェクトには、Node.js で実装された MCP サーバー (`server-node`) があり、Web ブラウザ上で動作する Strudel REPL (`frontend`) と連携します。

- **`server-node` (Node.jsサーバー - 推奨)**:
    - Node.js + TypeScript で実装された MCP サーバー。
    - LLM からのリクエストを処理し、Strudel REPL との通信を担当。
    - WebSocket を使用して `frontend` と通信します。
    - Express + Jest で構築されています。


    

- **`frontend` (WebベースのStrudel REPL)**:
    - Strudel の Web ベースのライブコーディング環境です。
    - `server-node` との WebSocket 接続を受け入れ、コードを実行します。
    - 現在のコードをサーバーに送信する機能も備えています。

## インストール方法

1. **リポジトリをクローン**:
   ```bash
   git clone https://github.com/utenadev/strudel-mcp.git
   cd strudel-mcp
   ```

2. **Node.js依存関係をインストール**:
   ```bash
   cd server-node
   npm install
   cd ..
   ```

3. **フロントエンド依存関係をインストール**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

## LLMクライアント別利用方法

### Qwen3-Coder + Qwen-code (MCP設定要)

プロジェクトルートに `.qwen/settings.json` を作成：

**本番環境（ビルド版）**:
```json
{
  "mcpServers": {
    "strudel-mcp": {
      "command": "node",
      "args": ["server-node/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**開発環境（npm dev）**:
```json
{
  "mcpServers": {
    "strudel-mcp": {
      "command": "npm", 
      "args": ["run", "dev"],
      "cwd": "server-node",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true"
      }
    }
  }
}
```

*このリポジトリに事前ビルド済み設定を提供：*
- `.qwen/settings.json` - 本番用
- `.qwen/settings.dev.json` - 開発用

*本番用ビルド: `cd server-node && npm run build`*

### Gemini CLI (MCP設定要)

`~/.gemini/settings.json`を設定：

```json
{
  "selectedAuthType": "gemini-api-key",
  "theme": "Dracula",
  "mcpServers": {
    "strudel-mcp": {
      "command": "node",
      "args": ["/path/to/strudel-mcp/server-node/dist/index.js"],
      "cwd": "/path/to/strudel-mcp/server-node"
    }
  }
}
```

*事前ビルド: `cd server-node && npm run build`*

*Gemini CLIで `/mcp` コマンドで確認*

### Claude Desktop (MCP設定要)

Claude Desktop設定：

1. Claude Desktop → 設定 → 開発者 → 設定編集 を開く
2. `mcpServers`に追加：

```json
{
  "mcpServers": {
    "strudel-mcp": {
      "command": "node",
      "args": ["/path/to/strudel-mcp/server-node/dist/index.js"],
      "cwd": "/path/to/strudel-mcp/server-node"
    }
  }
}
```

3. Claude Desktopを再起動
4. 新規チャットでツールが利用可能か確認

### GitHub Copilot (MCP設定要)

VS Code + GitHub Copilot (v1.99+)の場合：

1. 設定 → 拡張機能 → GitHub Copilot を開く
2. 「CopilotのMCPサーバー」ポリシーを有効化
3. GitHub MCPレジストリまたは手動設定を使用

```json
{
  "mcpServers": {
    "strudel-mcp": {
      "command": "node",
      "args": ["/path/to/strudel-mcp/server-node/dist/index.js"],
      "cwd": "/path/to/strudel-mcp/server-node"
    }
  }
}
```

**注**: `/path/to/strudel-mcp` を実際のリポジトリパスに置換

## 使用方法 (概要)

1.  **`server-node` サーバーを起動**:
    - `server-node` ディレクトリで `npm install` し、`npm run dev` で起動します。
    - サーバーは、標準入出力 (stdio) 経由で LLM クライアントと通信します。
    - 内部で WebSocket サーバーも起動し、`frontend` との通信を待ち受けます。

2.  **Strudel フロントエンドを起動**:
    - `frontend` ディレクトリで、Webベースの Strudel インターフェースを起動します。
    - フロントエンドは `server-node` サーバーに WebSocket 接続します。

3.  **LLM クライアントから操作**:
    - LLM クライアントは上記設定で `server-node` サーバーに接続し、MCP プロトコルで通信します。
    - `execute_strudel_code` ツールを呼び出して、Strudel コードを実行します。
    - `get_current_pattern` ツールを呼び出して、現在の Strudel コードを取得します。
    - `get_strudel_knowledge` ツールを呼び出して、組み込みのStrudelドキュメントを取得します。

## サーバー選択

**Node.js サーバー**
```bash
cd server-node
npm install
npm run dev
```



## ディレクトリ構造

- `server-node/`: Node.js + TypeScript によるサーバー実装
  - `src/index.ts` 等: MCPサーバーのメイン実装（TypeScript）

- `frontend/`: Webフロントエンド実装（ブラウザベースのインターフェース）
- `source_of_strudel/`: 元の Strudel ソースコード参照 (git submodule)
- `my/`: プロジェクトのメタ情報やタスク管理用
- `openspec/`: OpenAPI/MCP仕様関連ファイル

## 利用可能なMCPツール

### 核心機能
- `execute_strudel_code`: Strudelコードを実行
- `get_current_pattern`: 現在のパターンを取得
- `get_strudel_knowledge`: 組み込みStrudelドキュメント・知識ベース

#### get_strudel_knowledge 利用可能トピック
- `basics`: 基本文法、音名、基本操作
- `patterns`: 高度なパターン構文、ポリリズム
- `effects`: エフェクト、音色操作
- `troubleshooting`: よくある問題とLLM向けTips

## ライセンス

このプロジェクトのライセンスは、Strudel のライセンスに準拠します。詳細は `LICENSE` ファイルを参照してください.