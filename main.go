package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gorilla/websocket"
	mcp_golang "github.com/metoro-io/mcp-golang"
	"github.com/metoro-io/mcp-golang/transport/stdio"
)

type Content struct {
	Code string `json:"code" jsonschema:"required,description=The Strudel code to execute"`
}

type ExecuteStrudelCodeArguments struct {
	Code string `json:"code" jsonschema:"required,description=The Strudel code to execute"`
}

type GetCurrentPatternArguments struct {
}

type DescribePatternArguments struct {
	Code string `json:"code" jsonschema:"required,description=The Strudel code to describe"`
}

type SuggestModificationArguments struct {
	CurrentCode string `json:"current_code" jsonschema:"required,description=The current Strudel code"`
	Request     string `json:"request" jsonschema:"required,description=The modification request"`
}

type GetStrudelDocsArguments struct {
	Topic string `json:"topic" jsonschema:"description=The specific topic to get documentation for (optional)"`
}

type TakePageSnapshotArguments struct {
}

type AnalyzePerformanceArguments struct {
}

type ChromeDevToolsArguments struct {
	Action string `json:"action" jsonschema:"description=The action to perform (screenshot, navigate, etc.)"`
	Url    string `json:"url" jsonschema:"description=URL for navigation actions (optional)"`
}

type StrudelMcpServer struct {
	currentCode   string
	websocketConn *websocket.Conn
}

func NewStrudelMcpServer() *StrudelMcpServer {
	s := &StrudelMcpServer{}

	// WebSocket接続を確立
	conn, _, err := websocket.DefaultDialer.Dial("ws://localhost:8081/ws?type=mcp", nil)
	if err != nil {
		log.Printf("WebSocket connection error: %v", err)
	} else {
		s.websocketConn = conn
		fmt.Println("Connected to WebSocket server as MCP client")
	}

	return s
}

func main() {
	// Parse command line flags
	var websocketOnly = flag.Bool("websocket", false, "Run only WebSocket server")
	var port = flag.String("port", "8081", "WebSocket server port")
	flag.Parse()

	if *websocketOnly || len(os.Args) > 1 && (os.Args[1] == "-websocket" || os.Args[1] == "--websocket") {
		// Run WebSocket server only
		wsServer := NewWebSocketServer()
		wsServer.Start(*port)
		return
	}

	// Run MCP server with WebSocket client connection
	fmt.Println("Starting Strudel MCP server...")
	
	// WebSocketサーバーを別途起動
	go func() {
		wsServer := NewWebSocketServer()
		wsServer.Start(*port)
	}()

	// MCPサーバーの初期化
	server := mcp_golang.NewServer(stdio.NewStdioServerTransport())

	s := NewStrudelMcpServer()

	// execute_strudel_code ツールの登録
	err := server.RegisterTool("execute_strudel_code", "渡された JavaScript/Strudel コードを Strudel REPL で実行します。", s.executeStrudelCode)
	if err != nil {
		log.Fatal(err)
	}

	// get_current_pattern ツールの登録
	err = server.RegisterTool("get_current_pattern", "現在 Strudel REPL で実行されている（または最後に実行された）パターンのコードを取得します。", s.getCurrentPattern)
	if err != nil {
		log.Fatal(err)
	}

	// describe_pattern ツールの登録
	err = server.RegisterTool("describe_pattern", "渡された Strudel コードの内容を自然言語で説明します。", s.describePattern)
	if err != nil {
		log.Fatal(err)
	}

	// suggest_modification ツールの登録
	err = server.RegisterTool("suggest_modification", "現在のパターンと、ユーザーからの自然言語での変更リクエストを受け取り、修正後のコードを提案します。", s.suggestModification)
	if err != nil {
		log.Fatal(err)
	}

	// get_strudel_docs ツールの登録
	err = server.RegisterTool("get_strudel_docs", "Strudelのドキュメントを取得します。Context7を通じて最新の情報にアクセスします。", s.getStrudelDocs)
	if err != nil {
		log.Fatal(err)
	}

	// take_page_snapshot ツールの登録
	err = server.RegisterTool("take_page_snapshot", "現在のページのスクリーンショットを撮ります。Chrome DevToolsを使用します。", s.takePageSnapshot)
	if err != nil {
		log.Fatal(err)
	}

	// analyze_performance ツールの登録
	err = server.RegisterTool("analyze_performance", "ページのパフォーマンスを分析します。Chrome DevToolsの性能分析機能を使用します。", s.analyzePerformance)
	if err != nil {
		log.Fatal(err)
	}

	// chrome_dev_tools ツールの登録
	err = server.RegisterTool("chrome_dev_tools", "Chrome DevToolsの各種機能にアクセスします。", s.chromeDevTools)
	if err != nil {
		log.Fatal(err)
	}

	// サーバーの起動
	if err := server.Serve(); err != nil {
		log.Fatal(err)
	}
}

