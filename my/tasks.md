# Strudel MCP タスク状況

## 完了済み

- [x] Strudel REPLとの接続方法の調査と設計：WebSocketサーバーを介した双方向通信を採用することを決定
- [x] Go側WebSocketサーバーの実装 (`websocket_server.go`)
- [x] Go側MCPサーバーの基本構造実装 (`mcp-golang` を使用)
- [x] Go側MCPサーバーへのWebSocket接続実装 (`main.go`)
- [x] `execute_strudel_code` ツールの実装（Go側、WebSocket経由送信）
- [x] `get_current_pattern` ツールの実装（Go側、非同期チャネル経由応答待機に修正）
- [x] Go側MCPサーバーの`get_current_pattern`ツールの実装を確認・修正
- [x] Strudel REPL側の`execute_strudel_code`ツールの実装を確認
- [x] Strudel REPL側の`get_current_pattern`ツールの実装を確認
- [x] エラーハンドリングの強化
- [x] Strudel REPLのソースコードをstrudel-mcp配下にコピー
- [x] Strudelのライセンスを確認し、strudel-mcpに適用する
- [x] `describe_pattern` ツールの実装（コードの自然言語説明）
- [x] `suggest_modification` ツールの実装（修正提案機能）
- [x] `get_strudel_docs` ツールの実装（Context7統合）
- [x] WebSocketサーバーでのContext7リクエストハンドリング実装
- [x] `take_page_snapshot` ツールの実装（Chrome DevTools連携）
- [x] `analyze_performance` ツールの実装（パフォーマンス分析）
- [x] `chrome_dev_tools` ツールの実装（DevTools汎用アクセス）
- [x] WebSocketサーバーのping/pong機能による接続維持実装
- [x] CORS対応とWebSocketオリジンチェックの改善
- [x] frontendディレクトリでのWebベースインターフェース実装
- [x] コマンドライン引数でのWebSocket専用サーバー起動モード実装

## 未完了（残作業）

- [ ] `get_current_pattern` ツールのGo側実装の確認と修正
    - [ ] `readPump` goroutineによるメッセージ受信と `readChan` 送信の確認
    - [ ] `getCurrentPattern` 関数による応答受信と返答の確認
    - [ ] 応答時の `currentCode` 更新ロジックの確認
- [ ] `execute_strudel_code` ツールのStrudel側実装の確認
    - [ ] WebSocketメッセージ受信と `handleEval` によるコード実行の確認
    - [ ] `handleEval` 引数 (`shouldStop` など) の適切性確認
- [ ] `get_current_pattern` ツールのStrudel側実装の確認
    - [ ] `"GET_CURRENT_PATTERN"` メッセージ受信と `sendCurrentCode` 呼び出しの確認
    - [ ] `onValueChange` による `currentCode` state 更新の確認 (`handleCodeChange`)
- [ ] Context7統合の完全実装
    - [ ] Context7サービスとの実際の接続とドキュメント取得テスト
    - [ ] ドキュメントキャッシング機構の実装
    - [ ] エラーハンドリングとフォールバック処理の改善
- [ ] Chrome DevTools連携の強化
    - [ ] ブラウザインスタンスの自動起動と管理
    - [ ] DevToolsプロトコルの完全実装
    - [ ] スクリーンショットや性能分析結果のMCP応答への統合
- [ ] エラーハンドリングの強化
    - [ ] WebSocket接続/切断/エラー処理（再接続ロジックなど）
    - [ ] Go側・Strudel側でのコード実行エラー処理とLLMへの返答
    - [ ] Context7やChrome DevTools連携時のエラー処理
- [ ] 双方向通信のテスト (LLM→MCP→Go→WebSocket→Strudel→音再生 & Strudel→WebSocket→Go→MCP→応答)
- [ ] セキュリティ対策の再確認 (WebSocketオリジン制限、コード実行サンドボックス化など)

## 新しい検討事項

- [ ] Webベースインターフェース（frontend）の機能拡充
- [ ] 音声出力のブラウザ外での実現方法（Web Audio APIの活用）
- [ ] MCPクライアントとのより高度な連携（リアルタイムフィードバック等）
- [ ] パフォーマンス最適化とリソース管理