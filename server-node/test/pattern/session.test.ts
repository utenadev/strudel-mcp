import { SessionManager } from '../../src/pattern/session';
import { PatternHistoryManager } from '../../src/pattern/history';
import * as fs from 'fs/promises';
import * as path from 'path';
import { rmSync, mkdirSync } from 'fs';

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let patternHistory: PatternHistoryManager;
  const testStoragePath = path.join(__dirname, '../../../test-sessions');

  beforeEach(async () => {
    // Clean up test directory before each test
    try {
      rmSync(testStoragePath, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }

    patternHistory = new PatternHistoryManager();
    sessionManager = new SessionManager(patternHistory, {
      storagePath: testStoragePath,
      enableAutoSave: false
    });
  });

  afterEach(async () => {
    // Clean up test directory after each test
    try {
      rmSync(testStoragePath, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  });

  describe('createSession', () => {
    it('should create a new session with default metadata', async () => {
      const session = await sessionManager.createSession('Test Session');

      expect(session.id).toBeTruthy();
      expect(session.name).toBe('Test Session');
      expect(session.patterns).toHaveLength(0);
      expect(session.metadata.version).toBe('1.0.0');
      expect(session.metadata.tags).toEqual([]);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastModified).toBeInstanceOf(Date);
    });

    it('should create a session with custom metadata', async () => {
      const metadata = {
        author: 'test-user',
        description: 'Test session description',
        tags: ['test', 'demo'],
        tempo: 140
      };

      const session = await sessionManager.createSession('Custom Session', metadata);

      expect(session.metadata.author).toBe('test-user');
      expect(session.metadata.description).toBe('Test session description');
      expect(session.metadata.tags).toEqual(['test', 'demo']);
      expect(session.metadata.tempo).toBe(140);
    });

    it('should save session to storage', async () => {
      const session = await sessionManager.createSession('Test Session');
      
      // Check if file was created
      const sessionFiles = await fs.readdir(testStoragePath);
      expect(sessionFiles).toContain(`${session.id}.json`);

      // Check file content
      const filePath = path.join(testStoragePath, `${session.id}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const savedSession = JSON.parse(fileContent);
      
      expect(savedSession.name).toBe('Test Session');
      expect(savedSession.id).toBe(session.id);
    });
  });

  describe('addPatternToSession', () => {
    it('should add a pattern to the current session', async () => {
      const session = await sessionManager.createSession('Test Session');
      const pattern = "s('bd hh sd oh')";
      
      const storedPattern = await sessionManager.addPatternToSession('Test Pattern', pattern, 'test-user', ['drums']);

      expect(storedPattern.name).toBe('Test Pattern');
      expect(storedPattern.pattern).toBe(pattern);
      expect(storedPattern.metadata.author).toBe('test-user');
      expect(storedPattern.metadata.tags).toEqual(['drums']);
      expect(storedPattern.metadata.versions).toHaveLength(1);

      // Check session was updated
      const updatedSession = sessionManager.getCurrentSession();
      expect(updatedSession?.patterns).toHaveLength(1);
      expect(updatedSession?.patterns[0].id).toBe(storedPattern.id);
    });

    it('should throw error when no active session', async () => {
      expect(async () => {
        await sessionManager.addPatternToSession('Test', "s('bd')");
      }).rejects.toThrow('No active session');
    });
  });

  describe('updatePatternInSession', () => {
    it('should update an existing pattern', async () => {
      const session = await sessionManager.createSession('Test Session');
      const pattern = await sessionManager.addPatternToSession('Pattern', "s('bd hh')");
      
      const updatedPattern = await sessionManager.updatePatternInSession(
        pattern.id, 
        "s('bd hh sd oh')", 
        'test-user', 
        ['drums', 'full']
      );

      expect(updatedPattern.pattern).toBe("s('bd hh sd oh')");
      expect(updatedPattern.metadata.tags).toEqual(['drums', 'full']);
      expect(updatedPattern.metadata.versions).toHaveLength(2);
    });

    it('should throw error for non-existent pattern', async () => {
      await sessionManager.createSession('Test Session');
      
      expect(async () => {
        await sessionManager.updatePatternInSession('non-existent', "s('bd')");
      }).rejects.toThrow('Pattern non-existent not found in session');
    });
  });

  describe('saveSession and restoreSession', () => {
    it('should save and restore session with patterns', async () => {
      const originalSession = await sessionManager.createSession('Test Session');
      await sessionManager.addPatternToSession('Pattern 1', "s('bd hh')");
      await sessionManager.addPatternToSession('Pattern 2', "s('sd oh')");

      // Create new manager instance and restore
      const newManager = new SessionManager(patternHistory, {
        storagePath: testStoragePath,
        enableAutoSave: false
      });

      const restoredSession = await newManager.restoreSession(originalSession.id);

      expect(restoredSession.id).toBe(originalSession.id);
      expect(restoredSession.name).toBe('Test Session');
      expect(restoredSession.patterns).toHaveLength(2);
      expect(restoredSession.patterns[0].pattern).toBe("s('bd hh')");
      expect(restoredSession.patterns[1].pattern).toBe("s('sd oh')");
    });

    it('should throw error for non-existent session', async () => {
      expect(async () => {
        await sessionManager.restoreSession('non-existent');
      }).rejects.toThrow('Failed to restore session non-existent');
    });
  });

  describe('listSessions', () => {
    it('should list all sessions sorted by last modified', async () => {
      const session1 = await sessionManager.createSession('Session 1');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      
      const session2 = await sessionManager.createSession('Session 2');
      
      const sessions = sessionManager.listSessions();
      
      expect(sessions).toHaveLength(2);
      expect(sessions[0].name).toBe('Session 2'); // Most recently modified first
      expect(sessions[1].name).toBe('Session 1');
    });
  });

  describe('switchSession', () => {
    it('should switch to a different session', async () => {
      const session1 = await sessionManager.createSession('Session 1');
      const session2 = await sessionManager.createSession('Session 2');
      
      expect(sessionManager.getCurrentSession()?.id).toBe(session2.id);
      
      const switchedSession = sessionManager.switchSession(session1.id);
      
      expect(switchedSession.id).toBe(session1.id);
      expect(sessionManager.getCurrentSession()?.id).toBe(session1.id);
    });

    it('should throw error for non-existent session', () => {
      expect(() => {
        sessionManager.switchSession('non-existent');
      }).toThrow('Session non-existent not found');
    });
  });

  describe('deleteSession', () => {
    it('should delete a session and its file', async () => {
      const session = await sessionManager.createSession('Test Session');
      await sessionManager.addPatternToSession('Pattern', "s('bd')");
      
      await sessionManager.deleteSession(session.id);

      expect(sessionManager.sessions.has(session.id)).toBe(false);
      
      const sessionFiles = await fs.readdir(testStoragePath);
      expect(sessionFiles).not.toContain(`${session.id}.json`);
    });

    it('should handle deletion of current session', async () => {
      const session1 = await sessionManager.createSession('Session 1');
      const session2 = await sessionManager.createSession('Session 2');
      
      await sessionManager.deleteSession(session2.id);
      
      expect(sessionManager.getCurrentSession()?.id).toBe(session1.id);
    });
  });

  describe('exportSession', () => {
    beforeEach(async () => {
      const session = await sessionManager.createSession('Test Session');
      await sessionManager.addPatternToSession('Pattern 1', "s('bd hh')");
      await sessionManager.addPatternToSession('Pattern 2', "s('sd oh')");
    });

    it('should export session as JSON', async () => {
      const session = sessionManager.getCurrentSession()!;
      const exported = await sessionManager.exportSession(session.id, 'json');

      const data = JSON.parse(exported);
      expect(data.session.name).toBe('Test Session');
      expect(data.session.patterns).toHaveLength(2);
      expect(data.patterns).toHaveLength(2);
    });

    it('should export session as strudel patterns', async () => {
      const session = sessionManager.getCurrentSession()!;
      const exported = await sessionManager.exportSession(session.id, 'strudel');

      expect(exported).toContain("// Pattern 1");
      expect(exported).toContain("s('bd hh')");
      expect(exported).toContain("// Pattern 2");
      expect(exported).toContain("s('sd oh')");
    });
  });

  describe('importSession', () => {
    it('should import session from JSON', async () => {
      const sessionData = {
        name: 'Imported Session',
        patterns: [
          {
            name: 'Imported Pattern 1',
            pattern: "s('bd hh')",
            metadata: { tags: ['imported'] }
          }
        ],
        metadata: {
          author: 'import-user',
          tags: ['test']
        }
      };

      const session = await sessionManager.importSession(JSON.stringify(sessionData), 'json');

      expect(session.name).toBe('Imported Session');
      expect(session.patterns).toHaveLength(1);
      expect(session.patterns[0].name).toBe('Imported Pattern 1');
      expect(session.patterns[0].pattern).toBe("s('bd hh')");
      expect(session.metadata.author).toBe('import-user');
    });

    it('should import strudel patterns as session', async () => {
      const strudelData = `
              // Drum pattern
              s('bd hh sd oh')
              
              // Melody pattern
              note("c4 e4 g4")
          `.trim();

      const session = await sessionManager.importSession(strudelData, 'strudel');

      expect(session.name).toBe('Imported Session');
      expect(session.patterns).toHaveLength(2);
      expect(session.patterns[0].pattern).toContain("s('bd hh sd oh')");
    });

    it('should handle malformed JSON', async () => {
      expect(async () => {
        await sessionManager.importSession('invalid json', 'json');
      }).rejects.toThrow('Failed to import JSON session');
    });
  });

  describe('backup functionality', () => {
    it('should create backup when saving session', async () => {
      const session = await sessionManager.createSession('Test Session');
      await sessionManager.addPatternToSession('Pattern', "s('bd')");

      // Trigger second save to create backup
      await sessionManager.saveSession(session.id);

      const files = await fs.readdir(testStoragePath);
      const backupFiles = files.filter(file => file.includes('.backup.'));
      
      expect(backupFiles.length).toBeGreaterThan(0);
    });
  });
});