func (s *StrudelMcpServer) executeStrudelCode(arguments ExecuteStrudelCodeArguments) (*mcp_golang.ToolResponse, error) {
	// Strudel REPL にコードを送信する処理
	// 実際にはWebSocketやHTTP API経由でREPLに送信する必要がある
	s.currentCode = arguments.Code

	// エラーチェック: コードが空でないことを確認
	if strings.TrimSpace(arguments.Code) == "" {
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("Code cannot be empty")), fmt.Errorf("code cannot be empty")
	}

	// セキュリティチェック: 危険なコード（例: システムコマンド）を含まないか確認
	// ここでは基本的なチェックを行う（より完全なチェックが必要）
	dangerousPatterns := []string{"exec", "spawn", "child_process", "require('fs')", "process.env", "eval", "new Function"}
	for _, pattern := range dangerousPatterns {
		if strings.Contains(strings.ToLower(arguments.Code), strings.ToLower(pattern)) {
			return mcp_golang.NewToolResponse(mcp_golang.NewTextContent(fmt.Sprintf("Potentially dangerous code detected: %s", pattern))), fmt.Errorf("potentially dangerous code detected: %s", pattern)
		}
	}

	// WebSocket経由でコードを送信
	if s.websocketConn != nil {
		err := s.websocketConn.WriteMessage(websocket.TextMessage, []byte(arguments.Code))
		if err != nil {
			return mcp_golang.NewToolResponse(mcp_golang.NewTextContent(err.Error())), err
		}
	} else {
		// WebSocket接続が確立するまで待機するか、エラーを返す
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("WebSocket connection not established")), fmt.Errorf("websocket connection not established")
	}

	fmt.Printf("Executing Strudel code:\n%s\n", arguments.Code)

	// 実行結果を返す
	return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("Code executed successfully")), nil
}

func (s *StrudelMcpServer) getCurrentPattern(arguments GetCurrentPatternArguments) (*mcp_golang.ToolResponse, error) {
	// 現在のパターンを取得する（実際に取得する方法はStrudelの実装による）
	// Strudel REPLとの接続方法に依存するため、WebSocket経由で取得する必要がある

	// 現在のコードを要求するメッセージを送信
	if s.websocketConn != nil {
		requestMessage := "GET_CURRENT_PATTERN"
		err := s.websocketConn.WriteMessage(websocket.TextMessage, []byte(requestMessage))
		if err != nil {
			return mcp_golang.NewToolResponse(mcp_golang.NewTextContent(err.Error())), err
		}

		// 応答を待機（実際には非同期で処理する必要がある）
		// 現在のところ同期的に処理
		_, response, err := s.websocketConn.ReadMessage()
		if err != nil {
			return mcp_golang.NewToolResponse(mcp_golang.NewTextContent(err.Error())), err
		}

		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent(string(response))), nil
	} else {
		// WebSocket接続が確立するまで待機するか、エラーを返す
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("WebSocket connection not established")), fmt.Errorf("websocket connection not established")
	}
}

