import { PatternExportManager } from '../../src/pattern/export';
import { PatternHistoryManager } from '../../src/pattern/history';
import { SessionManager } from '../../src/pattern/session';

describe('PatternExportManager', () => {
  let exportManager: PatternExportManager;
  let patternHistory: PatternHistoryManager;
  let sessionManager: SessionManager;

  beforeEach(() => {
    patternHistory = new PatternHistoryManager();
    sessionManager = new SessionManager(patternHistory, { enableAutoSave: false });
    exportManager = new PatternExportManager(patternHistory, sessionManager);
  });

  describe('exportPatternAsJson', () => {
    it('should export pattern as JSON', () => {
      const pattern = "s('bd hh sd oh')";
      const historyId = patternHistory.addPattern(pattern, 'test-user', ['drums']);

      const result = exportManager.exportPatternAsJson(historyId);

      expect(result.format).toBe('json');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.compatibility).toContain('strudel-mcp-v1');

      const parsed = JSON.parse(result.content);
      expect(parsed.pattern).toBe(pattern);
    });

    it('should include metadata when requested', () => {
      const pattern = "s('bd hh sd oh')";
      const historyId = patternHistory.addPattern(pattern, 'test-user', ['drums']);

      const result = exportManager.exportPatternAsJson(historyId, {
        includeMetadata: true
      });

      const parsed = JSON.parse(result.content);
      expect(parsed.metadata.author).toBe('test-user');
      expect(parsed.metadata.tags).toContain('drums');
      expect(parsed.metadata.complexity).toBeGreaterThan(0);
    });

    it('should throw error for non-existent pattern', () => {
      expect(() => {
        exportManager.exportPatternAsJson('non-existent');
      }).toThrow('Pattern non-existent not found');
    });
  });

  describe('exportPatternAsStrudel', () => {
    it('should export pattern as Strudel format', () => {
      const pattern = "s('bd hh sd oh')";
      const result = exportManager.exportPatternAsStrudel(pattern);

      expect(result.format).toBe('strudel');
      expect(result.content).toBe(pattern);
      expect(result.metadata.compatibility).toContain('strudel-cc');
    });

    it('should include metadata when requested', () => {
      const pattern = "s('bd hh sd oh')";
      const result = exportManager.exportPatternAsStrudel(pattern, {
        includeMetadata: true
      });

      expect(result.content).toContain('// Exported by Strudel MCP');
      expect(result.content).toContain('// Exported at:');
      expect(result.content).toContain(pattern);
    });
  });

  describe('exportSession', () => {
    beforeEach(async () => {
      const session = await sessionManager.createSession('Test Session', {
        author: 'test-user',
        tags: ['test']
      });
      await sessionManager.addPatternToSession('Pattern 1', "s('bd hh')");
      await sessionManager.addPatternToSession('Pattern 2', "s('sd oh')");
    });

    it('should export session as JSON', () => {
      const sessions = sessionManager.listSessions();
      const sessionId = sessions[0].id;

      const result = exportManager.exportSession(sessionId, 'json');

      expect(result.format).toBe('json');
      const parsed = JSON.parse(result.content);
      expect(parsed.session.name).toBe('Test Session');
      expect(parsed.patterns).toHaveLength(2);
    });

    it('should export session as Strudel', () => {
      const sessions = sessionManager.listSessions();
      const sessionId = sessions[0].id;

      const result = exportManager.exportSession(sessionId, 'strudel');

      expect(result.format).toBe('strudel');
      expect(result.content).toContain('// Session: Test Session');
      expect(result.content).toContain("s('bd hh')");
      expect(result.content).toContain("s('sd oh')");
    });

    it('should export session as backup', () => {
      const sessions = sessionManager.listSessions();
      const sessionId = sessions[0].id;

      const result = exportManager.exportSession(sessionId, 'backup');

      expect(result.format).toBe('backup');
      const parsed = JSON.parse(result.content);
      expect(parsed.session.name).toBe('Test Session');
      expect(parsed.version).toBe('1.0.0');
    });

    it('should throw error for non-existent session', () => {
      expect(() => {
        exportManager.exportSession('non-existent', 'json');
      }).toThrow('Session non-existent not found');
    });
  });

  describe('importPatternFromJson', () => {
    it('should import pattern from JSON', async () => {
      const jsonData = JSON.stringify({
        pattern: "s('bd hh sd oh')",
        metadata: {
          author: 'import-user',
          tags: ['imported']
        }
      });

      const historyId = await exportManager.importPatternFromJson(jsonData);

      const history = patternHistory.getPatternHistory(historyId);
      expect(history[0].pattern).toBe("s('bd hh sd oh')");
      expect(history[0].author).toBe('import-user');
      expect(history[0].tags).toContain('imported');
    });

    it('should throw error for invalid JSON', async () => {
      await expect(async () => {
        await exportManager.importPatternFromJson('invalid json');
      }).rejects.toThrow('Failed to import pattern');
    });

    it('should throw error for missing pattern field', async () => {
      const jsonData = JSON.stringify({
        metadata: {
          author: 'test'
        }
      });

      await expect(async () => {
        await exportManager.importPatternFromJson(jsonData);
      }).rejects.toThrow('Invalid pattern data: missing or invalid pattern field');
    });
  });

  describe('importPatternFromStrudel', () => {
    it('should import pattern from Strudel format', async () => {
      const strudelPattern = "s('bd hh sd oh').fast(2)";

      const historyId = await exportManager.importPatternFromStrudel(strudelPattern);

      const history = patternHistory.getPatternHistory(historyId);
      expect(history[0].pattern).toBe(strudelPattern);
      expect(history[0].author).toBe('import');
      expect(history[0].tags).toContain('imported');
    });

    it('should ignore comments in Strudel content', async () => {
      const strudelContent = `
        // This is a comment
        s('bd hh sd oh')
        // Another comment
      `.trim();

      const historyId = await exportManager.importPatternFromStrudel(strudelContent);

      const history = patternHistory.getPatternHistory(historyId);
      expect(history[0].pattern).toBe("s('bd hh sd oh')");
      expect(history[0].tags).toContain('imported');
    });

    it('should throw error for invalid Strudel pattern', async () => {
      const invalidPattern = "invalid content";

      await expect(async () => {
        await exportManager.importPatternFromStrudel(invalidPattern);
      }).rejects.toThrow('Invalid Strudel pattern: missing s() or note() function');
    });
  });

  describe('validatePattern', () => {
    it('should validate correct pattern', () => {
      const pattern = "s('bd hh sd oh')";
      const result = exportManager.validatePattern(pattern);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should find syntax errors', () => {
      const pattern = "s('bd hh sd oh"; // Missing closing parenthesis
      const result = exportManager.validatePattern(pattern);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unbalanced parentheses: 1 open, 0 close');
    });

    it('should provide warnings for potentially invalid patterns', () => {
      const pattern = "some random text";
      const result = exportManager.validatePattern(pattern);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Pattern might not be a valid Strudel pattern');
    });

    it('should detect dangerous code', () => {
      const pattern = "s('bd') eval('dangerous')";
      const result = exportManager.validatePattern(pattern);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Potentially dangerous code detected: eval(');
    });
  });

  describe('convertPattern', () => {
    it('should convert from JSON to Strudel', () => {
      const jsonContent = JSON.stringify({
        pattern: "s('bd hh sd oh')"
      });

      const result = exportManager.convertPattern(jsonContent, 'json', 'strudel');

      expect(result).toBe("s('bd hh sd oh')");
    });

    it('should convert from Strudel to JSON', () => {
      const strudelContent = "s('bd hh sd oh')";

      const result = exportManager.convertPattern(strudelContent, 'strudel', 'json');
      const parsed = JSON.parse(result);

      expect(parsed.pattern).toBe("s('bd hh sd oh')");
      expect(parsed.metadata.converted).toBe(true);
    });

    it('should throw error for unsupported input format', () => {
      expect(() => {
        exportManager.convertPattern('content', 'unsupported', 'json');
      }).toThrow('Unsupported input format: unsupported');
    });

    it('should throw error for unsupported output format', () => {
      expect(() => {
        exportManager.convertPattern('content', 'json', 'unsupported');
      }).toThrow('Unsupported output format: unsupported');
    });
  });
});
