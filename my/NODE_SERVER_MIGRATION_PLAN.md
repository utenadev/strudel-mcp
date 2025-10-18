# Node.js サーバー移行計画

**作成日**: 2025-10-18  
**目的**: Go MCP サーバーを Node.js + TypeScript に段階的に移行  
**方針**: Go コード保持しながら平行運用、段階的廃止

---

## 1. ディレクトリ構成設計

### 現在の構造
```
strudel-mcp/
├── frontend/
├── main.go / websocket_server.go
├── test/ (統合テスト)
└── ...
```

### 新しい構造
```
strudel-mcp/
├── frontend/                    (Vite フロントエンド)
│   ├── src/
│   │   ├── main.js
│   │   ├── style.css
│   │   └── main_backup.js
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── tsconfig.json
│
├── server-node/                 (NEW - Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── index.ts             (メインエントリー)
│   │   ├── server.ts            (Express 初期化)
│   │   ├── mcp/
│   │   │   ├── handler.ts       (MCP プロトコルハンドラ)
│   │   │   ├── tools.ts         (MCP ツール定義)
│   │   │   └── types.ts         (MCP 型定義)
│   │   ├── websocket/
│   │   │   ├── manager.ts       (WebSocket コネクション管理)
│   │   │   └── handlers.ts      (WebSocket イベントハンドラ)
│   │   ├── strudel/
│   │   │   ├── executor.ts      (Strudel パターン実行)
│   │   │   └── types.ts         (Strudel 関連型)
│   │   └── utils/
│   │       ├── logger.ts        (ロギング)
│   │       └── config.ts        (設定管理)
│   ├── test/
│   │   ├── mcp.test.ts          (MCP プロトコルテスト)
│   │   ├── websocket.test.ts    (WebSocket テスト)
│   │   └── integration.test.ts  (統合テスト)
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── .env.example
│
├── server-go/                   (LEGACY - 段階的廃止予定)
│   ├── main.go
│   ├── websocket_server.go
│   ├── test/
│   │   └── websocket_test.go
│   └── go.mod/go.sum
│
├── source_of_strudel/           (git submodule)
│
├── test/                        (LEGACY - 統合テスト)
│   ├── test-mcp.js              (移動予定)
│   ├── test-websocket.html
│   └── test-results/
│
├── my/                          (ドキュメント)
│   ├── NODE_SERVER_MIGRATION_PLAN.md
│   ├── STRUDEL_INTEGRATION_PLAN.md
│   ├── STRUDEL_MODULES_ANALYSIS.md
│   └── PHASE_4_REFACTORING_GUIDE.md
│
├── images/
│   └── (テスト結果スクリーンショット)
│
├── .gitignore                   (更新)
├── .gitmodules
├── README.md                    (更新)
└── package.json                 (ルートレベル - オプション)
```

---

## 2. 実装フェーズ

### Phase 1: ディレクトリ構成変更 (30分)
**目的**: リポジトリ構造を新しい形に変更

#### Step 1.1: 既存ファイル整理
```bash
# server-go/ ディレクトリ作成
mkdir server-go

# Go ファイルを移動
mv main.go server-go/
mv websocket_server.go server-go/
mv go.mod go.sum server-go/

# テストファイルを移動
mkdir -p server-go/test
mv test/*websocket* server-go/test/ (該当ファイルあれば)
```

#### Step 1.2: server-node/ スケルトン作成
```bash
mkdir -p server-node/{src/{mcp,websocket,strudel,utils},test}
touch server-node/package.json
touch server-node/tsconfig.json
touch server-node/jest.config.js
touch server-node/.env.example
```

#### Step 1.3: git 整理
- .gitignore 更新: server-node/node_modules, server-node/dist
- .gitignore: server-go/node_modules (Go 用)
- git add / commit

**出力**: リポジトリ構造変更完了

---

### Phase 2: Node.js MCP サーバー実装 (3-4時間)

#### Step 2.1: プロジェクト初期化 (15分)
**server-node/package.json**
```json
{
  "name": "strudel-mcp-server",
  "version": "1.0.0",
  "description": "Strudel MCP WebSocket Server (Node.js)",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/ws": "^8.5.4",
    "@types/node": "^20.0.0",
    "@types/jest": "^29.5.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "eslint": "^8.40.0"
  }
}
```

**server-node/tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

#### Step 2.2: Express + WebSocket 基本実装 (1時間)

