import { noteToMidi, valueToMidi, Pattern, evalScope } from '@strudel/core';
import { aliasBank, registerSynthSounds, registerZZFXSounds, samples } from '@strudel/webaudio';
import * as core from '@strudel/core';

export async function prebake() {
  const modulesLoading = evalScope(
    core,
    import('@strudel/draw'),
    import('@strudel/mini'),
    import('@strudel/tonal'),
    import('@strudel/webaudio'),
    import('@strudel/codemirror'),
    import('@strudel/hydra'),
    import('@strudel/soundfonts'),
    import('@strudel/midi'),
  );

  const ds = 'https://raw.githubusercontent.com/felixroos/dough-samples/main';
  const ts = 'https://raw.githubusercontent.com/todepond/samples/main';
  const tc = 'https://raw.githubusercontent.com/tidalcycles/uzu-drumkit/main';

  await Promise.all([
    modulesLoading,
    registerSynthSounds(),
    registerZZFXSounds(),
    import('@strudel/soundfonts').then(({ registerSoundfonts }) => registerSoundfonts()),
    samples(`${ds}/tidal-drum-machines.json`),
    samples(`${ds}/piano.json`),
    samples(`${ds}/Dirt-Samples.json`),
    samples(`${ds}/vcsl.json`),
    samples(`${ds}/mridangam.json`),
    samples(`${tc}/strudel.json`),
  ]);

  aliasBank(`${ts}/tidal-drum-machines-alias.json`);
}

const maxPan = noteToMidi('C8');
const panwidth = (pan: number, width: number) => pan * width + (1 - width) / 2;

(Pattern.prototype as any).piano = function () {
  return this.fmap((v: any) => ({ ...v, clip: v.clip ?? 1 }))
    .s('piano')
    .release(0.1)
    .fmap((value: any) => {
      const midi = valueToMidi(value);
      const pan = panwidth(Math.min(Math.round(midi) / maxPan, 1), 0.5);
      return { ...value, pan: (value.pan || 1) * pan };
    });
};
