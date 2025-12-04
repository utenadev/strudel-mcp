import { z } from 'zod';
import { PatternHistoryManager } from '../pattern/history';
import { SessionManager } from '../pattern/session';
import { PatternExportManager } from '../pattern/export';

// ツール実装インターフェース
export interface ToolImplementation {
  name: string;
  call(params: any): Promise<any>;
}

// MCP Tool型定義
export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}

// 共有のパターン状態と履歴管理
let currentPattern: string = '';
const patternHistory = new PatternHistoryManager();
const sessionManager = new SessionManager(patternHistory);
const exportManager = new PatternExportManager(patternHistory, sessionManager);

// Strudelドキュメント内包
const strudelKnowledge = {
  basics: {
    title: "Strudel Basics",
    content: `
# Strudel 基本文法

## サウンドパターン
- \`s("bd hh sd oh")\` - 基本ドラムパターン
- \`s("bd*2 hh*4")\` - 繰り返し構文
- \`s("[bd hh] sd")\` - シーケンス内グループ化

## 音名
- bd (bass drum), sd (snare drum), hh (hi-hat), oh (open hi-hat)
- rim (rimshot), conga, clap, cowbell, tamb
- cp (clave), rs (rimshot), lt (low tom), ht (high tom)

## 基本操作
- \`.fast(2)\` - 2倍速
- \`.slow(2)\` - 2倍遅く
- \`.rev()\` - 逆再生
- \`.gain(0.5)\` - 音量調整
`,
    examples: [
      "s('bd hh sd oh')", // 基本4拍
      "s('bd*2 hh*4').fast(2)", // 1小節で8回ドラム
      "s('[bd hh] sd oh').rev()", // 逆再生
      "s('bd sd, hh*4')", // ドラムとハイハット分離
      "s('bd hh*2 sd oh*2')", // 複合リズム
      "s('bd [hh hh] sd hh', 1/2)", // 2拍子
      "s('bd hh sd oh').gain(0.7)", // 音量調整
      "s('bd hh sd oh').slow(2)" // スロー
    ]
  },

  patterns: {
    title: "Advanced Patterns",
    content: `
# 高度なパターン構文

## ポリリズム
- \`s("bd sd, hh*4")\` - コンマで別トラック
- \`s("<bd hh> sd")\` - 山括弧で選択
- \`."<x@7 ~>/8>"\` - マスクパターン

## 時間操作
- \`.ply("<1 2 3>")\` - 重複
- \`.off(1/16, x=>x.speed(2))\` - オフセットと変換
- \`.every(4, x=>x.speed(2))\` - 定期的な変換

## 音楽的要素
- \`.note("c2 eb3 g3")\` - 音高指定
- \`.scale("minor")\` - スケール
- \`.chord("m")\` - コード
`,
    examples: [
      "s('bd sd, hh*8')", // 基本的なポリリズム
      "s('<bd!3 [bd ~ bd]> sd, hh*3')", // 確率的ドラム
      "s('bd:5,[~ <sd:1!3 sd:1(3,4,3)>], hh27(3,4,1)')", // 高度な変調
      "s('bd <hh sd> oh, <hh hh*2 hh*3>'),", // 選択と繰り返し
      "s('bd sd hh oh').every(4, x=>x.speed(2))", // 定期的加速
      "s('bd sd hh oh').ply(2)", // 重複再生
      "s('bd sd hh oh').off(1/16, s=>s.rev())", // オフセット+逆再生
      "s('bd sd hh oh').mask('<x@7 ~>/8')" // マスク処理
    ]
  },

  effects: {
    title: "Effects and Processing",
    content: `
# エフェクトと処理

## 空間系
- \`.room(0.5)\` - リバーブ
- \`.delay(0.3)\` - ディレイ
- \`.delayfeedback(0.5)\` - ディレイフィードバック
- \`.delaytime(0.125)\` - ディレイタイム

## 音色
- \`.bank("tr909")\` - サンプルバンク選択
- \`.s("piano")\` - 楽器指定
- \`.dec(0.4)\` - ディケイ
- \`.attack(0.1)\` - アタック

## 変換
- \`.mask("<x@7 ~>/8")\` - マスク
- \`.color('cyan')\` - 色（可視化用）
- \`.struct("t(4,8)")\` - 構造指定
`,
    examples: [
      "s('bd sd').room(.5).dec(.1)", // リバーブ基本
      "s('[bd <hh oh>]*2').bank('tr909').dec(.4)", // TR909音源
      "s('bd*2').mask('<x@7 ~>/8').gain(.8)", // マスク+音量
      "s('bd sd hh oh').delay(.3).delayfeedback(.5)", // ディレイ効果
      "s('bd sd hh oh').every(8, x=>x.fast(2).rev())", // 定期的変換
      "s('bd sd hh oh').room(.8).gain(.6).slow(1.5)", // 複合エフェクト
      "s('bd sd, hh*4').delay(.125).attack(.01)", // アタック調整
      "s('bd sd hh oh').struct('t(4,8)').gain(.7)" // 構造指定
    ]
  },

  troubleshooting: {
    title: "Common Issues & Tips",
    content: `
# よくある問題と解決策

## 音が出ない場合
1. ブラウザのオーディオ権限を確認
2. ユーザー操作後にaudioContextを起動
3. WebSocket接続状態を確認

## パターンが期待通り動かない
1. 括弧のネストを確認
2. \`.fast()\` や \`.slow()\` の順序
3. マスクパターンの構文

## パフォーマンス
- 過度な再帰は避ける
- サウンド数を適切に制限
- stop()で解放を忘れない

## LLM向けTips
- 複雑なパターンは段階的に構築
- まず基本パターンから始める
- エフェクトは後から追加する
- 常にplay可能なコードを生成
`,
    examples: [
      "# 音が鳴らない時のテスト:\ns('bd hh')",
      "# 段階的構築:\n# 1. 基本ドラム\ns('bd sd hh oh')\n# 2. ポリリズム追加\ns('bd sd, hh*4')\n# 3. エフェクト追加\ns('bd sd, hh*4').gain(0.7)",
      "# よくあるエラーの修正例:\n# × 壊れている: s([bd hh sd oh])\n# ✓ 正しい: s('[bd hh sd oh]')",
      "# パフォーマンス最適化例:\n# 高負荷パターン: s('bd*16 sd*16 hh*16 oh*16').fast(4)\n# 最適化後: s('bd sd hh oh').fast(2)",
      "# 実用的なビートパターン:\n# Hip-Hop: s('bd ~ sd hh*2, ~ oh*4')\n# Techno: s('bd*2 sd*2 hh*4', 1/4).fast(2)\n# Dub: s('bd ~ ~ sd', 1/2).room(0.8)",
      "# LLM生成時のコツ:\n# 1. まず簡単なパターン s('bd sd hh oh')\n# 2. 少しずつ複雑化 s('bd sd, hh*4')\n# 3. エフェクトを追加 s('bd sd, hh*4').gain(0.7)\n# 4. 最終調整 s('bd sd, hh*4').gain(0.7).slow(1.2)"
    ]
  }
};