**server-node/src/index.ts**
```typescript
import { createServer } from './server'
import { logger } from './utils/logger'
import { config } from './utils/config'

async function main() {
  try {
    const app = createServer()
    const PORT = config.port || 8081

    app.listen(PORT, () => {
      logger.info(`🎵 Strudel MCP Server running on port ${PORT}`)
      logger.info(`WebSocket: ws://localhost:${PORT}/ws`)
    })
  } catch (error) {
    logger.error('Server startup failed:', error)
    process.exit(1)
  }
}

main()
```

**server-node/src/server.ts**
```typescript
import express from 'express'
import { WebSocketManager } from './websocket/manager'
import { MCPHandler } from './mcp/handler'

export function createServer() {
  const app = express()
  
  app.use(express.json())
  
  // CORS ヘッダ
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
    res.header('Access-Control-Allow-Headers', 'Content-Type')
    next()
  })

  // WebSocket アップグレード対応
  const server = require('http').createServer(app)
  const wsManager = new WebSocketManager(server)
  const mcpHandler = new MCPHandler()

  // REST API エンドポイント
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/api/strudel/docs', (req, res) => {
    res.json(mcpHandler.getDocs())
  })

  // WebSocket イベント設定
  wsManager.on('connect', (ws, clientId) => {
    logger.info(`Client connected: ${clientId}`)
  })

  wsManager.on('message', (ws, message, clientId) => {
    mcpHandler.handleMessage(message, clientId)
  })

  wsManager.on('disconnect', (clientId) => {
    logger.info(`Client disconnected: ${clientId}`)
  })

  return server
}
```

**server-node/src/websocket/manager.ts**
```typescript
import { WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'

export class WebSocketManager extends EventEmitter {
  private wss: WebSocketServer
  private clients: Map<string, any> = new Map()

  constructor(server: any) {
    super()
    this.wss = new WebSocketServer({ server })
    this.setupHandler()
  }

  private setupHandler() {
    this.wss.on('connection', (ws) => {
      const clientId = uuidv4()
      this.clients.set(clientId, ws)

      ws.on('message', (data: string) => {
        this.emit('message', ws, data, clientId)
      })

      ws.on('close', () => {
        this.clients.delete(clientId)
        this.emit('disconnect', clientId)
      })

      ws.on('error', (error) => {
        logger.error(`WebSocket error (${clientId}):`, error)
      })

      this.emit('connect', ws, clientId)
    })
  }

  broadcast(message: string) {
    this.clients.forEach((ws) => {
      if (ws.readyState === 1) { // OPEN
        ws.send(message)
      }
    })
  }

  send(clientId: string, message: string) {
    const ws = this.clients.get(clientId)
    if (ws && ws.readyState === 1) {
      ws.send(message)
    }
  }
}
```

**server-node/src/mcp/handler.ts**
```typescript
import { MCPTools } from './tools'

export class MCPHandler {
  private tools: MCPTools

  constructor() {
    this.tools = new MCPTools()
  }

  handleMessage(message: string, clientId: string) {
    try {
      const parsed = JSON.parse(message)
      const { method, params } = parsed

      switch (method) {
        case 'initialize':
          return this.tools.initialize(params)
        case 'execute_strudel_code':
          return this.tools.executeStrudelCode(params)
        case 'get_current_pattern':
          return this.tools.getCurrentPattern(params)
        default:
          logger.warn(`Unknown method: ${method}`)
      }
    } catch (error) {
      logger.error('Message handling error:', error)
    }
  }

  getDocs() {
    return this.tools.getDocs()
  }
}
```

**server-node/src/mcp/tools.ts**
```typescript
export class MCPTools {
  private currentPattern: string = ''

  initialize(params: any) {
    return {
      status: 'initialized',
      version: '1.0.0',
      capabilities: ['execute_strudel_code', 'get_current_pattern']
    }
  }

  executeStrudelCode(params: { code: string }) {
    const { code } = params
    this.currentPattern = code
    return {
      status: 'executed',
      pattern: code,
      timestamp: new Date().toISOString()
    }
  }

  getCurrentPattern(params: any) {
    return {
      pattern: this.currentPattern,
      timestamp: new Date().toISOString()
    }
  }

  getDocs() {
    return {
      tools: [
        {
          name: 'execute_strudel_code',
          description: 'Execute Strudel pattern code',
          parameters: {
            code: 'string - Strudel pattern code'
          }
        },
        {
          name: 'get_current_pattern',
          description: 'Get currently executing pattern'
        }
      ]
    }
  }
}
```

**server-node/src/utils/logger.ts**
```typescript
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, data || '')
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error || '')
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, data || '')
  },
  debug: (message: string, data?: any) => {
    if (process.env.DEBUG) {
      console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, data || '')
    }
  }
}
```

**server-node/src/utils/config.ts**
```typescript
export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 8081,
  host: process.env.HOST || 'localhost',
  env: process.env.NODE_ENV || 'development',
  debug: process.env.DEBUG === 'true'
}
```

#### Step 2.3: テストフレームワーク設定 (30分)

**server-node/jest.config.js**
```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true
}
```

**server-node/.env.example**
```
PORT=8081
HOST=localhost
NODE_ENV=development
DEBUG=false
```

#### Step 2.4: MCP プロトコル完全実装 (1.5時間)

**server-node/src/mcp/types.ts**
```typescript
export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, any>
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: {
    code: number
    message: string
  }
}

