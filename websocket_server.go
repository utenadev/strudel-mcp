package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// 全てのオリジンを許可（本番環境では適切に制限すること）
		return true
	},
}

type WebSocketServer struct {
	clients   map[string]*websocket.Conn
	broadcast chan []byte
	mu        sync.Mutex
}

func NewWebSocketServer() *WebSocketServer {
	return &WebSocketServer{
		clients:   make(map[string]*websocket.Conn),
		broadcast: make(chan []byte),
	}
}

func (s *WebSocketServer) Start(port string) {
	http.HandleFunc("/ws", s.handleConnections)

	fmt.Printf("WebSocket server starting on :%s\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func (s *WebSocketServer) handleConnections(w http.ResponseWriter, r *http.Request) {
	// Enable CORS for all origins
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer ws.Close()

	clientType := r.URL.Query().Get("type")
	if clientType != "mcp" && clientType != "strudel" {
		log.Printf("Invalid client type: %s", clientType)
		ws.WriteMessage(websocket.TextMessage, []byte("ERROR: Invalid client type. Use ?type=mcp or ?type=strudel"))
		return
	}

	s.mu.Lock()
	// Close existing connection of the same type if exists
	if existingWs, exists := s.clients[clientType]; exists && existingWs != ws {
		existingWs.Close()
		delete(s.clients, clientType)
	}
	s.clients[clientType] = ws
	s.mu.Unlock()

	fmt.Printf("New %s client connected from %s\n", clientType, ws.RemoteAddr())

	// Set read deadline and ping/pong for connection health
	ws.SetReadLimit(512 * 1024) // 512KB max message size
	ws.SetReadDeadline(time.Now().Add(60 * time.Second))
	ws.SetPongHandler(func(string) error {
		ws.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	// Start ping routine to keep connection alive
	go func() {
		ticker := time.NewTicker(54 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := ws.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	}()

	// Message forwarding loop
	for {
		_, message, err := ws.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error for %s: %v", clientType, err)
			} else {
				fmt.Printf("Client disconnected: %s (%v)\n", clientType, err)
			}
			s.mu.Lock()
			delete(s.clients, clientType)
			s.mu.Unlock()
			break
		}

		// Handle received message
		fmt.Printf("Received message from %s: %s\n", clientType, string(message))

		// Check for special Context7 requests
		var messageData map[string]interface{}
		if json.Unmarshal(message, &messageData) == nil {
			if msgType, ok := messageData["type"]; ok {
				switch msgType {
				case "context7_request":
					// Handle Context7 requests
					s.handleContext7Request(messageData, clientType)
					continue
				case "context7_response":
					// Handle Context7 responses
					s.handleContext7Response(messageData, clientType)
					continue
				}
			}
		}

		// Forward to target client (mcp <-> strudel)
		var targetClientType string
		switch clientType {
		case "mcp":
			targetClientType = "strudel"
		case "strudel":
			targetClientType = "mcp"
		case "context7":
			targetClientType = "mcp"
		default:
			continue // Skip unknown client types
		}

		s.mu.Lock()
		if targetWs, ok := s.clients[targetClientType]; ok {
			if err := targetWs.WriteMessage(websocket.TextMessage, message); err != nil {
				fmt.Printf("Error forwarding message to %s: %v\n", targetClientType, err)
				// Clean up disconnected target
				delete(s.clients, targetClientType)
			} else {
				fmt.Printf("Forwarded message to %s: %s\n", targetClientType, string(message))
			}
		} else {
			fmt.Printf("Target client %s not available\n", targetClientType)
		}
		s.mu.Unlock()
	}
}

// Handle Context7 requests
func (s *WebSocketServer) handleContext7Request(messageData map[string]interface{}, clientType string) {
	action, ok := messageData["action"].(string)
	if !ok {
		fmt.Printf("Invalid Context7 request: missing action\n")
		return
	}

	switch action {
	case "get_library_docs":
		s.handleGetLibraryDocs(messageData, clientType)
	default:
		fmt.Printf("Unknown Context7 action: %s\n", action)
	}
}

// Handle Context7 responses
func (s *WebSocketServer) handleContext7Response(messageData map[string]interface{}, clientType string) {
	// Forward response to MCP client
	s.mu.Lock()
	if targetWs, ok := s.clients["mcp"]; ok {
		response, err := json.Marshal(messageData)
		if err != nil {
			fmt.Printf("Error marshaling Context7 response: %v\n", err)
		} else {
			targetWs.WriteMessage(websocket.TextMessage, response)
			fmt.Printf("Forwarded Context7 response to MCP client\n")
		}
	}
	s.mu.Unlock()
}

// Handle get library docs request
func (s *WebSocketServer) handleGetLibraryDocs(messageData map[string]interface{}, clientType string) {
	data, ok := messageData["data"].(map[string]interface{})
	if !ok {
		fmt.Printf("Invalid get_library_docs request: missing data\n")
		return
	}

	library, ok := data["library"].(string)
	if !ok {
		fmt.Printf("Invalid get_library_docs request: missing library\n")
		return
	}

	// For now, send a simulated response
	// In a real implementation, this would connect to actual Context7 service
	response := map[string]interface{}{
		"type": "context7_response",
		"action": "get_library_docs",
		"library": library,
		"success": true,
		"docs": fmt.Sprintf("# Enhanced %s Documentation\n\nThis is enhanced documentation fetched via Context7 integration.\n\n## Key Features\n- Real-time documentation\n- Advanced examples\n- Pattern analysis\n\n## Connected Features\n- Syntax highlighting\n- Error checking\n- Performance monitoring", library),
	}

	responseJson, err := json.Marshal(response)
	if err != nil {
		fmt.Printf("Error creating Context7 response: %v\n", err)
		return
	}

	// Send response back to the requesting client (MCP)
	s.mu.Lock()
	if targetWs, ok := s.clients["mcp"]; ok {
		targetWs.WriteMessage(websocket.TextMessage, responseJson)
		fmt.Printf("Sent Context7 docs response for library: %s\n", library)
	}
	s.mu.Unlock()
}