func (s *StrudelMcpServer) describePattern(arguments DescribePatternArguments) (*mcp_golang.ToolResponse, error) {
	// Strudelコードを自然言語で説明する
	// 実際にはより高度な解析が必要だが、ここでは基本的な説明を行う

	description := "The provided code contains a Strudel pattern. It may include sound samples, note sequences, or other musical elements defined in Strudel's mini-notation or JavaScript functions. For a detailed explanation, please refer to the Strudel documentation."

	// より詳細な解析のためのロジックを追加できる
	// 例: パーサーを使用してコードを解析し、各要素を説明する

	return mcp_golang.NewToolResponse(mcp_golang.NewTextContent(description)), nil
}

func (s *StrudelMcpServer) suggestModification(arguments SuggestModificationArguments) (*mcp_golang.ToolResponse, error) {
	// 自然言語のリクエストに基づいて、Strudelコードを修正する提案を行う
	// これは高度なNLPとStrudelの知識が必要なため、現在は基本的な置換処理を行う

	// 例: "もっと速く"というリクエストがあれば、.fast()を追加する
	// 例: "もっと遅く"というリクエストがあれば、.slow()を追加する
	// 例: "ベースを太く"というリクエストがあれば、.s("sawtooth")などに変更する

	newCode := arguments.CurrentCode

	// シンプルなリクエスト処理の例
	if strings.Contains(strings.ToLower(arguments.Request), "速く") {
		// 現在のコードに.fast()がなければ追加
		if !strings.Contains(arguments.CurrentCode, ".fast(") {
			newCode += ".fast(2)"
		}
	} else if strings.Contains(strings.ToLower(arguments.Request), "遅く") {
		// 現在のコードに.slow()がなければ追加
		if !strings.Contains(arguments.CurrentCode, ".slow(") {
			newCode += ".slow(2)"
		}
	}

	// その他のリクエスト処理を追加できる

	return mcp_golang.NewToolResponse(mcp_golang.NewTextContent(newCode)), nil
}

func (s *StrudelMcpServer) getStrudelDocs(arguments GetStrudelDocsArguments) (*mcp_golang.ToolResponse, error) {
	// Context7からStrudelドキュメントを取得する実装
	var docs string
	
	// Context7にリクエストを送信するJSONを作成
	requestData := map[string]interface{}{
		"library": "strudel",
		"topic":   arguments.Topic,
	}
	
	// WebSocket経由でContext7にリクエスト
	context7Request := map[string]interface{}{
		"type": "context7_request",
		"action": "get_library_docs",
		"data":  requestData,
	}
	
	jsonData, err := json.Marshal(context7Request)
	if err != nil {
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("JSON serialize error")), err
	}
	
	if s.websocketConn != nil {
		err := s.websocketConn.WriteMessage(websocket.TextMessage, jsonData)
		if err != nil {
			// Context7接続が失敗した場合、基本ドキュメントを返す
			log.Printf("Context7 connection failed: %v, using fallback docs", err)
			docs = s.getFallbackDocs(arguments.Topic)
		} else {
			// Context7からの応答を待つ（同期的に処理）
			_, response, err := s.websocketConn.ReadMessage()
			if err != nil {
				log.Printf("Context7 response error: %v", err)
				docs = s.getFallbackDocs(arguments.Topic)
			} else {
				docs = string(response)
			}
		}
	} else {
		// WebSocket接続がない場合、基本ドキュメントを返す
		docs = s.getFallbackDocs(arguments.Topic)
	}

	return mcp_golang.NewToolResponse(mcp_golang.NewTextContent(docs)), nil
}

