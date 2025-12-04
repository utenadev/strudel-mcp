import { PatternHistoryManager, PatternHistoryEntry } from './history';
import { SessionManager, Session } from './session';
import { structuredLogger } from '../utils/logger';

export interface ExportOptions {
  includeHistory?: boolean;
  includeMetadata?: boolean;
  format?: 'compact' | 'full';
}

export interface ImportOptions {
  validateSyntax?: boolean;
  preserveHistory?: boolean;
  mergeExisting?: boolean;
}

export interface PatternExportData {
  format: 'json' | 'strudel' | 'backup';
  content: string;
  metadata: ExportMetadata;
}

export interface ExportMetadata {
  exportedAt: Date;
  format: string;
  version: string;
  source?: string;
  patternCount?: number;
  compatibility?: string[];
  notes?: string;
}

export class PatternExportManager {
  private patternHistory: PatternHistoryManager;
  private sessionManager: SessionManager;

  constructor(patternHistory: PatternHistoryManager, sessionManager: SessionManager) {
    this.patternHistory = patternHistory;
    this.sessionManager = sessionManager;
  }

  /**
   * Export pattern in JSON format
   */
  exportPatternAsJson(historyId: string, options?: ExportOptions): PatternExportData {
    try {
      const history = this.patternHistory.getPatternHistory(historyId);
      const entry = history[0];

      if (!entry) {
        throw new Error(`Pattern ${historyId} not found`);
      }

      const data = {
        pattern: entry.pattern,
        metadata: options?.includeMetadata ? {
          author: entry.author,
          tags: entry.tags,
          timestamp: entry.timestamp,
          complexity: entry.metadata.complexity,
          instruments: entry.metadata.instruments,
          effects: entry.metadata.effects,
          estimatedBpm: entry.metadata.estimatedBpm,
          estimatedTimeSignature: entry.metadata.estimatedTimeSignature
        } : undefined,
        history: options?.includeHistory ? history.map(h => ({
          id: h.id,
          timestamp: h.timestamp,
          changeType: h.changeType,
          pattern: h.pattern
        })) : undefined
      };

      return {
        format: 'json',
        content: JSON.stringify(data, null, 2),
        metadata: {
          exportedAt: new Date(),
          format: 'json',
          version: '1.0.0',
          source: 'strudel-mcp',
          patternCount: 1,
          compatibility: ['strudel-mcp-v1', 'strudel-cc']
        }
      };
    } catch (error: any) {
      structuredLogger.error('Failed to export pattern as JSON', { historyId, error: error.message });
      throw new Error(`Failed to export pattern: ${error.message}`);
    }
  }

  /**
   * Export pattern as Strudel mini-notation
   */
  exportPatternAsStrudel(pattern: string, options?: ExportOptions): PatternExportData {
    try {
      let content = pattern;

      if (options?.includeMetadata) {
        const metadata = `// Exported by Strudel MCP\n`;
        const timestamp = `// Exported at: ${new Date().toISOString()}\n`;
        content = `${metadata}${timestamp}${pattern}`;
      }

      return {
        format: 'strudel',
        content,
        metadata: {
          exportedAt: new Date(),
          format: 'strudel',
          version: '1.0.0',
          source: 'strudel-mcp',
          patternCount: 1,
          compatibility: ['strudel-cc', 'tidalcycles']
        }
      };
    } catch (error: any) {
      structuredLogger.error('Failed to export pattern as Strudel', { pattern, error: error.message });
      throw new Error(`Failed to export pattern: ${error.message}`);
    }
  }

