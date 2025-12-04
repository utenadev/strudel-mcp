// Pattern presets organized by genre
// These are example patterns that showcase Strudel's capabilities

export interface PatternPreset {
    id: string;
    name: string;
    genre: string;
    description: string;
    code: string;
    bpm?: number;
}

export const GENRE_PRESETS: Record<string, PatternPreset[]> = {
    jazz: [
        {
            id: 'jazz-swing',
            name: 'Swing Groove',
            genre: 'Jazz',
            description: 'Classic jazz swing rhythm with walking bass',
            code: `stack(
  s("hh*8").gain(0.4),
  s("~ bd ~ bd").gain(0.8),
  s("~ ~ sd ~").gain(0.6),
  note("<c2 e2 g2 a2>*2").s("sawtooth").lpf(400).gain(0.5)
).cpm(120)`,
            bpm: 120,
        },
        {
            id: 'jazz-ballad',
            name: 'Jazz Ballad',
            genre: 'Jazz',
            description: 'Slow, expressive jazz ballad',
            code: `stack(
  note("c4 e4 g4 b4").s("piano").gain(0.6).release(0.5),
  s("bd ~ ~ ~, ~ ~ hh ~").gain(0.4)
).cpm(60)`,
            bpm: 60,
        },
        {
            id: 'jazz-bebop',
            name: 'Bebop Run',
            genre: 'Jazz',
            description: 'Fast bebop-style melodic run',
            code: `note("c4 d4 e4 f4 g4 a4 b4 c5".fast(2))
  .s("piano")
  .gain(0.7)
  .cpm(180)`,
            bpm: 180,
        },
    ],

    edm: [
        {
            id: 'edm-house',
            name: 'House Beat',
            genre: 'EDM',
            description: 'Classic four-on-the-floor house beat',
            code: `stack(
  s("bd*4").gain(0.9),
  s("~ hh*2").gain(0.5),
  s("~ ~ sd ~").gain(0.7),
  note("c2 ~ c2 ~").s("sawtooth").lpf(800).gain(0.4)
).cpm(128)`,
            bpm: 128,
        },
        {
            id: 'edm-dubstep',
            name: 'Dubstep Drop',
            genre: 'EDM',
            description: 'Heavy dubstep wobble bass',
            code: `stack(
  s("bd ~ ~ bd, ~ sd ~ sd").gain(0.9),
  note("c1").s("sawtooth")
    .lpf(sine.range(200, 2000).slow(2))
    .gain(0.6)
).cpm(140)`,
            bpm: 140,
        },
        {
            id: 'edm-trance',
            name: 'Trance Arp',
            genre: 'EDM',
            description: 'Uplifting trance arpeggio',
            code: `stack(
  s("bd*4").gain(0.8),
  s("~ ~ hh ~").gain(0.4),
  note("c4 e4 g4 c5".fast(4)).s("triangle").lpf(3000).gain(0.5)
).cpm(138)`,
            bpm: 138,
        },
    ],

    synthpop: [
        {
            id: 'synthpop-retro',
            name: 'Retro Synth',
            genre: 'Synth-pop',
            description: '80s style synth pop groove',
            code: `stack(
  s("bd ~ bd ~, ~ sd ~ sd").gain(0.7),
  s("hh*8").gain(0.3),
  note("c3 c3 e3 g3".slow(2)).s("square").lpf(1500).gain(0.4)
).cpm(120)`,
            bpm: 120,
        },
        {
            id: 'synthpop-wave',
            name: 'New Wave',
            genre: 'Synth-pop',
            description: 'New wave inspired pattern',
            code: `stack(
  s("bd ~ ~ bd, ~ ~ sd ~").gain(0.8),
  note("<c4 e4> <g4 b4>".slow(2)).s("sawtooth").lpf(2000).release(0.3).gain(0.5)
).cpm(110)`,
            bpm: 110,
        },
    ],

    ambient: [
        {
            id: 'ambient-drone',
            name: 'Ambient Drone',
            genre: 'Ambient',
            description: 'Evolving ambient soundscape',
            code: `note("c2 e2 g2 b2".slow(8))
  .s("triangle")
  .lpf(sine.range(400, 1200).slow(16))
  .release(4)
  .gain(0.4)
  .cpm(40)`,
            bpm: 40,
        },
        {
            id: 'ambient-texture',
            name: 'Texture Pad',
            genre: 'Ambient',
            description: 'Layered ambient texture',
            code: `stack(
  note("c3").s("sine").release(8).gain(0.3),
  note("g3").s("triangle").release(8).gain(0.2).slow(2),
  note("e4").s("sine").release(8).gain(0.15).slow(4)
).cpm(30)`,
            bpm: 30,
        },
    ],

    hiphop: [
        {
            id: 'hiphop-boom',
            name: 'Boom Bap',
            genre: 'Hip-hop',
            description: 'Classic boom bap beat',
            code: `stack(
  s("bd ~ ~ bd, ~ ~ ~ ~, ~ sd ~ ~, ~ ~ ~ sd").gain(0.9),
  s("hh*4").gain(0.4),
  note("c2 ~ c2 ~").s("sawtooth").lpf(300).gain(0.5)
).cpm(90)`,
            bpm: 90,
        },
        {
            id: 'hiphop-trap',
            name: 'Trap Beat',
            genre: 'Hip-hop',
            description: 'Modern trap style beat',
            code: `stack(
  s("bd ~ ~ ~, ~ ~ bd ~, ~ ~ ~ bd").gain(0.9),
  s("~ sd ~ ~, ~ ~ ~ sd").gain(0.8),
  s("hh*16").gain(0.35)
).cpm(140)`,
            bpm: 140,
        },
    ],
};

export const ALL_PRESETS: PatternPreset[] = Object.values(GENRE_PRESETS).flat();

export const GENRES = Object.keys(GENRE_PRESETS);

export function getPresetsByGenre(genre: string): PatternPreset[] {
    return GENRE_PRESETS[genre.toLowerCase()] || [];
}

export function getPresetById(id: string): PatternPreset | undefined {
    return ALL_PRESETS.find(preset => preset.id === id);
}