func (s *StrudelMcpServer) getFallbackDocs(topic string) string {
	// フォールバック用の基本ドキュメント
	docs := "# Strudel ドキュメント\n\n" +
		"StrudelはJavaScriptベースのライブコーディング環境で、TidalCyclesのパターン言語をブラウザに移植したものです。

## 基本パターン

### リズムパターン
- s("bd hh sd oh") - 基本ドラムパターン
- s("kick snare*2 hat*8") - 複数のサウンド
- s("bd(3,8) snare(4,8)") - ユークリッドリズム

### メロディーパターン  
- note("c e g b") - 基本メロディー
- n("0 2 4 6").scale("C:major") - スケール上の音階

## パターン操作

### 変形
- \`.fast(2)\` - 2倍速く
- \`.slow(2)\` - 2倍遅く  
- \`.rev()\` - 反転
- \`.every(4, fast(2))\` - 4回ごとに2倍速

### 組み合わせ
- \`.stack()\` - パターンを重ねる
- \`.jux()\` - 左右交互
- \`.append()\` - パターンを連結

## 高度な機能

### サンプル制御
- \`s("bd").bank("RolandTR909")\` - サンプルバンク指定
- \`s("hh").n("0 1 2 3")\` - サンプルバリエーション

### エフェクト
- \`.lpf(1000)\` - ローパスフィルター
- \`.delay(0.5)\` - ディレイ
- \`.room(0.3)\` - リバーブ

## 特殊構文

- \`<bd sd>\` - 交互選択（毎サイクル）
- \`[bd <hh sd>]\` - 入れ子構造
- \`bd*3\` - 繰り返し
- \`bd/2\` - 分割
- \`~\` - 休符

詳細な情報: https://strudel.cc`

現在地: ${topic ? "トピック: " + topic : "基本ドキュメント"}`

	return docs
}

func (s *StrudelMcpServer) takePageSnapshot(arguments TakePageSnapshotArguments) (*mcp_golang.ToolResponse, error) {
	// Chrome DevToolsでページスナップショットを撮る実装
	// WebSocketクライアントに指示を送信
	command := map[string]interface{}{
		"type": "chrome_devtools",
		"action": "screenshot",
	}

	jsonData, err := json.Marshal(command)
	if err != nil {
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("JSON serialize error")), err
	}

	if s.websocketConn != nil {
		err := s.websocketConn.WriteMessage(websocket.TextMessage, jsonData)
		if err != nil {
			return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("WebSocket error: "+err.Error())), err
		}
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("ページスナップショットリクエストを送信しました")), nil
	}

	return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("WebSocket connection not established")), fmt.Errorf("websocket connection not established")
}

func (s *StrudelMcpServer) analyzePerformance(arguments AnalyzePerformanceArguments) (*mcp_golang.ToolResponse, error) {
	// Chrome DevToolsで性能分析を行う実装
	command := map[string]interface{}{
		"type": "chrome_devtools",
		"action": "performance_analyze",
	}

	jsonData, err := json.Marshal(command)
	if err != nil {
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("JSON serialize error")), err
	}

	if s.websocketConn != nil {
		err := s.websocketConn.WriteMessage(websocket.TextMessage, jsonData)
		if err != nil {
			return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("WebSocket error: "+err.Error())), err
		}
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("性能分析リクエストを送信しました")), nil
	}

	return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("WebSocket connection not established")), fmt.Errorf("websocket connection not established")
}

func (s *StrudelMcpServer) chromeDevTools(arguments ChromeDevToolsArguments) (*mcp_golang.ToolResponse, error) {
	// Chrome DevToolsの各種機能にアクセスする実装
	command := map[string]interface{}{
		"type": "chrome_devtools",
		"action": arguments.Action,
	}

	if arguments.Url != "" {
		command["url"] = arguments.Url
	}

	jsonData, err := json.Marshal(command)
	if err != nil {
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("JSON serialize error")), err
	}

	if s.websocketConn != nil {
		err := s.websocketConn.WriteMessage(websocket.TextMessage, jsonData)
		if err != nil {
			return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("WebSocket error: "+err.Error())), err
		}
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent(fmt.Sprintf("Chrome DevToolsアクション '%s' を送信しました", arguments.Action))), nil
	}

	return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("WebSocket connection not established")), fmt.Errorf("websocket connection not established")
}
