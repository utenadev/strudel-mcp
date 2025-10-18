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

	// Establish WebSocket connection
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
	
	// Start WebSocket server separately
	go func() {
		wsServer := NewWebSocketServer()
		wsServer.Start(*port)
	}()

	// Initialize MCP server
	server := mcp_golang.NewServer(stdio.NewStdioServerTransport())

	s := NewStrudelMcpServer()

	// Register execute_strudel_code tool
	err := server.RegisterTool("execute_strudel_code", "Execute JavaScript/Strudel code in Strudel REPL.", s.executeStrudelCode)
	if err != nil {
		log.Fatal(err)
	}

	// Register get_current_pattern tool
	err = server.RegisterTool("get_current_pattern", "Get the currently executing (or last executed) pattern code from Strudel REPL.", s.getCurrentPattern)
	if err != nil {
		log.Fatal(err)
	}

	// Register describe_pattern tool
	err = server.RegisterTool("describe_pattern", "Explain the given Strudel code content in natural language.", s.describePattern)
	if err != nil {
		log.Fatal(err)
	}

	// Register suggest_modification tool
	err = server.RegisterTool("suggest_modification", "Take current pattern and natural language modification request from user, and suggest modified code.", s.suggestModification)
	if err != nil {
		log.Fatal(err)
	}

	// Register get_strudel_docs tool
	err = server.RegisterTool("get_strudel_docs", "Get Strudel documentation. Access latest information through Context7.", s.getStrudelDocs)
	if err != nil {
		log.Fatal(err)
	}

	// Register take_page_snapshot tool
	err = server.RegisterTool("take_page_snapshot", "Take a screenshot of the current page. Uses Chrome DevTools.", s.takePageSnapshot)
	if err != nil {
		log.Fatal(err)
	}

	// Register analyze_performance tool
	err = server.RegisterTool("analyze_performance", "Analyze page performance. Uses Chrome DevTools performance analysis.", s.analyzePerformance)
	if err != nil {
		log.Fatal(err)
	}

	// Register chrome_dev_tools tool
	err = server.RegisterTool("chrome_dev_tools", "Access various Chrome DevTools functions.", s.chromeDevTools)
	if err != nil {
		log.Fatal(err)
	}

	// Start server
	if err := server.Serve(); err != nil {
		log.Fatal(err)
	}
}

func (s *StrudelMcpServer) executeStrudelCode(arguments ExecuteStrudelCodeArguments) (*mcp_golang.ToolResponse, error) {
	// Process to send code to Strudel REPL
	// In practice, need to send via WebSocket or HTTP API to REPL
	s.currentCode = arguments.Code

	// Error check: ensure code is not empty
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
	// Fallback basic documentation
	docs := "# Strudel Documentation\n\n" +
		"Strudel is a JavaScript-based live coding environment that ports TidalCycles pattern language to the browser.\n\n" +
		"## Basic Patterns\n\n" +
		"### Rhythm Patterns\n" +
		"- s(\"bd hh sd oh\") - basic drum pattern\n" +
		"- s(\"kick snare*2 hat*8\") - multiple sounds\n" +
		"- s(\"bd(3,8) snare(4,8)\") - Euclidean rhythm\n\n" +
		"### Melody Patterns\n" +
		"- note(\"c e g b\") - basic melody\n" +
		"- n(\"0 2 4 6\").scale(\"C:major\") - scale notes\n\n" +
		"## Pattern Operations\n\n" +
		"### Transformations\n" +
		"- `.fast(2)` - 2x speed\n" +
		"- `.slow(2)` - 2x slower\n" +
		"- `.rev()` - reverse\n" +
		"- `.every(4, fast(2))` - every 4 cycles at 2x speed\n\n" +
		"### Combinations\n" +
		"- `.stack()` - layer patterns\n" +
		"- `.jux()` - alternate left/right\n" +
		"- `.append()` - concatenate patterns\n\n" +
		"## Advanced Features\n\n" +
		"### Sample Control\n" +
		"- `s(\"bd\").bank(\"RolandTR909\")` - specify sample bank\n" +
		"- `s(\"hh\").n(\"0 1 2 3\")` - sample variations\n\n" +
		"### Effects\n" +
		"- `.lpf(1000)` - low-pass filter\n" +
		"- `.delay(0.5)` - delay effect\n" +
		"- `.room(0.3)` - reverb effect\n\n" +
		"## Special Syntax\n\n" +
		"- `<bd sd>` - alternation (each cycle)\n" +
		"- `[bd <hh sd>]` - nesting\n" +
		"- `bd*3` - repetition\n" +
		"- `bd/2` - subdivision\n" +
		"- `~` - rest\n\n" +
		"More info: https://strudel.cc"
	
	if topic != "" {
		docs += "\n\nTopic: " + topic
	}

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
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("Page snapshot request sent")), nil
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
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("Performance analysis request sent")), nil
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
		return mcp_golang.NewToolResponse(mcp_golang.NewTextContent(fmt.Sprintf("Chrome DevTools action '%s' sent", arguments.Action))), nil
	}

	return mcp_golang.NewToolResponse(mcp_golang.NewTextContent("WebSocket connection not established")), fmt.Errorf("websocket connection not established")
}
