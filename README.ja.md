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

このプロジェクトは、Go 言語で実装された MCP サーバー (`strudel-mcp`) と、Strudel REPL の2つの主要部分で構成されています。

- **`strudel-mcp` (Goサーバー)**:
    - MCP サーバーとして動作し、LLM クライアントからのリクエストを処理します。
    - LLM からのリクエストに応じて、Strudel REPL にコードを送信したり、現在のコードを取得したりします。
    - Strudel REPL との通信には、WebSocket を使用します。
    - `github.com/metoro-io/mcp-golang` ライブラリを使用して実装されています。

- **Strudel REPL**:
    - Strudel の Web ベースのライブコーディング環境です。
    - `strudel-mcp` サーバーからの WebSocket 接続を受け入れ、コードを実行します。
    - 現在のコードを `strudel-mcp` サーバーに送信する機能も備えています。
    - Strudel のソースコードは `strudel-repl/src` に配置されています。

## 使用方法 (概要)

1.  **`strudel-mcp` サーバーを起動**:
    - Go でコンパイルし、実行ファイルを起動します。
    - サーバーは、標準入出力 (stdio) 経由で LLM クライアントと通信します。
    - 内部で WebSocket サーバーも起動し、Strudel REPL との通信を待ち受けます。

2.  **Strudel REPL を起動**:
    - `strudel-repl` ディレクトリで、Strudel REPL をビルド・実行します。
    - REPL は `strudel-mcp` サーバーに WebSocket 接続します。

3.  **LLM クライアントから操作**:
    - LLM クライアント (例: Qwen Code) は、`strudel-mcp` サーバーに接続し、MCP プロトコルで通信します。
    - `execute_strudel_code` ツールを呼び出して、Strudel コードを実行します。
    - `get_current_pattern` ツールを呼び出して、現在の Strudel コードを取得します。
    - `describe_pattern` ツールを呼び出して、Strudel コードの内容を自然言語で説明します。
    - `suggest_modification` ツールを呼び出して、現在のコードを修正する提案を取得します。
    - `get_strudel_docs` ツールを呼び出して、Context7経由でStrudelの最新ドキュメントを取得します。
    - `take_page_snapshot` ツールでブラウザのスクリーンショットを撮影します。
    - `analyze_performance` ツールでページのパフォーマンスを分析します。
    - `chrome_dev_tools` ツールでChrome DevToolsの各種機能にアクセスします。

## ディレクトリ構造

- `.`: Go サーバーのソースコードと設定ファイル
  - `main.go`: MCPサーバーのメイン実装（ツール群を含む）
  - `websocket_server.go`: WebSocketサーバーの実装
- `strudel-repl/`: Strudel REPL のソースコード
- `frontend/`: Webフロントエンド実装（ブラウザベースのインターフェース）
- `source_of_strudel/`: Strudel のソースコードをコピーした元の場所 (参照用)
- `my/`: プロジェクトのメタ情報やタスク管理用

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

このプロジェクトのライセンスは、Strudel のライセンスに準拠します。詳細は `LICENSE` ファイルを参照してください。