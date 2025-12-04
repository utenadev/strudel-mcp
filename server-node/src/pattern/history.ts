import { v4 as uuidv4 } from 'uuid';
import { structuredLogger } from '../utils/logger';

// Pattern history types
export interface PatternHistoryEntry {
  id: string;
  pattern: string;
  timestamp: Date;
  author?: string;
  tags: string[];
  metadata: PatternMetadata;
  changeType: 'create' | 'modify' | 'delete';
  parentId?: string; // For branching/merging
}

export interface PatternMetadata {
  length: number;
  complexity: number; // 0-100 based on pattern complexity
  instruments: string[];
  effects: string[];
  estimatedBpm?: number;
  estimatedTimeSignature?: string;
}

export interface PatternHistoryOptions {
  maxEntries?: number;
  enableMetrics?: boolean;
  retentionPeriod?: number; // days
}

export class PatternHistoryManager {
  private history: PatternHistoryEntry[] = [];
  private currentPatternId?: string;
  private options: PatternHistoryOptions = {
    maxEntries: 100,
    enableMetrics: true,
    retentionPeriod: 30 // days
  };

  constructor(options?: PatternHistoryOptions) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Add a new pattern to history
   */
  addPattern(pattern: string, author?: string, tags: string[] = []): string {
    // Detect change type
    const changeType = this.detectChangeType(pattern);
    
    const entry: PatternHistoryEntry = {
      id: uuidv4(),
      pattern,
      timestamp: new Date(),
      author,
      tags,
      metadata: this.analyzePattern(pattern),
      changeType,
      parentId: this.currentPatternId
    };

    this.history.push(entry);
    this.currentPatternId = entry.id;
    
    // Cleanup old entries if needed
    this.cleanupOldEntries();
    
    structuredLogger.info('Pattern added to history', {
      patternId: entry.id,
      changeType,
      patternLength: pattern.length
    });

    return entry.id;
  }