export class ExecuteStrudelCodeTool implements ToolImplementation {
  name = 'execute_strudel_code';

  async call(params: { code: string }): Promise<any> {
    console.log(`Executing Strudel code: ${params.code}`);
    currentPattern = params.code;
    
    // Add to pattern history
    const historyId = patternHistory.addPattern(params.code, 'mcp', ['executed']);
    
    return { 
      status: 'executed', 
      pattern: params.code, 
      timestamp: new Date().toISOString(),
      historyId,
      note: 'Pattern sent to frontend via WebSocket and added to history'
    };
  }
}

export class GetCurrentPatternTool implements ToolImplementation {
  name = 'get_current_pattern';

  async call(params: {}): Promise<any> {
    const history = patternHistory.getPatternHistory();
    const latestEntry = history[0];
    
    return { 
      pattern: currentPattern || '',
      timestamp: new Date().toISOString(),
      hasPattern: currentPattern.length > 0,
      historyId: latestEntry?.id,
      metadata: latestEntry?.metadata
    };
  }
}

export class GetStrudelKnowledgeTool implements ToolImplementation {
  name = 'get_strudel_knowledge';

  async call(params: { topic?: string, query?: string }): Promise<any> {
    const topic = params.topic || 'basics';
    const query = params.query;
    
    let knowledge = strudelKnowledge[topic as keyof typeof strudelKnowledge];
    
    if (!knowledge) {
      // トピックが見つからない場合は一覧を返す
      return {
        availableTopics: Object.keys(strudelKnowledge),
        message: `Topic '${topic}' not found. Available topics: ${Object.keys(strudelKnowledge).join(', ')}`,
        suggestedUse: `Use topic parameter with one of: ${Object.keys(strudelKnowledge).join(', ')}`
      };
    }

    // クエリに基づいて関連情報をフィルタリング（簡易実装）
    let response: any = {
      topic: topic,
      title: knowledge.title,
      content: knowledge.content,
      examples: knowledge.examples,
      source: 'strudel.cc documentation (embedded)',
      timestamp: new Date().toISOString()
    };

    if (query) {
      // クエリに基づいて関連例を強調（簡易実装）
      const matchingExamples = knowledge.examples.filter((ex: string) => 
        ex.toLowerCase().includes(query.toLowerCase())
      );
      if (matchingExamples.length > 0) {
        response.relevantExamples = matchingExamples;
        response.queryMatch = true;
      }
    }

    return response;
  }
}

