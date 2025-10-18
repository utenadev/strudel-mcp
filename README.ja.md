# Strudel MCP

このプロジェクトは、[Strudel](https://strudel.cc/) (Webブラウザ上で動作するライブコーディング環境) を [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) を介して操作するためのサーバーです。

LLM (大規模言語モデル) が、自然言語で音楽の指示を出すことで、Strudel REPL で音楽を生成・演奏・変更することができます。

## 機能と目的

- **LLMとの連携**: LLM が自然言語で音楽の指示を出し、このサーバーがそれを解釈して Strudel に送信します。
- **Strudel REPLの制御**: LLM からの指示に従って、Strudel REPL でコードを実行し、音楽を生成・演奏します。
- **双方向通信**: Strudel REPL からの応答（現在のコードなど）を LLM に返します。
- **ライブコーディング支援**: LLM と Strudel を組み合わせることで、より直感的で創造的なライブコーディング体験を提供します。
- **Context7統合**: 外部ドキュメントサービスContext7と連携し、Strudelの最新ドキュメント取得を可能にします。
- **Chrome DevTools連携**: ブラウザベースのStrudel REPLのスクリーンショット撮影や性能分析を行えます。

## 概要

このプロジェクトには、Node.js で実装された MCP サーバー (`server-node`) と、Go 言語で実装されたレガシー MCP サーバー (`server-go`) があり、現在は Node.js サーバーが推奨されています。また、Web ブラウザ上で動作する Strudel REPL (`frontend`) と連携します。

- **`server-node` (Node.jsサーバー - 推奨)**:
    - Node.js + TypeScript で実装された MCP サーバー。
    - LLM からのリクエストを処理し、Strudel REPL との通信を担当。
    - WebSocket を使用して `frontend` と通信します。
    - Express + Jest で構築されています。

- **`server-go` (Goサーバー - レガシー)**:
    - Go 言語で実装された MCP サーバー。
    - LLM からのリクエストを処理し、Strudel REPL との通信を担当。
    - WebSocket を使用して `frontend` と通信します。
    - `github.com/metoro-io/mcp-golang` ライブラリを使用して実装されています。
    - 将来的に非推奨（フェーズアウト）される予定です。

- **`frontend` (WebベースのStrudel REPL)**:
    - Strudel の Web ベースのライブコーディング環境です。
    - `server-node` または `server-go` との WebSocket 接続を受け入れ、コードを実行します。
    - 現在のコードをサーバーに送信する機能も備えています。

## 使用方法 (概要)

1.  **`server-node` サーバーを起動 (推奨)**:
    - `server-node` ディレクトリで `npm install` し、`npm run dev` で起動します。
    - サーバーは、標準入出力 (stdio) 経由で LLM クライアントと通信します。
    - 内部で WebSocket サーバーも起動し、`frontend` との通信を待ち受けます。

2.  **Strudel フロントエンドを起動**:
    - `frontend` ディレクトリで、Webベースの Strudel インターフェースを起動します。
    - フロントエンドは `server-node` または `server-go` サーバーに WebSocket 接続します。

3.  **LLM クライアントから操作**:
    - LLM クライアント (例: Qwen Code) は、`server-node` サーバーに接続し、MCP プロトコルで通信します。
    - `execute_strudel_code` ツールを呼び出して、Strudel コードを実行します。
    - `get_current_pattern` ツールを呼び出して、現在の Strudel コードを取得します。
    - `describe_pattern` ツールを呼び出して、Strudel コードの内容を自然言語で説明します。
    - `suggest_modification` ツールを呼び出して、現在のコードを修正する提案を取得します。
    - `get_strudel_docs` ツールを呼び出して、Context7経由でStrudelの最新ドキュメントを取得します。
    - `take_page_snapshot` ツールでブラウザのスクリーンショットを撮影します。
    - `analyze_performance` ツールでページのパフォーマンスを分析します。
    - `chrome_dev_tools` ツールでChrome DevToolsの各種機能にアクセスします。

## サーバー選択

**Node.js サーバー (推奨)**
```bash
cd server-node
npm install
npm run dev
```

**Go サーバー (レガシー - 将来的にフェーズアウト予定)**
```bash
cd server-go
go run main.go
```

## ディレクトリ構造

- `server-node/`: Node.js + TypeScript によるサーバー実装
  - `src/index.ts` 等: MCPサーバーのメイン実装（TypeScript）
- `server-go/`: Go によるレガシーサーバー実装
  - `main.go`: Go MCPサーバーの実装
  - `websocket_server.go`: Go WebSocketサーバーの実装
- `frontend/`: Webフロントエンド実装（ブラウザベースのインターフェース）
- `source_of_strudel/`: 元の Strudel ソースコード参照 (git submodule)
- `my/`: プロジェクトのメタ情報やタスク管理用
- `openspec/`: OpenAPI/MCP仕様関連ファイル

## 利用可能なMCPツール

### 基本機能
- `execute_strudel_code`: Strudelコードを実行
- `get_current_pattern`: 現在のコードを取得

### 機能拡張
- `describe_pattern`: コードの自然言語説明
- `suggest_modification`: 修正提案
- `get_strudel_docs`: Context7経由でドキュメント取得

### 開発・デバッグ機能
- `take_page_snapshot`: ページのスクリーンショット撮影
- `analyze_performance`: パフォーマンス分析
- `chrome_dev_tools`: Chrome DevTools機能アクセス

## ライセンス

このプロジェクトのライセンスは、Strudel のライセンスに準拠します。詳細は `LICENSE` ファイルを参照してください.