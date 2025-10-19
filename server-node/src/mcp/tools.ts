import { z } from 'zod';

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

// 共有のパターン状態
let currentPattern: string = '';

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
    return { 
      status: 'executed', 
      pattern: params.code, 
      timestamp: new Date().toISOString(),
      note: 'Pattern sent to frontend via WebSocket'
    };
  }
}

export class GetCurrentPatternTool implements ToolImplementation {
  name = 'get_current_pattern';

  async call(params: {}): Promise<any> {
    return { 
      pattern: currentPattern || '',
      timestamp: new Date().toISOString(),
      hasPattern: currentPattern.length > 0
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

// ツール実装の配列
export const ToolImplementations = [
  new ExecuteStrudelCodeTool(),
  new GetCurrentPatternTool(),
  new GetStrudelKnowledgeTool(),
];

// ツール定義の配列
export const ToolDefinitions = [
  ExecuteStrudelCodeToolDefinition,
  GetCurrentPatternToolDefinition,
  GetStrudelKnowledgeToolDefinition,
];