// New pattern history tools
export class GetPatternHistoryTool implements ToolImplementation {
  name = 'get_pattern_history';

  async call(params: { patternId?: string }): Promise<any> {
    const history = patternHistory.getPatternHistory(params.patternId);
    
    return {
      history: history.map(entry => ({
        id: entry.id,
        pattern: entry.pattern,
        timestamp: entry.timestamp,
        author: entry.author,
        tags: entry.tags,
        changeType: entry.changeType,
        metadata: entry.metadata,
        parentId: entry.parentId
      })),
      total: history.length,
      requestedPatternId: params.patternId
    };
  }
}

export class RestorePatternVersionTool implements ToolImplementation {
  name = 'restore_pattern_version';

  async call(params: { historyId: string }): Promise<any> {
    try {
      const restoredId = patternHistory.restorePatternVersion(params.historyId);
      const restoredEntry = patternHistory.getPatternHistory(restoredId)[0];
      
      currentPattern = restoredEntry.pattern;
      
      return {
        status: 'restored',
        originalHistoryId: params.historyId,
        newHistoryId: restoredId,
        pattern: restoredEntry.pattern,
        timestamp: restoredEntry.timestamp
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

export class CreatePatternBranchTool implements ToolImplementation {
  name = 'create_pattern_branch';

  async call(params: { patternId: string; branchName: string }): Promise<any> {
    try {
      const branchId = patternHistory.createBranch(params.patternId, params.branchName);
      const branchEntry = patternHistory.getPatternHistory(branchId)[0];
      
      return {
        status: 'created',
        sourcePatternId: params.patternId,
        branchHistoryId: branchId,
        branchName: params.branchName,
        pattern: branchEntry.pattern,
        timestamp: branchEntry.timestamp
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

export class SearchPatternsTool implements ToolImplementation {
  name = 'search_patterns';

  async call(params: { query: string; filters?: {
    tags?: string[];
    author?: string;
    changeType?: 'create' | 'modify' | 'delete';
  } }): Promise<any> {
    const results = patternHistory.searchPatterns(params.query, params.filters);
    
    return {
      query: params.query,
      results: results.map(result => ({
        id: result.id,
        pattern: result.pattern,
        timestamp: result.timestamp,
        author: result.author,
        tags: result.tags,
        changeType: result.changeType,
        metadata: result.metadata,
        relevance: result.relevance
      })),
      total: results.length
    };
  }
}

export class GetPatternStatisticsTool implements ToolImplementation {
  name = 'get_pattern_statistics';

  async call(params: {}): Promise<any> {
    const stats = patternHistory.getStatistics();
    
    return {
      ...stats,
      timestamp: new Date().toISOString()
    };
  }
}

// Session management tools
export class CreateSessionTool implements ToolImplementation {
  name = 'create_session';

  async call(params: { name: string; metadata?: { author?: string; description?: string; tags?: string[]; tempo?: number } }): Promise<any> {
    try {
      const session = await sessionManager.createSession(params.name, params.metadata);
      
      return {
        status: 'created',
        session: {
          id: session.id,
          name: session.name,
          createdAt: session.createdAt,
          metadata: session.metadata
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

export class AddPatternToSessionTool implements ToolImplementation {
  name = 'add_pattern_to_session';

  async call(params: { name: string; pattern: string; author?: string; tags?: string[] }): Promise<any> {
    try {
      const storedPattern = await sessionManager.addPatternToSession(
        params.name, 
        params.pattern, 
        params.author, 
        params.tags
      );
      
      return {
        status: 'added',
        pattern: {
          id: storedPattern.id,
          name: storedPattern.name,
          timestamp: storedPattern.timestamp,
          metadata: storedPattern.metadata
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

export class ListSessionsTool implements ToolImplementation {
  name = 'list_sessions';

  async call(params: {}): Promise<any> {
    const sessions = sessionManager.listSessions();
    
    return {
      sessions: sessions.map(session => ({
        id: session.id,
        name: session.name,
        createdAt: session.createdAt,
        lastModified: session.lastModified,
        patternCount: session.patterns.length,
        metadata: session.metadata
      })),
      total: sessions.length
    };
  }
}

export class SaveSessionTool implements ToolImplementation {
  name = 'save_session';

  async call(params: { sessionId?: string }): Promise<any> {
    try {
      const sessionId = params.sessionId || sessionManager.getCurrentSession()?.id;
      if (!sessionId) {
        throw new Error('No session provided and no current session');
      }

      await sessionManager.saveSession(sessionId);
      
      return {
        status: 'saved',
        sessionId
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

export class ExportSessionTool implements ToolImplementation {
  name = 'export_session';

  async call(params: { sessionId?: string; format: 'json' | 'strudel' | 'backup' }): Promise<any> {
    try {
      const sessionId = params.sessionId || sessionManager.getCurrentSession()?.id;
      if (!sessionId) {
        throw new Error('No session provided and no current session');
      }

      const exported = await sessionManager.exportSession(sessionId, params.format);
      
      return {
        status: 'exported',
        format: params.format,
        data: exported,
        sessionId
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// Export/Import tools
export class ExportPatternTool implements ToolImplementation {
  name = 'export_pattern';

  async call(params: { 
    historyId?: string; 
    format: 'json' | 'strudel'; 
    includeMetadata?: boolean;
    includeHistory?: boolean;
  }): Promise<any> {
    try {
      const historyId = params.historyId || patternHistory.getPatternHistory()[0]?.id;
      if (!historyId) {
        throw new Error('No pattern found to export');
      }

      const result = params.format === 'json'
        ? exportManager.exportPatternAsJson(historyId, {
            includeMetadata: params.includeMetadata,
            includeHistory: params.includeHistory
          })
        : exportManager.exportPatternAsStrudel(
            patternHistory.getPatternHistory(historyId)[0]?.pattern || '',
            {
              includeMetadata: params.includeMetadata
            }
          );

      return {
        status: 'exported',
        format: params.format,
        content: result.content,
        metadata: result.metadata
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

export class ImportPatternTool implements ToolImplementation {
  name = 'import_pattern';

  async call(params: { 
    content: string; 
    format: 'json' | 'strudel'; 
    validateSyntax?: boolean;
  }): Promise<any> {
    try {
      const historyId = params.format === 'json'
        ? await exportManager.importPatternFromJson(params.content, {
            validateSyntax: params.validateSyntax
          })
        : await exportManager.importPatternFromStrudel(params.content, {
            validateSyntax: params.validateSyntax
          });

      const history = patternHistory.getPatternHistory(historyId);

      return {
        status: 'imported',
        historyId,
        pattern: history[0].pattern,
        metadata: {
          author: history[0].author,
          tags: history[0].tags
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

export class ValidatePatternTool implements ToolImplementation {
  name = 'validate_pattern';

  async call(params: { pattern: string }): Promise<any> {
    try {
      const validation = exportManager.validatePattern(params.pattern);

      return {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

export class ConvertPatternTool implements ToolImplementation {
  name = 'convert_pattern';

  async call(params: { 
    content: string; 
    fromFormat: string; 
    toFormat: string; 
  }): Promise<any> {
    try {
      const result = exportManager.convertPattern(
        params.content, 
        params.fromFormat, 
        params.toFormat
      );

      return {
        status: 'converted',
        result,
        fromFormat: params.fromFormat,
        toFormat: params.toFormat
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// 各ツールの定義
export const ExecuteStrudelCodeToolDefinition: Tool = {
  name: 'execute_strudel_code',
  description: 'Execute Strudel pattern code',
  inputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "Strudel pattern code to execute"
      }
    },
    required: ["code"]
  }
};

export const GetCurrentPatternToolDefinition: Tool = {
  name: 'get_current_pattern',
  description: 'Get currently executing pattern',
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
};

export const GetStrudelKnowledgeToolDefinition: Tool = {
  name: 'get_strudel_knowledge',
  description: 'Get Strudel documentation and knowledge (built-in, no external dependencies)',
  inputSchema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "Topic to learn about: basics, patterns, effects, troubleshooting"
      },
      query: {
        type: "string",
        description: "Search query within the topic"
      }
    },
    required: []
  }
};

export const GetPatternHistoryToolDefinition: Tool = {
  name: 'get_pattern_history',
  description: 'Get pattern history and version history',
  inputSchema: {
    type: "object",
    properties: {
      patternId: {
        type: "string",
        description: "Optional pattern ID to get specific history"
      }
    },
    required: []
  }
};

export const RestorePatternVersionToolDefinition: Tool = {
  name: 'restore_pattern_version',
  description: 'Restore a pattern to a previous version from history',
  inputSchema: {
    type: "object",
    properties: {
      historyId: {
        type: "string",
        description: "History entry ID to restore"
      }
    },
    required: ["historyId"]
  }
};

export const CreatePatternBranchToolDefinition: Tool = {
  name: 'create_pattern_branch',
  description: 'Create a branch from an existing pattern',
  inputSchema: {
    type: "object",
    properties: {
      patternId: {
        type: "string",
        description: "Source pattern ID to branch from"
      },
      branchName: {
        type: "string",
        description: "Name for the new branch"
      }
    },
    required: ["patternId", "branchName"]
  }
};

export const SearchPatternsToolDefinition: Tool = {
  name: 'search_patterns',
  description: 'Search patterns by content, tags, author, or metadata',
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query"
      },
      filters: {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Filter by tags"
          },
          author: {
            type: "string",
            description: "Filter by author"
          },
          changeType: {
            type: "string",
            enum: ["create", "modify", "delete"],
            description: "Filter by change type"
          }
        }
      }
    },
    required: ["query"]
  }
};

export const GetPatternStatisticsToolDefinition: Tool = {
  name: 'get_pattern_statistics',
  description: 'Get pattern usage statistics and analytics',
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
};

export const CreateSessionToolDefinition: Tool = {
  name: 'create_session',
  description: 'Create a new pattern session',
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name for the new session"
      },
      metadata: {
        type: "object",
        properties: {
          author: {
            type: "string",
            description: "Session author"
          },
          description: {
            type: "string",
            description: "Session description"
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Session tags"
          },
          tempo: {
            type: "number",
            description: "Session tempo"
          }
        }
      }
    },
    required: ["name"]
  }
};

export const AddPatternToSessionToolDefinition: Tool = {
  name: 'add_pattern_to_session',
  description: 'Add a pattern to the current session',
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Pattern name"
      },
      pattern: {
        type: "string",
        description: "Strudel pattern code"
      },
      author: {
        type: "string",
        description: "Pattern author"
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Pattern tags"
      }
    },
    required: ["name", "pattern"]
  }
};

export const ListSessionsToolDefinition: Tool = {
  name: 'list_sessions',
  description: 'List all available sessions',
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
};

export const SaveSessionToolDefinition: Tool = {
  name: 'save_session',
  description: 'Save a session to storage',
  inputSchema: {
    type: "object",
    properties: {
      sessionId: {
        type: "string",
        description: "Session ID to save (optional, uses current session if not provided)"
      }
    },
    required: []
  }
};

export const ExportSessionToolDefinition: Tool = {
  name: 'export_session',
  description: 'Export a session in specified format',
  inputSchema: {
    type: "object",
    properties: {
      sessionId: {
        type: "string",
        description: "Session ID to export (optional, uses current session if not provided)"
      },
      format: {
        type: "string",
        enum: ["json", "strudel", "backup"],
        description: "Export format"
      }
    },
    required: ["format"]
  }
};

export const ExportPatternToolDefinition: Tool = {
  name: 'export_pattern',
  description: 'Export a pattern in specified format',
  inputSchema: {
    type: "object",
    properties: {
      historyId: {
        type: "string",
        description: "Pattern history ID (optional, uses most recent pattern if not provided)"
      },
      format: {
        type: "string",
        enum: ["json", "strudel"],
        description: "Export format"
      },
      includeMetadata: {
        type: "boolean",
        description: "Include metadata in export"
      },
      includeHistory: {
        type: "boolean",
        description: "Include version history in export"
      }
    },
    required: ["format"]
  }
};

export const ImportPatternToolDefinition: Tool = {
  name: 'import_pattern',
  description: 'Import a pattern from specified format',
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "Pattern content to import"
      },
      format: {
        type: "string",
        enum: ["json", "strudel"],
        description: "Import format"
      },
      validateSyntax: {
        type: "boolean",
        description: "Validate pattern syntax during import"
      }
    },
    required: ["content", "format"]
  }
};

export const ValidatePatternToolDefinition: Tool = {
  name: 'validate_pattern',
  description: 'Validate a Strudel pattern for syntax and potential issues',
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Strudel pattern to validate"
      }
    },
    required: ["pattern"]
  }
};

export const ConvertPatternToolDefinition: Tool = {
  name: 'convert_pattern',
  description: 'Convert pattern between different formats',
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "Pattern content to convert"
      },
      fromFormat: {
        type: "string",
        description: "Source format"
      },
      toFormat: {
        type: "string",
        description: "Target format"
      }
    },
    required: ["content", "fromFormat", "toFormat"]
  }
};

// ツール実装の配列
export const ToolImplementations = [
  new ExecuteStrudelCodeTool(),
  new GetCurrentPatternTool(),
  new GetStrudelKnowledgeTool(),
  new GetPatternHistoryTool(),
  new RestorePatternVersionTool(),
  new CreatePatternBranchTool(),
  new SearchPatternsTool(),
  new GetPatternStatisticsTool(),
  new CreateSessionTool(),
  new AddPatternToSessionTool(),
  new ListSessionsTool(),
  new SaveSessionTool(),
  new ExportSessionTool(),
  new ExportPatternTool(),
  new ImportPatternTool(),
  new ValidatePatternTool(),
  new ConvertPatternTool(),
];

// ツール定義の配列
export const ToolDefinitions = [
  ExecuteStrudelCodeToolDefinition,
  GetCurrentPatternToolDefinition,
  GetStrudelKnowledgeToolDefinition,
  GetPatternHistoryToolDefinition,
  RestorePatternVersionToolDefinition,
  CreatePatternBranchToolDefinition,
  SearchPatternsToolDefinition,
  GetPatternStatisticsToolDefinition,
  CreateSessionToolDefinition,
  AddPatternToSessionToolDefinition,
  ListSessionsToolDefinition,
  SaveSessionToolDefinition,
  ExportSessionToolDefinition,
  ExportPatternToolDefinition,
  ImportPatternToolDefinition,
  ValidatePatternToolDefinition,
  ConvertPatternToolDefinition,
];