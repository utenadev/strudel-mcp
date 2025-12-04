import { describe, it, expect } from 'vitest';
import {
    GENRE_PRESETS,
    ALL_PRESETS,
    GENRES,
    getPresetsByGenre,
    getPresetById
} from './patterns';

describe('Pattern Presets', () => {
    describe('GENRES', () => {
        it('should have at least 5 genres', () => {
            expect(GENRES.length).toBeGreaterThanOrEqual(5);
        });

        it('should include jazz, edm, synthpop, ambient, hiphop', () => {
            expect(GENRES).toContain('jazz');
            expect(GENRES).toContain('edm');
            expect(GENRES).toContain('synthpop');
            expect(GENRES).toContain('ambient');
            expect(GENRES).toContain('hiphop');
        });
    });

    describe('GENRE_PRESETS', () => {
        it('should have presets for each genre', () => {
            for (const genre of GENRES) {
                expect(GENRE_PRESETS[genre]).toBeDefined();
                expect(GENRE_PRESETS[genre].length).toBeGreaterThan(0);
            }
        });

        it('each preset should have required fields', () => {
            for (const presets of Object.values(GENRE_PRESETS)) {
                for (const preset of presets) {
                    expect(preset.id).toBeDefined();
                    expect(preset.name).toBeDefined();
                    expect(preset.genre).toBeDefined();
                    expect(preset.description).toBeDefined();
                    expect(preset.code).toBeDefined();
                    expect(preset.code.length).toBeGreaterThan(0);
                }
            }
        });
    });

    describe('ALL_PRESETS', () => {
        it('should contain all presets from all genres', () => {
            const totalFromGenres = Object.values(GENRE_PRESETS)
                .reduce((sum, presets) => sum + presets.length, 0);
            expect(ALL_PRESETS.length).toBe(totalFromGenres);
        });

        it('should have unique ids', () => {
            const ids = ALL_PRESETS.map(p => p.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });

    describe('getPresetsByGenre', () => {
        it('should return presets for valid genre', () => {
            const jazzPresets = getPresetsByGenre('jazz');
            expect(jazzPresets.length).toBeGreaterThan(0);
            expect(jazzPresets.every(p => p.genre === 'Jazz')).toBe(true);
        });

        it('should be case insensitive', () => {
            expect(getPresetsByGenre('JAZZ')).toEqual(getPresetsByGenre('jazz'));
            expect(getPresetsByGenre('EDM')).toEqual(getPresetsByGenre('edm'));
        });

        it('should return empty array for unknown genre', () => {
            expect(getPresetsByGenre('unknown')).toEqual([]);
        });
    });

    describe('getPresetById', () => {
        it('should return preset for valid id', () => {
            const preset = getPresetById('jazz-swing');
            expect(preset).toBeDefined();
            expect(preset?.name).toBe('Swing Groove');
        });

        it('should return undefined for unknown id', () => {
            expect(getPresetById('unknown-id')).toBeUndefined();
        });
    });
});
