import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { structuredLogger } from '../utils/logger';
import { PatternHistoryManager, PatternHistoryEntry } from './history';

export interface StoredPattern {
  id: string;
  name: string;
  pattern: string;
  timestamp: Date;
  metadata: {
    author?: string;
    tags: string[];
    versions: string[]; // History IDs
  };
}

export interface Session {
  id: string;
  name: string;
  patterns: StoredPattern[];
  metadata: SessionMetadata;
  createdAt: Date;
  lastModified: Date;
  backup: boolean;
}

export interface SessionMetadata {
  author?: string;
  description?: string;
  tags: string[];
  version: string;
  duration?: number; // Estimated duration in seconds
  tempo?: number;
  timeSignature?: string;
}

export interface SessionOptions {
  storagePath?: string;
  enableAutoSave?: boolean;
  autoSaveInterval?: number; // minutes
  maxBackups?: number;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private currentSessionId?: string;
  private patternHistory: PatternHistoryManager;
  private options: Required<Omit<SessionOptions, 'enableAutoSave' | 'autoSaveInterval' | 'maxBackups'>> & {
    enableAutoSave: boolean;
    autoSaveInterval: number;
    maxBackups: number;
  };

  constructor(patternHistory: PatternHistoryManager, options?: SessionOptions) {
    this.patternHistory = patternHistory;
    this.options = {
      storagePath: options?.storagePath || path.join(process.cwd(), 'sessions'),
      enableAutoSave: options?.enableAutoSave || false,
      autoSaveInterval: options?.autoSaveInterval || 5, // 5 minutes
      maxBackups: options?.maxBackups || 10
    };

    this.initializeStorage();
    
    if (this.options.enableAutoSave) {
      this.startAutoSave();
    }
  }