  /**
   * Get history for a specific pattern
   */
  getPatternHistory(patternId?: string): PatternHistoryEntry[] {
    if (!patternId) {
      // Return all history sorted by timestamp
      return [...this.history].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    // Get history for specific pattern (current and all ancestors)
    const entries: PatternHistoryEntry[] = [];
    let currentEntry = this.history.find(entry => entry.id === patternId);

    while (currentEntry) {
      entries.push(currentEntry);
      currentEntry = currentEntry.parentId 
        ? this.history.find(entry => entry.id === currentEntry!.parentId)
        : undefined;
    }

    return entries;
  }

  /**
   * Restore a pattern to a previous version
   */
  restorePatternVersion(historyId: string): string {
    const entry = this.history.find(h => h.id === historyId);
    if (!entry) {
      throw new Error(`History entry ${historyId} not found`);
    }

    // Add the restored pattern as a new entry
    const restoredId = this.addPattern(
      entry.pattern, 
      entry.author, 
      [...entry.tags, 'restored']
    );

    structuredLogger.info('Pattern version restored', {
      fromHistoryId: historyId,
      newId: restoredId
    });

    return restoredId;
  }

  /**
   * Create a branch from an existing pattern
   */
  createBranch(patternId: string, branchName: string): string {
    const entry = this.history.find(h => h.id === patternId);
    if (!entry) {
      throw new Error(`Pattern ${patternId} not found`);
    }

    const branchEntry: PatternHistoryEntry = {
      id: uuidv4(),
      pattern: entry.pattern,
      timestamp: new Date(),
      author: entry.author,
      tags: [...entry.tags, `branch-${branchName}`],
      metadata: entry.metadata,
      changeType: 'create',
      parentId: entry.id
    };

    this.history.push(branchEntry);
    
    structuredLogger.info('Pattern branch created', {
      sourceId: patternId,
      branchId: branchEntry.id,
      branchName
    });

    return branchEntry.id;
  }

  /**
   * Parse pattern history into a timeline view
   */
  getPatternTimeline(patternId?: string): TimelineEntry[] {
    const relevantHistory = patternId 
      ? this.getPatternHistory(patternId)
      : this.history;

    return relevantHistory.map((entry, index) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      changeType: entry.changeType,
      description: this.generateTimelineDescription(entry),
      position: index,
      parent: entry.parentId
    }));
  }

  /**
   * Search patterns by content or metadata
   */
  searchPatterns(query: string, filters?: SearchFilters): SearchResult[] {
    const lowerQuery = query.toLowerCase();
    
    return this.history
      .filter(entry => {
        // Content search
        const contentMatch = entry.pattern.toLowerCase().includes(lowerQuery);
        
        if (!filters) return contentMatch;

        // Tag search
        const tagMatch = !filters.tags || 
          filters.tags.some(tag => entry.tags.includes(tag));

        // Author search
        const authorMatch = !filters.author || 
          entry.author?.toLowerCase().includes(filters.author.toLowerCase());

        // Change type search
        const typeMatch = !filters.changeType || 
          entry.changeType === filters.changeType;

        // Date range search
        const dateMatch = !filters.dateRange || 
          this.isDateInRange(entry.timestamp, filters.dateRange);

        return contentMatch && tagMatch && authorMatch && typeMatch && dateMatch;
      })
      .map(entry => ({
        id: entry.id,
        pattern: entry.pattern,
        timestamp: entry.timestamp,
        author: entry.author,
        tags: entry.tags,
        changeType: entry.changeType,
        metadata: entry.metadata,
        relevance: this.calculateRelevance(entry, query)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 50); // Limit results
  }

  /**
   * Get statistics about pattern usage
   */
  getStatistics(): PatternStatistics {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentHistory = this.history.filter(entry => 
      new Date(entry.timestamp) >= thirtyDaysAgo
    );

    const changeTypes = this.history.reduce((acc, entry) => {
      acc[entry.changeType] = (acc[entry.changeType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const instruments = this.history.reduce((acc, entry) => {
      entry.metadata.instruments.forEach(instrument => {
        acc[instrument] = (acc[instrument] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPatterns: this.history.length,
      recentPatterns: recentHistory.length,
      changeTypes,
      topInstruments: Object.entries(instruments)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([instrument, count]) => ({ instrument, count })),
      averageComplexity: this.history.length > 0
        ? this.history.reduce((sum, entry) => sum + entry.metadata.complexity, 0) / this.history.length
        : 0
    };
  }

  // Private helper methods

  private detectChangeType(pattern: string): 'create' | 'modify' | 'delete' {
    if (!this.currentPatternId) return 'create';
    
    const currentEntry = this.history.find(h => h.id === this.currentPatternId);
    if (!currentEntry) return 'create';

    if (pattern === currentEntry.pattern) return 'modify';
    if (pattern === '') return 'delete';
    return 'modify';
  }

  private analyzePattern(pattern: string): PatternMetadata {
    // Extract instruments from strudel patterns
    const instruments = this.extractInstruments(pattern);
    
    // Extract effects
    const effects = this.extractEffects(pattern);
    
    // Calculate complexity based on pattern length and structure
    const complexity = this.calculateComplexity(pattern, instruments, effects);
    
    // Extract BPM
    const estimatedBpm = this.extractBpm(pattern);
    
    // Extract time signature
    const estimatedTimeSignature = this.extractTimeSignature(pattern);

    return {
      length: pattern.length,
      complexity,
      instruments,
      effects,
      estimatedBpm,
      estimatedTimeSignature
    };
  }

  private extractInstruments(pattern: string): string[] {
    // Common strudel instruments
    const instruments = ['bd', 'sd', 'hh', 'oh', 'rim', 'cp', 'lt', 'ht', 
                        'clap', 'cowbell', 'tamb', 'conga', 'psrs'];
    
    return instruments.filter(inst => 
      pattern.includes(inst) || pattern.includes(`s('${inst}`)
    );
  }

  private extractEffects(pattern: string): string[] {
    const effects = ['fast', 'slow', 'rev', 'gain', 'room', 'delay', 'attack', 
                    'dec', 'off', 'ply', 'every', 'mask', 'struct'];
    
    return effects.filter(effect => pattern.includes(effect));
  }

  private calculateComplexity(pattern: string, instruments: string[], effects: string[]): number {
    let score = 20; // Base score
    
    // Length complexity
    score += Math.min(pattern.length / 10, 15);
    
    // Instrument complexity
    score += instruments.length * 5;
    
    // Effect complexity
    score += effects.length * 3;
    
    // Structure complexity (brackets, commas, etc.)
    const structureChars = ['[', ']', '(', ')', ',', '<', '>'];
    structureChars.forEach(char => {
      const matches = pattern.match(new RegExp('\\' + char, 'g'));
      score += matches ? matches.length : 0;
    });

    return Math.min(score, 100);
  }

  private extractBpm(pattern: string): number | undefined {
    // Look for tempo indications
    const bpmMatch = pattern.match(/(?:fast|slow)\(([^)]+)\)/);
    if (bpmMatch) {
      const factor = parseFloat(bpmMatch[1]);
      // Assume base BPM of 120
      return factor ? 120 * factor : undefined;
    }
    return undefined;
  }

  private extractTimeSignature(pattern: string): string | undefined {
    // Look for structure indicators
    const structMatch = pattern.match(/struct\s*\(\s*['"]t\((\d+),(\d+)\)['"]?\)/);
    if (structMatch) {
      return `${structMatch[1]}/${structMatch[2]}`;
    }
    return undefined;
  }

  private generateTimelineDescription(entry: PatternHistoryEntry): string {
    const action = entry.changeType;
    const author = entry.author || 'Anonymous';
    
    switch (action) {
      case 'create':
        return `Pattern created by ${author}`;
      case 'modify':
        return `Pattern modified by ${author}`;
      case 'delete':
        return `Pattern deleted by ${author}`;
      default:
        return `Pattern ${action} by ${author}`;
    }
  }

  private cleanupOldEntries(): void {
    if (!this.options.retentionPeriod) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionPeriod);

    const beforeCount = this.history.length;
    this.history = this.history.filter(entry => 
      new Date(entry.timestamp) >= cutoffDate
    );

    if (this.history.length !== beforeCount) {
      structuredLogger.info('Old entries cleaned up', {
        removedCount: beforeCount - this.history.length,
        retentionDays: this.options.retentionPeriod
      });
    }
  }

  private calculateRelevance(entry: PatternHistoryEntry, query: string): number {
    const pattern = entry.pattern.toLowerCase();
    const queryLower = query.toLowerCase();
    
    let score = 0;
    
    // Exact match in pattern
    if (pattern.includes(queryLower)) {
      score += 50;
    }

    // Tag matches
    entry.tags.forEach(tag => {
      if (tag.toLowerCase().includes(queryLower)) {
        score += 30;
      }
    });

    // Content match complexity (reward more recent entries)
    const hoursAgo = (Date.now() - new Date(entry.timestamp).getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 20 - hoursAgo / 24);

    return score;
  }

  private isDateInRange(date: Date, range: { start?: Date; end?: Date }): boolean {
    const checkDate = new Date(date);
    
    if (range.start && checkDate < range.start) {
      return false;
    }
    
    if (range.end && checkDate > range.end) {
      return false;
    }
    
    return true;
  }
}

// Supporting types
interface TimelineEntry {
  id: string;
  timestamp: Date;
  changeType: 'create' | 'modify' | 'delete';
  description: string;
  position: number;
  parent?: string;
}

interface SearchFilters {
  tags?: string[];
  author?: string;
  changeType?: 'create' | 'modify' | 'delete';
  dateRange?: { start?: Date; end?: Date };
}

interface SearchResult {
  id: string;
  pattern: string;
  timestamp: Date;
  author?: string;
  tags: string[];
  changeType: 'create' | 'modify' | 'delete';
  metadata: PatternMetadata;
  relevance: number;
}

interface PatternStatistics {
  totalPatterns: number;
  recentPatterns: number;
  changeTypes: Record<string, number>;
  topInstruments: { instrument: string; count: number }[];
  averageComplexity: number;
}