export interface Tool {
  name: string
  description: string
  inputSchema?: Record<string, any>
}
```

#### Step 2.5: エラーハンドリング・ロギング (30分)

**server-node/src/utils/errors.ts**
```typescript
export class MCPError extends Error {
  constructor(public code: number, message: string) {
    super(message)
    this.name = 'MCPError'
  }
}

export const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
}
```

**出力**: Node.js MCP サーバー完全実装完了

---

### Phase 3: テスト実装 (1.5時間)

#### Step 3.1: MCP プロトコルテスト

**server-node/test/mcp.test.ts**
```typescript
import { MCPHandler } from '../src/mcp/handler'

describe('MCP Handler', () => {
  let handler: MCPHandler

  beforeEach(() => {
    handler = new MCPHandler()
  })

  test('should initialize', () => {
    const result = handler.handleMessage(
      JSON.stringify({ method: 'initialize' }),
      'test-client'
    )
    expect(result.status).toBe('initialized')
  })

  test('should execute Strudel code', () => {
    const code = 's("bd hh sd oh")'
    handler.handleMessage(
      JSON.stringify({ 
        method: 'execute_strudel_code',
        params: { code }
      }),
      'test-client'
    )
    const current = handler.handleMessage(
      JSON.stringify({ method: 'get_current_pattern' }),
      'test-client'
    )
    expect(current.pattern).toBe(code)
  })
})
```

#### Step 3.2: WebSocket テスト

**server-node/test/websocket.test.ts**
```typescript
import { WebSocketManager } from '../src/websocket/manager'
import WebSocket from 'ws'
import { Server as HTTPServer } from 'http'

describe('WebSocket Manager', () => {
  let manager: WebSocketManager
  let server: HTTPServer

  beforeEach(() => {
    server = new HTTPServer()
    manager = new WebSocketManager(server)
  })

  afterEach(() => {
    server.close()
  })

  test('should handle client connection', (done) => {
    manager.on('connect', (ws, clientId) => {
      expect(clientId).toBeDefined()
      done()
    })

    server.listen(8082, () => {
      new WebSocket('ws://localhost:8082')
    })
  })

  test('should broadcast messages', (done) => {
    manager.broadcast('test message')
    // クライアントが受信することを確認
    done()
  })
})
```

#### Step 3.3: 統合テスト

**server-node/test/integration.test.ts**
```typescript
import { createServer } from '../src/server'
import WebSocket from 'ws'

describe('Integration Tests', () => {
  let server: any

  beforeEach((done) => {
    server = createServer()
    server.listen(8083, done)
  })

  afterEach((done) => {
    server.close(done)
  })

  test('should handle WebSocket connection and MCP messages', (done) => {
    const ws = new WebSocket('ws://localhost:8083/ws')

    ws.on('open', () => {
      ws.send(JSON.stringify({
        method: 'execute_strudel_code',
        params: { code: 's("bd hh sd oh")' }
      }))
    })

    ws.on('message', (data) => {
      const response = JSON.parse(data)
      expect(response.status).toBe('ok')
      ws.close()
      done()
    })
  })
})
```

**出力**: 完全なテストスイート実装完了

---

### Phase 4: 既存テストの移動・統合 (30分)

#### Step 4.1: test/ ディレクトリ整理

```bash
# 統合テストファイルを server-node/ にコピー
cp test/test-mcp.js server-node/test/
cp test/test-websocket.html server-node/test/

