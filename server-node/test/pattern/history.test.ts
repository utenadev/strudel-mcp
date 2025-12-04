import { PatternHistoryManager, PatternHistoryEntry } from '../../src/pattern/history';

describe('PatternHistoryManager', () => {
  let manager: PatternHistoryManager;

  beforeEach(() => {
    manager = new PatternHistoryManager();
  });

  describe('addPattern', () => {
    it('should add a new pattern to history', () => {
      const pattern = "s('bd hh sd oh')";
      const id = manager.addPattern(pattern, 'test-user', ['drums']);

      expect(id).toBeTruthy();
      const history = manager.getPatternHistory(id);
      expect(history).toHaveLength(1);
      expect(history[0].pattern).toBe(pattern);
      expect(history[0].author).toBe('test-user');
      expect(history[0].tags).toContain('drums');
    });

    it('should detect create type for first pattern', () => {
      const pattern = "s('bd hh sd oh')";
      const id = manager.addPattern(pattern);

      const history = manager.getPatternHistory(id);
      expect(history[0].changeType).toBe('create');
    });

    it('should detect modify type for subsequent patterns', () => {
      const pattern1 = "s('bd hh sd oh')";
      const pattern2 = "s('bd*2 hh*4')";
      
      manager.addPattern(pattern1);
      const id2 = manager.addPattern(pattern2);

      const history = manager.getPatternHistory(id2);
      expect(history[0].changeType).toBe('modify');
    });
  });

  describe('getPatternHistory', () => {
    it('should return complete history for pattern', () => {
      const pattern1 = "s('bd hh sd oh')";
      const pattern2 = "s('bd*2 hh*4')";
      const pattern3 = "s('bd sd, hh*4')";

      manager.addPattern(pattern1);
      const id2 = manager.addPattern(pattern2);
      manager.addPattern(pattern3);

      const history = manager.getPatternHistory(id2);
      expect(history).toHaveLength(2); // pattern2 and its parent pattern1
      expect(history[0].pattern).toBe(pattern2);
      expect(history[1].pattern).toBe(pattern1);
    });

    it('should return all history when no patternId specified', () => {
      manager.addPattern("s('bd hh sd oh')");
      manager.addPattern("s('bd*2 hh*4')");

      const allHistory = manager.getPatternHistory();
      expect(allHistory).toHaveLength(2);
    });
  });

  describe('restorePatternVersion', () => {
    it('should restore a pattern to previous version', () => {
      const pattern1 = "s('bd hh sd oh')";
      const pattern2 = "s('bd*2 hh*4')";
      
      manager.addPattern(pattern1);
      const id2 = manager.addPattern(pattern2);

      const restoredId = manager.restorePatternVersion(id2);
      const history = manager.getPatternHistory(restoredId);

      expect(history[0].pattern).toBe(pattern2);
      expect(history[0].tags).toContain('restored');
    });

    it('should throw error for non-existent history ID', () => {
      expect(() => {
        manager.restorePatternVersion('non-existent');
      }).toThrow('History entry non-existent not found');
    });
  });

  describe('createBranch', () => {
    it('should create a branch from existing pattern', () => {
      const pattern = "s('bd hh sd oh')";
      const id1 = manager.addPattern(pattern);

      const branchId = manager.createBranch(id1, 'test-branch');
      
      expect(branchId).toBeTruthy();
      const branchEntry = manager.getPatternHistory(branchId)[0];
      expect(branchEntry.pattern).toBe(pattern);
      expect(branchEntry.tags).toContain('branch-test-branch');
      expect(branchEntry.changeType).toBe('create');
    });
  });

  describe('analyzePattern', () => {
    it('should extract instruments from pattern', () => {
      const pattern = "s('bd hh sd oh')";
      manager.addPattern(pattern);

      const history = manager.getPatternHistory();
      const metadata = history[0].metadata;

      expect(metadata.instruments).toContain('bd');
      expect(metadata.instruments).toContain('hh');
      expect(metadata.instruments).toContain('sd');
      expect(metadata.instruments).toContain('oh');
    });

    it('should extract effects from pattern', () => {
      const pattern = "s('bd hh sd oh').fast(2).gain(0.5).room(0.3)";
      manager.addPattern(pattern);

      const history = manager.getPatternHistory();
      const metadata = history[0].metadata;

      expect(metadata.effects).toContain('fast');
      expect(metadata.effects).toContain('gain');
      expect(metadata.effects).toContain('room');
    });

    it('should calculate pattern complexity', () => {
      const simplePattern = "s('bd')";
      const complexPattern = "s('<bd!3 [bd ~ bd]> sd, hh27(3,4,1)";

      manager.addPattern(simplePattern);
      const simpleHistory = manager.getPatternHistory();
      
      manager.addPattern(complexPattern); // Add as separate
      const complexHistory = manager.getPatternHistory()
        .find(h => h.pattern === complexPattern)!;

      expect(complexHistory.metadata.complexity).toBeGreaterThan(
        simpleHistory[0].metadata.complexity
      );
    });
  });

  describe('searchPatterns', () => {
    beforeEach(() => {
      manager.addPattern("s('bd hh sd oh')", 'user1', ['drums', 'basic']);
      manager.addPattern("s('bd*2 hh*4').fast(2)", 'user2', ['drums', 'fast']);
      manager.addPattern("s('bd sd, hh*4').room(0.5)", 'user1', ['drums', 'reverb']);
    });

    it('should search by content', () => {
      const results = manager.searchPatterns('hh*4');
      expect(results).toHaveLength(2); // Two patterns contain hh*4
    });

    it('should search with filters', () => {
      const filters = {
        author: 'user1'
      };
      const results = manager.searchPatterns('', filters);
      expect(results).toHaveLength(2); // Two patterns by user1
    });

    it('should search by tags', () => {
      const filters = {
        tags: ['basic']
      };
      const results = manager.searchPatterns('', filters);
      expect(results).toHaveLength(1); // One pattern has 'basic' tag
    });
  });

  describe('getStatistics', () => {
    it('should return pattern statistics', () => {
      manager.addPattern("s('bd hh sd oh')", 'user1');
      manager.addPattern("s('bd*2 hh*4')", 'user2');
      manager.addPattern("s('bd sd, hh*4')", 'user1');

      const stats = manager.getStatistics();

      expect(stats.totalPatterns).toBe(3);
      expect(stats.changeTypes.create).toBe(1);
      expect(stats.changeTypes.modify).toBe(2);
      expect(stats.topInstruments[0].instrument).toBe('bd');
    });
  });

  describe('cleanupOldEntries', () => {
    it('should remove old entries when retention period is set', () => {
      // Create manager with short retention period
      const shortRetentionManager = new PatternHistoryManager({
        retentionPeriod: 1 // 1 day
      });

      shortRetentionManager.addPattern("s('bd hh sd oh')");

      // Simulate old entry by directly manipulating timestamp
      const history = (shortRetentionManager as any).history;
      history[0].timestamp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      // Add a new pattern (this will trigger cleanup)
      shortRetentionManager.addPattern("s('bd*2 hh*4')");

      const finalHistory = (shortRetentionManager as any).history;
      expect(finalHistory).toHaveLength(1); // Only the new pattern should remain
    });
  });
});