  /**
   * Create a new session
   */
  async createSession(name: string, metadata?: Partial<SessionMetadata>): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      name,
      patterns: [],
      metadata: {
        author: metadata?.author,
        description: metadata?.description,
        tags: metadata?.tags || [],
        version: '1.0.0',
        duration: metadata?.duration || 0,
        tempo: metadata?.tempo || 120,
        timeSignature: metadata?.timeSignature || '4/4'
      },
      createdAt: new Date(),
      lastModified: new Date(),
      backup: false
    };

    this.sessions.set(session.id, session);
    this.currentSessionId = session.id;

    // Save to storage
    await this.saveSession(session.id);

    structuredLogger.info('Session created', {
      sessionId: session.id,
      name: session.name,
      author: session.metadata.author
    });

    return session;
  }

  /**
   * Add a pattern to current session
   */
  async addPatternToSession(
    name: string, 
    pattern: string, 
    author?: string, 
    tags: string[] = []
  ): Promise<StoredPattern> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Create a session first.');
    }

    const session = this.sessions.get(this.currentSessionId)!;
    
    // Add pattern to history first
    const historyId = this.patternHistory.addPattern(pattern, author, tags);

    // Create stored pattern
    const storedPattern: StoredPattern = {
      id: uuidv4(),
      name,
      pattern,
      timestamp: new Date(),
      metadata: {
        author,
        tags,
        versions: [historyId]
      }
    };

    session.patterns.push(storedPattern);
    session.lastModified = new Date();

    await this.saveSession(session.id);

    structuredLogger.info('Pattern added to session', {
      sessionId: session.id,
      patternId: storedPattern.id,
      historyId
    });

    return storedPattern;
  }

  /**
   * Update existing pattern in session
   */
  async updatePatternInSession(
    patternId: string, 
    newPattern: string, 
    author?: string, 
    newTags?: string[]
  ): Promise<StoredPattern> {
    if (!this.currentSessionId) {
      throw new Error('No active session.');
    }

    const session = this.sessions.get(this.currentSessionId)!;
    const patternIndex = session.patterns.findIndex(p => p.id === patternId);
    
    if (patternIndex === -1) {
      throw new Error(`Pattern ${patternId} not found in session.`);
    }

    const storedPattern = session.patterns[patternIndex];
    
    // Add new version to history
    const historyId = this.patternHistory.addPattern(newPattern, author, newTags || storedPattern.metadata.tags);
    
    // Update stored pattern
    storedPattern.metadata.versions.push(historyId);
    storedPattern.pattern = newPattern;
    storedPattern.timestamp = new Date();
    
    if (newTags) {
      storedPattern.metadata.tags = newTags;
    }

    session.lastModified = new Date();
    await this.saveSession(session.id);

    structuredLogger.info('Pattern updated in session', {
      sessionId: session.id,
      patternId: storedPattern.id,
      newHistoryId: historyId
    });

    return storedPattern;
  }

  /**
   * Save session to storage
   */
  async saveSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    await this.ensureStorageDirectory();
    
    const filePath = path.join(this.options.storagePath, `${sessionId}.json`);
    const sessionData = {
      ...session,
      createdAt: session.createdAt.toISOString(),
      lastModified: session.lastModified.toISOString(),
      patterns: session.patterns.map(p => ({
        ...p,
        timestamp: p.timestamp.toISOString()
      }))
    };

    await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2));

    // Create backup if enabled
    if (!session.backup) {
      await this.createBackup(sessionId);
    }
  }

  /**
   * Restore session from storage
   */
  async restoreSession(sessionId: string): Promise<Session> {
    const filePath = path.join(this.options.storagePath, `${sessionId}.json`);
    
    try {
      const fileData = await fs.readFile(filePath, 'utf-8');
      const sessionData = JSON.parse(fileData);

      const session: Session = {
        ...sessionData,
        createdAt: new Date(sessionData.createdAt),
        lastModified: new Date(sessionData.lastModified),
        patterns: sessionData.patterns.map((p: any) => ({
          ...p,
          timestamp: new Date(p.timestamp)
        }))
      };

      this.sessions.set(session.id, session);
      this.currentSessionId = session.id;

      structuredLogger.info('Session restored', {
        sessionId: session.id,
        name: session.name
      });

      return session;
    } catch (error: any) {
      throw new Error(`Failed to restore session ${sessionId}: ${error.message}`);
    }
  }

  /**
   * List all sessions
   */
  listSessions(): Session[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    if (!this.currentSessionId) {
      return null;
    }
    return this.sessions.get(this.currentSessionId) || null;
  }

  /**
   * Switch to a different session
   */
  switchSession(sessionId: string): Session {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.currentSessionId = sessionId;
    structuredLogger.info('Session switched', {
      sessionId,
      name: session.name
    });

    return session;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.sessions.delete(sessionId);

    // Delete storage file
    const filePath = path.join(this.options.storagePath, `${sessionId}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore
    }

    // Switch current session if it was deleted
    if (this.currentSessionId === sessionId) {
      const remainingSessions = this.listSessions();
      this.currentSessionId = remainingSessions.length > 0 ? remainingSessions[0].id : undefined;
    }

    structuredLogger.info('Session deleted', {
      sessionId
    });
  }

  /**
   * Export session to different formats
   */
  async exportSession(sessionId: string, format: 'json' | 'strudel' | 'backup'): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify({
          session: {
            ...session,
            createdAt: session.createdAt.toISOString(),
            lastModified: session.lastModified.toISOString()
          },
          patterns: session.patterns.map(p => ({
            ...p,
            timestamp: p.timestamp.toISOString(),
            history: this.patternHistory.getPatternHistory(p.metadata.versions[0])
          }))
        }, null, 2);

      case 'strudel':
        // Export as concatenated strudel patterns
        return session.patterns
          .map(p => `// ${p.name}\n${p.pattern}`)
          .join('\n\n');

      case 'backup':
        return await this.createBackup(sessionId);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import session from data
   */
  async importSession(data: string, format: 'json' | 'strudel'): Promise<Session> {
    switch (format) {
      case 'json':
        try {
          const importData = JSON.parse(data);
          const sessionData = importData.session || importData;
          
          const session: Session = {
            ...sessionData,
            id: uuidv4(), // Generate new ID to avoid conflicts
            createdAt: new Date(sessionData.createdAt || Date.now()),
            lastModified: new Date(sessionData.lastModified || Date.now()),
            patterns: (sessionData.patterns || []).map((p: any) => ({
              ...p,
              id: uuidv4(), // Generate new pattern IDs
              timestamp: new Date(p.timestamp || Date.now())
            }))
          };

          this.sessions.set(session.id, session);
          this.currentSessionId = session.id;
          await this.saveSession(session.id);

          return session;
        } catch (error: any) {
          throw new Error(`Failed to import JSON session: ${error.message}`);
        }

      case 'strudel':
        // Import strudel patterns as a new session
        const session = await this.createSession('Imported Session');
        const patterns = data
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('//'))
          .filter(line => line.includes("s('") || line.includes('s("'));

        for (const pattern of patterns) {
          await this.addPatternToSession(`Pattern ${session.patterns.length + 1}`, pattern, 'import');
        }

        return session;

      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }

  // Private helper methods

  private async initializeStorage(): Promise<void> {
    try {
      await this.ensureStorageDirectory();
      await this.loadExistingSessions();
    } catch (error: any) {
      structuredLogger.error('Failed to initialize session storage', error);
    }
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.access(this.options.storagePath);
    } catch {
      await fs.mkdir(this.options.storagePath, { recursive: true });
    }
  }

  private async loadExistingSessions(): Promise<void> {
    try {
      const files = await fs.readdir(this.options.storagePath);
      const sessionFiles = files.filter(file => file.endsWith('.json') && !file.includes('.backup.'));

      for (const file of sessionFiles) {
        const sessionId = file.replace('.json', '');
        try {
          await this.restoreSession(sessionId);
        } catch (error: any) {
          structuredLogger.warn('Failed to load session file', {
            file,
            error: error.message
          });
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }

  private startAutoSave(): void {
    setInterval(async () => {
      if (this.currentSessionId) {
        try {
          await this.saveSession(this.currentSessionId);
        } catch (error: any) {
          structuredLogger.error('Auto-save failed', error);
        }
      }
    }, this.options.autoSaveInterval * 60 * 1000);
  }

  private async createBackup(sessionId: string): Promise<string> {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.options.storagePath, `${sessionId}.backup.${timestamp}.json`);
    const originalPath = path.join(this.options.storagePath, `${sessionId}.json`);

    try {
      await fs.copyFile(originalPath, backupPath);
      
      // Clean up old backups
      await this.cleanupOldBackups(sessionId);

      return backupPath;
    } catch (error: any) {
      structuredLogger.warn('Failed to create backup', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  private async cleanupOldBackups(sessionId: string): Promise<void> {
    try {
      const files = await fs.readdir(this.options.storagePath);
      const backupFiles = files
        .filter(file => file.startsWith(`${sessionId}.backup.`))
        .sort((a, b) => b.localeCompare(a)); // Sort by timestamp (newest first)

      if (backupFiles.length > this.options.maxBackups) {
        const filesToDelete = backupFiles.slice(this.options.maxBackups);
        for (const file of filesToDelete) {
          await fs.unlink(path.join(this.options.storagePath, file));
        }
      }
    } catch (error) {
      // Ignore backup cleanup errors
    }
  }
}