  /**
   * Export session in various formats
   */
  exportSession(sessionId: string, format: 'json' | 'strudel' | 'backup', options?: ExportOptions): PatternExportData {
    try {
      const session = this.sessionManager['sessions'].get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      switch (format) {
        case 'json':
          return this.exportSessionAsJson(session, options);
        case 'strudel':
          return this.exportSessionAsStrudel(session, options);
        case 'backup':
          return this.exportSessionAsBackup(session, options);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error: any) {
      structuredLogger.error('Failed to export session', { sessionId, format, error: error.message });
      throw new Error(`Failed to export session: ${error.message}`);
    }
  }

  /**
   * Import pattern from JSON
   */
  async importPatternFromJson(content: string, options?: ImportOptions): Promise<string> {
    try {
      const data = JSON.parse(content);
      
      if (options?.validateSyntax !== false) {
        // Basic validation
        if (!data.pattern || typeof data.pattern !== 'string') {
          throw new Error('Invalid pattern data: missing or invalid pattern field');
        }
      }

      // Add pattern to history
      const historyId = this.patternHistory.addPattern(
        data.pattern,
        data.metadata?.author,
        data.metadata?.tags
      );

      structuredLogger.info('Pattern imported from JSON', {
        historyId,
        author: data.metadata?.author
      });

      return historyId;
    } catch (error: any) {
      structuredLogger.error('Failed to import pattern from JSON', { error: error.message });
      throw new Error(`Failed to import pattern: ${error.message}`);
    }
  }

  /**
   * Import pattern from Strudel mini-notation
   */
  async importPatternFromStrudel(content: string, options?: ImportOptions): Promise<string> {
    try {
      // Clean up the content - remove comments and extra whitespace
      let pattern = content
        .split('\n')
        .filter(line => !line.trim().startsWith('//'))
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');

      if (options?.validateSyntax !== false) {
        // Basic syntax validation
        if (!pattern.includes("s('") && !pattern.includes('s("')) {
          throw new Error('Invalid Strudel pattern: missing s() function');
        }
      }

      const historyId = this.patternHistory.addPattern(
        pattern,
        'import',
        ['imported']
      );

      structuredLogger.info('Pattern imported from Strudel', { historyId });

      return historyId;
    } catch (error: any) {
      structuredLogger.error('Failed to import pattern from Strudel', { error: error.message });
      throw new Error(`Failed to import pattern: ${error.message}`);
    }
  }

  /**
   * Validate imported pattern
   */
  validatePattern(pattern: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic syntax checks
    if (!pattern.trim()) {
      errors.push('Pattern cannot be empty');
    }

    if (typeof pattern !== 'string') {
      errors.push('Pattern must be a string');
    }

    // Strudel-specific checks
    if (pattern && !pattern.includes("s('") && !pattern.includes('s("') && !pattern.includes('note(')) {
      warnings.push('Pattern might not be a valid Strudel pattern (no s() or note() function found)');
    }

    // Check for balanced parentheses
    const openCount = (pattern.match(/\(/g) || []).length;
    const closeCount = (pattern.match(/\)/g) || []).length;
    if (openCount !== closeCount) {
      errors.push(`Unbalanced parentheses: ${openCount} open, ${closeCount} close`);
    }

    // Check for balanced brackets
    const bracketOpenCount = (pattern.match(/\[/g) || []).length;
    const bracketCloseCount = (pattern.match(/\]/g) || []).length;
    if (bracketOpenCount !== bracketCloseCount) {
      errors.push(`Unbalanced brackets: ${bracketOpenCount} open, ${bracketCloseCount} close`);
    }

    // Check for potential security issues
    const dangerousPatterns = ['eval(', 'new Function', 'require(', 'process.env'];
    dangerousPatterns.forEach(dangerous => {
      if (pattern.includes(dangerous)) {
        errors.push(`Potentially dangerous code detected: ${dangerous}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convert between different pattern formats
   */
  convertPattern(content: string, fromFormat: string, toFormat: string): string {
    try {
      // First parse the input format
      let pattern: string;

      switch (fromFormat.toLowerCase()) {
        case 'json':
          const data = JSON.parse(content);
          pattern = data.pattern || data.content || '';
          break;
        case 'strudel':
        case 'mini-notation':
          pattern = content;
          break;
        default:
          throw new Error(`Unsupported input format: ${fromFormat}`);
      }

      // Then convert to output format
      switch (toFormat.toLowerCase()) {
        case 'json':
          return JSON.stringify({
            pattern,
            metadata: {
              converted: true,
              convertedAt: new Date().toISOString(),
              originalFormat: fromFormat
            }
          }, null, 2);
        case 'strudel':
        case 'mini-notation':
          return pattern;
        default:
          throw new Error(`Unsupported output format: ${toFormat}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to convert pattern: ${error.message}`);
    }
  }

  // Private helper methods

  private exportSessionAsJson(session: Session, options?: ExportOptions): PatternExportData {
    const data = {
      session: {
        id: session.id,
        name: session.name,
        metadata: options?.includeMetadata ? session.metadata : undefined,
        createdAt: session.createdAt,
        lastModified: session.lastModified
      },
      patterns: session.patterns.map(sp => ({
        id: sp.id,
        name: sp.name,
        pattern: sp.pattern,
        timestamp: sp.timestamp,
        metadata: options?.includeMetadata ? {
          author: sp.metadata.author,
          tags: sp.metadata.tags,
          versions: sp.metadata.versions
        } : undefined,
        history: options?.includeHistory 
          ? sp.metadata.versions.map(v => this.patternHistory.getPatternHistory(v))
            .flat()
            .slice(0, 10) // Limit history depth
          : undefined
      }))
    };

    return {
      format: 'json',
      content: JSON.stringify(data, null, 2),
      metadata: {
        exportedAt: new Date(),
        format: 'json',
        version: '1.0.0',
        source: 'strudel-mcp',
        patternCount: session.patterns.length,
        compatibility: ['strudel-mcp-v1', 'strudel-cc']
      }
    };
  }

  private exportSessionAsStrudel(session: Session, options?: ExportOptions): PatternExportData {
    let content = `// Session: ${session.name}\n`;
    content += `// Exported at: ${new Date().toISOString()}\n\n`;

    session.patterns.forEach((sp, index) => {
      content += `// Pattern ${index + 1}: ${sp.name}\n`;
      if (options?.includeMetadata) {
        content += `// Author: ${sp.metadata.author || 'Unknown'}\n`;
        content += `// Tags: ${sp.metadata.tags.join(', ')}\n`;
        content += `// Created: ${sp.timestamp.toISOString()}\n`;
      }
      content += `${sp.pattern}\n\n`;
    });

    return {
      format: 'strudel',
      content,
      metadata: {
        exportedAt: new Date(),
        format: 'strudel',
        version: '1.0.0',
        source: 'strudel-mcp',
        patternCount: session.patterns.length,
        compatibility: ['strudel-cc', 'tidalcycles']
      }
    };
  }

  private exportSessionAsBackup(session: Session, options?: ExportOptions): PatternExportData {
    // Backup format includes all session data in compressed form
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      session: {
        ...session,
        createdAt: session.createdAt.toISOString(),
        lastModified: session.lastModified.toISOString(),
        patterns: session.patterns.map(p => ({
          ...p,
          timestamp: p.timestamp.toISOString()
        }))
      },
      fullHistory: session.patterns.flatMap(sp => 
        sp.metadata.versions.map(v => this.patternHistory.getPatternHistory(v))
      ).flat()
    };

    return {
      format: 'backup',
      content: JSON.stringify(backupData, null, options?.format === 'compact' ? 0 : 2),
      metadata: {
        exportedAt: new Date(),
        format: 'backup',
        version: '1.0.0',
        source: 'strudel-mcp',
        patternCount: session.patterns.length,
        compatibility: ['strudel-mcp-v1'],
        notes: options?.format === 'compact' ? 'Compressed backup format' : 'Full backup format'
      }
    };
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