# 古いテストは LEGACY マーク
mv test test/legacy
```

#### Step 4.2: テスト実行確認

```bash
cd server-node
npm run test
```

**出力**: すべてのテストが server-node/ 以下に統合・実行確認

---

### Phase 5: ドキュメント & 最終調整 (1時間)

#### Step 5.1: README 更新

**README.md - Server セクション**
```markdown
## サーバー

### Node.js サーバー (推奨)
```bash
cd server-node
npm install
npm run dev
```
WebSocket: ws://localhost:8081

### Go サーバー (レガシー)
```bash
cd server-go
go run main.go
```
レガシー実装。Node.js サーバーへの移行を推奨。
```

#### Step 5.2: .gitignore 更新

```
# server-node
server-node/node_modules/
server-node/dist/
server-node/.env
server-node/.env.local

# server-go (通常の Go パターン)
server-go/node_modules/
```

#### Step 5.3: Git コミット

```bash
git add -A
git commit -m "refactor: migrate server to Node.js + TypeScript

- Create server-node directory with Express + TypeScript
- Implement MCP protocol handler
- Add WebSocket manager
- Setup Jest testing framework
- Move test files to server-node/test
- Keep server-go as legacy
- Update README and .gitignore

Architecture:
- frontend/ (Vite)
- server-node/ (Express + TypeScript - NEW)
- server-go/ (Go - Legacy)
- source_of_strudel/ (git submodule)

All Node.js server tests: PASS
"
```

**出力**: リポジトリ構造完全移行完了、Git に記録

---

## 3. 実装スケジュール

| Phase | 項目 | 時間 | 優先度 |
|-------|------|------|--------|
| 1 | ディレクトリ構成変更 | 30分 | 🔴 高 |
| 2.1 | プロジェクト初期化 | 15分 | 🔴 高 |
| 2.2 | Express + WebSocket | 1時間 | 🔴 高 |
| 2.3 | テスト設定 | 30分 | 🟡 中 |
| 2.4 | MCP 実装 | 1.5時間 | 🔴 高 |
| 2.5 | エラーハンドリング | 30分 | 🟡 中 |
| 3 | テスト実装 | 1.5時間 | 🟡 中 |
| 4 | テスト移動・統合 | 30分 | 🟡 中 |
| 5 | ドキュメント・コミット | 1時間 | 🟡 中 |
| **合計** | | **6-7時間** | |

---

## 4. リスク & 対策

| リスク | 可能性 | 対策 |
|--------|--------|------|
| TypeScript コンパイルエラー | 中 | tsconfig 設定を正確に |
| WebSocket 通信の不具合 | 低 | ユニットテストで確認 |
| MCP プロトコル互換性 | 低 | 既存 Go 実装との比較テスト |
| Go サーバーとの競合 | 高 | ポート別運用、README で使い分け |
| 依存パッケージの脆弱性 | 中 | npm audit 定期実行 |

---

## 5. 動作確認チェックリスト

```
Phase 1: ディレクトリ構成
□ frontend/ ディレクトリ確認
□ server-node/ ディレクトリ確認
□ server-go/ ディレクトリ確認
□ test/ ファイル移動完了

Phase 2: Node.js サーバー
□ npm install 成功
□ npm run dev で起動確認
□ WebSocket 接続確認
□ http://localhost:8081/health 返答確認

Phase 3: テスト
□ npm run test 実行
□ 全テスト PASS
□ カバレッジ > 80%

Phase 4-5: 統合
□ フロントエンド ← → Node.js サーバー 通信確認
□ Strudel パターン実行確認
□ Go サーバーと平行運用確認
□ README ドキュメント正確
```

---

## 6. 今後の展望

### Phase 6 (将来)
- ✅ Node.js サーバー完全動作
- ➡️ Go サーバーを非推奨化
- ➡️ 3-6ヶ月後に Go コード削除

### Phase 7 (さらに先)
- ✅ Docker 化 (Node.js サーバー)
- ✅ pm2 / systemd デプロイメント
- ✅ CI/CD パイプライン (GitHub Actions)

---

**ステータス**: 計画完成、実装待機中  
**推定総時間**: 6-7時間  
**難易度**: Medium  
**リスク**: Low (Go コード保持のため)
