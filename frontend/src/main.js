// Strudel MCP WebSocket Client - Clean Version
import './style.css'

// WebSocket and Audio management
let ws = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let audioContext = null;
let activePattern = null;
let synthesizer = null;

// Advanced Strudel Synthesizer Class
class StrudelSynthesizer {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.sampleLibrary = this.buildSampleLibrary();
        this.presets = this.buildPresets();
        this.audioContext = audioContext;
    }

    buildSampleLibrary() {
        return {
            drums: {
                bd: { name: 'Bass Drum', class: 'kick' },
                sd: { name: 'Snare Drum', class: 'snare' },
                hh: { name: 'Hi-Hat', class: 'hihat' },
                oh: { name: 'Open Hat', class: 'hihat' },
                lt: { name: 'Low Tom', class: 'tom' },
                mt: { name: 'Mid Tom', class: 'tom' },
                ht: { name: 'High Tom', class: 'tom' },
                clap: { name: 'Clap', class: 'percussion' },
                rim: { name: 'Rim Shot', class: 'percussion' },
                cowbell: { name: 'Cowbell', class: 'percussion' }
            },
            melodic: {
                piano: { name: 'Piano', class: 'sustained' },
                synth: { name: 'Synth', class: 'sustained' },
                organ: { name: 'Organ', class: 'sustained' },
                guitar: { name: 'Guitar', class: 'sustained' },
                strings: { name: 'Strings', class: 'sustained' }
            },
            effects: {
                reverb: { type: 'convolution' },
                delay: { type: 'feedback' },
                compressor: { type: 'dynamics' },
                filter: { type: 'spectral' }
            }
        };
    }

    buildPresets() {
        return {
            'basic-beat': {
                name: 'Basic Beat',
                description: 'Simple kick-snare-hat pattern',
                sounds: ['bd', 'sd', 'hh', 'hh']
            },
            'funk-groove': {
                name: 'Funk Groove',
                description: 'Funk rhythm with syncopation',
                sounds: ['bd', 'states', 'clap', 'hh']
            },
            'techno-loop': {
                name: 'Techno Loop',
                description: '4-on-the-floor techno beat',
                sounds: ['kick', 'snare', 'hh', 'oh', 'clap']
            },
            'jazz-trio': {
                name: 'Jazz Trio',
                description: 'Jazz trio with walking bass',
                sounds: ['bass', 'piano', 'drums']
            }
        };
    }

    // 创建基础振荡器
    createOscillator(type = 'sine', frequency = 440) {
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        return osc;
    }

    // 创建增益节点
    createGain(gain = 1) {
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
        return gainNode;
    }

    // 创建滤波器
    createFilter(type = 'lowpass', frequency = 1000, Q = 1) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        filter.Q.setValueAtTime(Q, this.ctx.currentTime);
        return filter;
    }

    // 创建延迟效果
    createDelay(delayTime = 0.3, feedback = 0.4) {
        const delay = this.ctx.createDelay(delayTime);
        const feedback = this.ctx.createGain();
        
        feedback.gain.setValueAtTime(feedback, this.ctx.currentTime);
        
        // 连接延迟反馈环路
        delay.connect(feedback);
        feedback.connect(delay);
        
        return { delay, feedback };
    }

    // 创建混响效果
    createReverb() {
        const convolver = this.ctx.createConvolver();
        const wetGain = this.ctx.createGain();
        const dryGain = this.ctx.createGain();
        
        wetGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        dryGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        
        return { convolver, wetGain, dryGain };
    }

    // FM合成器
    createFMSynth(carrier = 2, ratio = 1.5) {
        const carrier = this.createOscillator('sine');
        const modulator = this.createOscillator('sine');
        const carrierGain = this.createGain();
        const modulatorGain = this.createGain();
        
        carrierGain.gain.setValueAtTime(1, this.ctx.currentTime);
        modulatorGain.gain.setValueAtTime(carrier * carrier, this.ctx.currentTime);
        
        carrier.frequency.setValueAtTime(220, this.ctx.currentTime);
        modulator.frequency.setValueAtTime(110, this.ctx.currentTime);
        modulator.type = 'sine';
        
        modulator.connect(modulatorGain);
        modulatorGain.connect(carrier.frequency);
        carrier.connect(carrierGain);
        
        return { carrier, modulator };
    }

    // 加算合成器
    createAdditiveSynthesizer(frequencies = [220, 440, 880, 1760]) {
        const gains = frequencies.map(() => this.createGain());
        
        const oscillators = frequencies.map(freq => {
            const osc = this.createOscillator('sine');
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            return osc;
        });
        
        return { oscillators, gains };
    }

    // 噪音源（模拟类噪音）
    createNoiseSource(type = 'white') {
        const bufferSize = this.ctx.sampleRate * 2; // 2秒
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        if (type === 'white') {
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1);
            }
        } else if (type === 'pink') {
            for (let i = 0; i < bufferSize; i++) {
                // 简化版粉红色噪音生成
                data[i] = this.generatePinkNoiseSample(i);
            }
        } else if (type === 'brown') {
            // 简化版褐色噪音生成
            data[i] = this.generateBrownNoiseSample(i, data);
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        return noise;
    }

    generatePinkNoiseSample(index) {
        // 简化版粉红色噪音生成
        const x = Math.random() - 0.5;
        return x / (1.0 + Math.abs(x));
    }

    generateBrownNoiseSample(index, data) {
        // 简化版褐色噪音生成（使用之前的值）
        if (index === 0) {
            return (Math.random() - 0.5) * 0.1;
        }
        return data[index - 1] + (Math.random() - 0.5) * 0.01;
    }

    // 播放声音样本
    playSample(sampleName, options = {}) {
        const sampleInfo = this.sampleLibrary.drums[sampleName] || 
                         this.sampleLibrary.melodic[sampleName] ||
                         this.sampleLibrary.effects[sampleName];
        
        if (!sampleInfo) {
            console.warn(`Sample "${sampleName}" not found`);
            return null;
        }

        const soundNode = this.buildSoundGenerator(sampleInfo, options);
        this.scheduleSound(soundNode, 0, 1);
        
        return soundNode;
    }

    buildSoundGenerator(sampleInfo, options = {}) {
        const {
            waveform = 'sine',
            frequency = 440,
            gain = 1,
            envelope = {
                attack: 0.01,
                decay: 0.1,
                sustain: 0.3,
                release: 0.1
            },
            filter = {
                enabled: false,
                frequency: 2000,
                type: 'lowpass',
                Q: 1
            },
            effects = {
                delay: false,
                reverb: false,
                compressor: false
            },
            modulation = {
                fmEnabled: false,
                vibrato: false,
                tremolo: false
            }
        } = { ...options, ...sampleInfo };

        return {
            sampleInfo,
            waveform,
            frequency,
            gain,
            envelope,
            filter,
            effects,
            modulation
        };
    }

    scheduleSound(soundGenerator, startTime, duration) {
        const start = this.ctx.currentTime + startTime;
        const end = start + duration;
        
        const oscillator = this.createOscillator(soundGenerator.waveform, soundGenerator.frequency);
        const gainNode = this.createGain(soundGenerator.gain);
        const filterNode = soundGenerator.filter.enabled ? 
            this.createFilter(soundGenerator.filter.type, soundGenerator.filter.frequency, soundGenerator.filter.Q) : null;
        
        // ADSR包络
        gainNode.gain.setValueAtTime(0, start);
        gainNode.gain.linearRampToValueAtTime(soundGenerator.gain, start + soundGenerator.envelope.attack);
        gainNode.gain.linearRampToValueAtTime(soundGenerator.envelope.sustain, start + soundGenerator.envelope.attack + soundGenerator.envelope.decay);
        gainNode.gain.setValueAtTime(soundGenerator.gain * soundGenerator.envelope.sustain, start + soundGenerator.envelope.attack + soundGenerator.envelope.decay + soundGenerator.envelope.sustain);
        gainNode.gain.linearRampToValueAtTime(0.001, end);

        // 连接音频图
        if (filterNode) {
            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
        } else {
            oscillator.connect(gainNode);
        }
        
        gainNode.connect(this.ctx.destination);
        
        oscillator.start(start);
        oscillator.stop(end);
        
        return { oscillator, gainNode, filterNode };
    }

    // 创建立体声效果
    createStereoPan(panPosition = 0) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(panPosition, this.ctx.currentTime);
        return panner;
    }

    // 实时参数控制节点
    createControlParameter(initialValue = 0) {
        const param = this.createParamNode(initialValue);
        return param;
    }

    createParamNode(initialValue = 0) {
        const param = {
            value: initialValue,
            lastTime: this.ctx.currentTime,
            setValue: (value, time) => {
                param.value = value;
                param.lastTime = time || this.ctx.currentTime;
                // 这里可以记录参数变化历史用于可视化
            },
            getValue: () => param.value,
            automate: (automationPattern) => {
                // 实现参数自动化
                // automationPatternは时间-值对数或多個值-时间对数的数组
                // 格式: [{time: 0.5, value: 100}, {time: 1.0, value: 200}]
                if (!Array.isArray(automationPattern)) {
                    automationPattern = [{time: 0, value: automationPattern}];
                }
                // 实现自动化逻辑
                automationPattern.forEach(point => {
                    if (point.time >= 0) {
                        param.setValue(point.value, point.time);
                    }
                });
            }
        };
        
        return param;
    }
}

// Initialize audio context
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        synthesizer = new StrudelSynthesizer(audioContext);
        
        if (!soundFuncs) {
            soundFuncs = {
                'bd': () => synthesizer.playSample('bd', {
                    waveform: 'sine',
                    frequency: 60,
                    gain: 1,
                    envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 }
                }),
                'hh': () => synthesizer.playSample('hh', {
                    waveform: 'square',
                    frequency: 800,
                    gain: 0.1,
                    envelope: { attack: 0.01, decay: 0.05, sustain: 0.1, release: 0.01 }
                }),
                'oh': () => synthesizer.playSample('oh', {
                    waveform: 'sawtooth',
                    frequency: 400,
                    gain: 0.1,
                    envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2 }
                }),
                'sd': () => synthesizer.playSample('sd', {
                    waveform: 'triangle',
                    frequency: 200,
                    gain: 0.3,
                    envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.05 }
                })
            };
        }
    }
    return audioContext;
}

// Initialize audio context
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (!soundFuncs) {
            const ctx = audioContext;
            soundFuncs = {
                'bd': () => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.frequency.setValueAtTime(60, ctx.currentTime);
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(1, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.1);
                },
                'hh': () => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.frequency.setValueAtTime(800, ctx.currentTime);
                    osc.type = 'square';
                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.05);
                },
                'oh': () => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.frequency.setValueAtTime(400, ctx.currentTime);
                    osc.type = 'sawtooth';
                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.2);
                },
                'sd': () => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const noise = ctx.createBufferSource();
                    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
                    const data = noiseBuffer.getChannelData(0);
                    for (let i = 0; i < data.length; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }
                    noise.buffer = noiseBuffer;
                    
                    osc.frequency.setValueAtTime(200, ctx.currentTime);
                    osc.type = 'triangle';
                    gain.gain.setValueAtTime(0.3, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                    
                    osc.connect(gain);
                    noise.connect(gain);
                    gain.connect(ctx.destination);
                    
                    osc.start(ctx.currentTime);
                    noise.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.1);
                    noise.stop(ctx.currentTime + 0.1);
                }
            };
        }
    }
    return audioContext;
}

function addMessage(message, type = 'info') {
    const messages = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'message';
    div.style.borderLeftColor = 
        type === 'success' ? '#00ff00' :
        type === 'error' ? '#ff0000' :
        type === 'warning' ? '#ffff00' :
        type === 'music' ? '#ff00ff' :
        '#00ff00';
    div.innerHTML = `<strong>${new Date().toLocaleTimeString()}:</strong> <pre style="margin: 0; white-space: pre-wrap;">${message}</pre>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function updateStatus(status, className) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = `WebSocket: ${status}`;
    statusEl.className = `status ${className}`;
}

function connect() {
    try {
        ws = new WebSocket('ws://localhost:8081/ws?type=strudel');
        
        ws.onopen = () => {
            addMessage('WebSocket接続が確立されました', 'success');
            updateStatus('接続済み', 'connected');
            reconnectAttempts = 0;
            initAudio();
        };

        ws.onmessage = (event) => {
            const message = event.data;
            addMessage(`受信: ${message}`, 'received');
            
            if (message === 'GET_CURRENT_PATTERN') {
                const currentCode = document.getElementById('strudelCode').value;
                ws.send(currentCode);
                addMessage(`現在のパターンを送信: ${currentCode}`, 'sent');
            } else if (message.trim()) {
                document.getElementById('strudelCode').value = message;
                addMessage(`新しいコードが設定されました: ${message}`, 'info');
                playStrudelPattern(message);
            }
        };

        ws.onclose = (event) => {
            addMessage(`WebSocket接続が閉じられました: ${event.code} ${event.reason}`, 'warning');
            updateStatus('切断済み', 'disconnected');
            
            if (activePattern) {
                activePattern.stop();
                activePattern = null;
            }
            
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                addMessage(`${reconnectAttempts}回目の再接続を試行中...`, 'info');
                updateStatus('再接続中', 'reconnecting');
                setTimeout(connect, 3000);
            } else {
                addMessage('再接続の最大試行回数に達しました', 'error');
            }
        };

        ws.onerror = (error) => {
            addMessage(`WebSocketエラー: ${error}`, 'error');
            updateStatus('エラー', 'disconnected');
        };

    } catch (error) {
        addMessage(`接続エラー: ${error.message}`, 'error');
    }
}

function playStrudelPattern(code) {
    const ctx = initAudio();
    
    if (activePattern) {
        activePattern.stop();
    }

    try {
        addMessage(`🎵 Web Audio APIでパターンを実行:\n${code}`, 'music');
        
        let patterns = [];
        const allMatches = code.matchAll(/(?:s\(|sound\()\s*([^)]+)\s*\)/g);
        
        for (const match of allMatches) {
            let pattern = match[1].replace(/['"]/g, '').trim();
            if (pattern) {
                patterns.push(pattern);
            }
        }
        
        if (patterns.length > 0) {
            if (patterns.length === 1) {
                addMessage(`単一パターンを検出: ${patterns[0]}`, 'info');
                playSimpleBeat(patterns[0], ctx, code);
            } else {
                addMessage(`複数パターンを検出: ${patterns.length}個`, 'info');
                playMultiplePatterns(patterns, ctx, code);
            }
        } else {
            addMessage('⚠️ 基本的なパターンを検出できませんでした', 'warning');
            
            const simpleMatch = code.match(/(?:s\(|sound\()([^)]+)\)/);
            if (simpleMatch) {
                const fallbackPattern = simpleMatch[1].replace(/['"]/g, '').trim();
                addMessage(`フォールバックパターンを試します: ${fallbackPattern}`, 'warning');
                playSimpleBeat(fallbackPattern, ctx, code);
            }
        }
    } catch (error) {
        addMessage(`音楽実行エラー: ${error.message}`, 'error');
    }
}

function playSimpleBeat(pattern, ctx, originalCode, setActive = true) {
    let bpm = 120;
    let patternOps = [];
    
    if (originalCode) {
        const fastMatch = originalCode.match(/\.fast\((\d+)\)/);
        if (fastMatch) {
            bpm *= parseInt(fastMatch[1]);
            patternOps.push({ type: 'fast', value: parseInt(fastMatch[1]) });
        }
        
        const slowMatch = originalCode.match(/\.slow\((\d+)\)/);
        if (slowMatch) {
            bpm /= parseInt(slowMatch[1]);
            patternOps.push({ type: 'slow', value: parseInt(slowMatch[1]) });
        }
        
        if (originalCode.includes('.rev()')) {
            patternOps.push({ type: 'rev' });
        }
        
        if (originalCode.includes('.stack()')) {
            patternOps.push({ type: 'stack' });
        }
        
        if (originalCode.includes('.jux()')) {
            patternOps.push({ type: 'jux' });
        }
    }
    
    const beatInterval = 60000 / (bpm / 4);
    
    addMessage(`処理済みパターン: ${pattern} (操作: ${patternOps.map(op => op.type + (op.value ? '(' + op.value + ')' : '')).join(', ')})`, 'info');

    let beatCount = 0;
    let maxBeats = 16;
    const patternInterval = setInterval(() => {
        if (beatCount >= maxBeats) {
            beatCount = 0;
        }

        playPatternAtBeat(pattern, beatCount, originalCode);
        beatCount++;
    }, beatInterval);
    
    if (setActive) {
        activePattern = {
            interval: patternInterval,
            stop: () => {
                if (activePattern.interval) {
                    clearInterval(activePattern.interval);
                    activePattern.interval = null;
                }
            }
        };
    } else {
        return {
            interval: patternInterval,
            stop: () => {
                clearInterval(patternInterval);
            }
        };
    }
}

function playMultiplePatterns(patterns, ctx, originalCode) {
    addMessage(`複数パターン検出: ${patterns.length}個のパターンを実行します`, 'info');
    
    if (!soundFuncs) {
        initAudio();
    }
    
    if (activePattern && activePattern.interval) {
        clearInterval(activePattern.interval);
        activePattern.interval = null;
    }
    
    patterns.forEach((pattern, index) => {
        setTimeout(() => {
            playSimpleBeat(pattern, ctx, originalCode, false);
        }, index * 200);
    });
    
    const combinedPattern = patterns.join(' ');
    playSimpleBeat(combinedPattern, ctx, originalCode, false);
    
    addMessage(`統合パターンを実行: ${combinedPattern}`, 'info');
}

function playPatternAtBeat(pattern, beatCount, originalCode) {
    const sounds = pattern.split(/\s+/).filter(s => s);
    const soundIndex = beatCount % sounds.length;
    const currentSound = sounds[soundIndex];
    
    if (!currentSound) {
        return;
    }
    
    try {
        switch (currentSound) {
            case 'bd':
            case 'kick':
                soundFuncs.bd();
                break;
            case 'hh':
            case 'hat':
                soundFuncs.hh();
                break;
            case 'sd':
            case 'snare':
                soundFuncs.sd();
                break;
            case 'oh':
            case 'openhat':
                soundFuncs.oh();
                break;
            default:
                console.log(`Unknown sound: ${currentSound}`);
                break;
        }
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

function executeCode() {
    const code = document.getElementById('strudelCode').value;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(code);
        addMessage(`コードを送信: ${code}`, 'sent');
        playStrudelPattern(code);
    } else {
        addMessage('WebSocket接続が必要です', 'error');
    }
}

function getCurrentPattern() {
    const code = document.getElementById('strudelCode').value;
    addMessage(`現在のパターン: ${code}`, 'info');
}

function stopMusic() {
    if (activePattern) {
        activePattern.stop();
        activePattern = null;
        addMessage('🛑 音楽を停止しました', 'info');
    }
}

function clearMessages() {
    document.getElementById('messages').innerHTML = '';
}

function initAudioAndTest() {
    const ctx = initAudio();
    addMessage(`AudioContext状態: ${ctx.state}`, 'info');
    addMessage(`サンプルレート: ${ctx.sampleRate}`, 'info');
    
    if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
            addMessage('AudioContextをresumeしました', 'success');
        }).catch(err => {
            addMessage(`Resumeエラー: ${err.message}`, 'error');
        });
    }
}

function testSimpleSound() {
    const ctx = initAudio();
    addMessage('シンプルなテスト音を再生します...', 'info');
    
    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        
        addMessage('テスト音を再生しました (440Hz, 0.5秒)', 'success');
    } catch (error) {
        addMessage(`テスト音再生エラー: ${error.message}`, 'error');
    }
}

// 簡易版Strudel解析機能
function analyzeStrudelCode(code) {
    const lines = code.split('\n');
    const chars = code.split('').length;
    
    // 基本チェック
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    const openBrackets = (code.match(/\[/g) || []).length;
    const closeBrackets = (code.match(/\]/g) || []).length;
    
    // パターンタイプ検出
    const types = [];
    if (code.includes('s(') || code.includes('sound(')) types.push('rhythm');
    if (code.includes('note(')) types.push('melody');
    if (code.includes('.fast(') || code.includes('.slow(')) types.push('transformation');
    if (code.includes('.stack(') || code.includes('.jux(')) types.push('combination');
    
    return {
        lines,
        chars,
        parensBalanced: openParens === closeParens,
        bracketsBalanced: openBrackets === closeBrackets,
        types: types.length > 0 ? types : ['basic'],
        complexity: (openParens + openBrackets) * 2 + lines.length
    };
}

function initializeBasicEditor() {
    const textarea = document.getElementById('strudelCode');
    const statusPanel = document.getElementById('codeStatus');
    const lineNumbers = document.getElementById('lineNumbers');
    
    if (textarea && statusPanel) {
        textarea.addEventListener('input', () => {
            updateBasicStatus(textarea.value);
            updateLineNumbers(textarea.value);
        });
        
        // 初期状態
        updateBasicStatus(textarea.value);
        updateLineNumbers(textarea.value);
        addMessage('高度な構文エディタ: 初期化完了', 'success');
    }
}

function updateLineNumbers(code) {
    const lineNumbersDiv = document.getElementById('lineNumbers');
    if (!lineNumbersDiv) return;
    
    const lines = code.split('\n');
    const lineNumbersHtml = lines.map((_, index) => index + 1).join('\n');
    lineNumbersDiv.textContent = lineNumbersHtml;
}

function updateBasicStatus(code) {
    const statusPanel = document.getElementById('codeStatus');
    if (!statusPanel) return;
    
    const analysis = analyzeStrudelCode(code);
    
    let statusHtml = '<div class="status-success">✓ 構文エディタ: 準備完了</div>';
    statusHtml += `<div class="status-warning">📊 ${analysis.lines}行, ${analysis.chars}文字</div>`;
    statusHtml += `<div class="status-success">🎵 パターンタイプ: ${analysis.types.join(', ')}</div>`;
    statusHtml += `<div class="status-warning">🔧 複雑度: ${analysis.complexity}</div>`;
    
    if (analysis.parensBalanced && analysis.bracketsBalanced) {
        statusHtml += '<div class="status-success">✓ 括弧のバランス: OK</div>';
    } else {
        statusHtml += '<div class="status-error">⚠ 括弧が一致しません</div>';
    }
    
    statusPanel.innerHTML = statusHtml;
}

// 開発ツール機能
window.getStrudelDocs = async function() {
    addMessage('📚 Strudelドキュメントを取得中...', 'info');
    try {
        const response = await fetch('/api/strudel/docs');
        const docs = await response.text();
        addMessage('ドキュメント取得成功:\n' + docs, 'success');
    } catch (error) {
        addMessage('ドキュメント取得エラー: ' + error.message, 'error');
        addMessage('📚 Strudel基本情報:\n- s("bd hh sd oh"): 基本ドラムパターン\n- .fast(2): 2倍速\n- .slow(2): 2倍遅く\n- .rev(): 反転\n- .stack(): 重ねる\n- .jux(): 交互', 'info');
    }
};

window.startChromeDevTools = function() {
    addMessage('🔧 Chrome DevTools連携機能はMCPサーバー経由で利用可能です', 'info');
};

window.takePageSnapshot = function() {
    addMessage('📸 ページスナップショット機能はMCPサーバー経由で利用可能です', 'info');
};

window.analyzePerformance = function() {
    addMessage('📊 性能分析機能はMCPサーバー経由で利用可能です', 'info');
};

// 初期化
window.onload = () => {
    connect();
    initializeBasicEditor();
    initializeSyncManager();
};

// クリーンアップ
window.onbeforeunload = () => {
    if (ws) {
        ws.close();
    }
    if (activePattern) {
        activePattern.stop();
    }
};

// BroadcastChannel 同期機能
class StrudelSyncManager {
    constructor() {
        this.channel = null;
        this.isActive = true;
        this.tabId = this.generateTabId();
        this.isPerformanceTab = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.lastSyncTime = 0;
        this.syncTimeout = 5000;
        this.pendingMessages = [];
        this.errorCount = 0;
        this.maxErrors = 10;
        
        this.initializeChannel();
        this.setupEventListeners();
        this.announceConnection();
        
        console.log('[SYNC] Sync manager initialized, tab ID:', this.tabId);
    }
    
    generateTabId() {
        return 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    // BroadcastChannelの初期化とエラーハンドリング
    initializeChannel() {
        try {
            this.channel = new BroadcastChannel('strudel-sync');
            this.setupChannelErrorHandling();
            console.log('[SYNC] BroadcastChannel initialized successfully');
        } catch (error) {
            this.handleChannelError('INIT_ERROR', error);
        }
    }
    
    setupChannelErrorHandling() {
        // BroadcastChannelのエラーハンドリング（ブラウザによってはサポートされていない）
        if (this.channel && typeof this.channel.addEventListener === 'function') {
            this.channel.addEventListener('error', (event) => {
                this.handleChannelError('CHANNEL_ERROR', event.error);
            });
        }
    }
    
    handleChannelError(errorType, error) {
        this.errorCount++;
        console.error(`[SYNC] ${errorType}:`, error);
        
        // エラーカウントが閾値を超えた場合
        if (this.errorCount >= this.maxErrors) {
            this.disableSync('Too many errors occurred');
            return;
        }
        
        // エラーメッセージを表示
        this.showSyncErrorNotification(errorType, error);
        
        // 再接続を試行
        if (errorType === 'INIT_ERROR' || errorType === 'CHANNEL_ERROR') {
            this.attemptReconnect();
        }
    }
    
    showSyncErrorNotification(errorType, error) {
        const errorMessages = {
            'INIT_ERROR': '同期機能の初期化に失敗しました',
            'CHANNEL_ERROR': '同期チャネルでエラーが発生しました',
            'SEND_ERROR': '同期メッセージの送信に失敗しました',
            'TIMEOUT_ERROR': '同期がタイムアウトしました',
            'RECONNECT_ERROR': '再接続に失敗しました'
        };
        
        const message = errorMessages[errorType] || `同期エラー: ${errorType}`;
        addMessage(`⚠️ ${message} (エラー数: ${this.errorCount}/${this.maxErrors})`, 'error');
        
        // 重大なエラーの場合は詳細を表示
        if (this.errorCount >= this.maxErrors - 2) {
            addMessage(`🔧 エラー詳細: ${error.message || error}`, 'error');
        }
    }
    
    setupEventListeners() {
        if (!this.channel) return;
        
        this.channel.onmessage = (event) => {
            if (!this.isActive) return;
            
            try {
                const { type, data, senderTabId, timestamp } = event.data;
                
                // 自分からのメッセージは無視
                if (senderTabId === this.tabId) return;
                
                // タイムスタンプチェック（古いメッセージを無視）
                if (timestamp && timestamp < this.lastSyncTime - 10000) {
                    console.warn('[SYNC] Ignoring old message');
                    return;
                }
                
                this.handleSyncMessage(type, data, timestamp);
            } catch (error) {
                this.handleChannelError('MESSAGE_ERROR', error);
            }
        };
        
        // ページを閉じる時に通知
        window.addEventListener('beforeunload', () => {
            this.safeBroadcast('TAB_CLOSED', {}, true);
        });
    }
    
    // 安全なメッセージ送信
    safeBroadcast(type, data, isFinal = false) {
        if (!this.isActive || !this.channel) return false;
        
        try {
            const message = {
                type,
                data,
                senderTabId: this.tabId,
                timestamp: Date.now()
            };
            
            this.channel.postMessage(message);
            
            // 最終メッセージ以外はペンディングリストに追加
            if (!isFinal) {
                this.pendingMessages.push(message);
                this.trimPendingMessages();
            }
            
            return true;
        } catch (error) {
            this.handleChannelError('SEND_ERROR', error);
            return false;
        }
    }
    
    // ペンディングメッセージの管理
    trimPendingMessages() {
        if (this.pendingMessages.length > 50) {
            this.pendingMessages = this.pendingMessages.slice(-25);
        }
    }
    
    // 再接続処理
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.disableSync('Maximum reconnection attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`[SYNC] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            try {
                if (this.channel) {
                    this.channel.close();
                }
                this.initializeChannel();
                this.setupEventListeners();
                
                // 再接続成功時の処理
                addMessage(`✅ 同期機能を再接続しました (${this.reconnectAttempts}回目)`, 'success');
                this.errorCount = Math.max(0, this.errorCount - 3); // エラーカウントを少し減らす
                this.reconnectAttempts = 0;
                
                // ペンディングメッセージを再送
                this.resendPendingMessages();
                
                // 接続を再通知
                this.announceConnection();
            } catch (error) {
                this.handleChannelError('RECONNECT_ERROR', error);
            }
        }, delay);
    }
    
    // ペンディングメッセージの再送
    resendPendingMessages() {
        if (this.pendingMessages.length === 0) return;
        
        console.log(`[SYNC] Resending ${this.pendingMessages.length} pending messages`);
        
        const messages = [...this.pendingMessages];
        this.pendingMessages = [];
        
        messages.forEach(message => {
            this.safeBroadcast(message.type, message.data);
        });
    }
    
    // 同期機能の無効化
    disableSync(reason) {
        this.isActive = false;
        console.warn(`[SYNC] Sync disabled: ${reason}`);
        addMessage(`❌ 同期機能が無効化されました: ${reason}`, 'error');
        
        try {
            if (this.channel) {
                this.channel.close();
                this.channel = null;
            }
        } catch (error) {
            console.error('[SYNC] Error closing channel:', error);
        }
    }
    
    // 同期機能の再有効化試行
    async attemptReenableSync() {
        if (this.errorCount >= this.maxErrors) {
            addMessage('⚠️ エラー数が多すぎるため同期機能を再有効化できません', 'error');
            return false;
        }
        
        this.errorCount = Math.max(0, this.errorCount - 5);
        this.reconnectAttempts = 0;
        
        try {
            this.isActive = true;
            this.initializeChannel();
            this.setupEventListeners();
            this.announceConnection();
            addMessage('✅ 同期機能を再有効化しました', 'success');
            return true;
        } catch (error) {
            this.handleChannelError('REENABLE_ERROR', error);
            return false;
        }
    }
    
    announceConnection() {
        this.safeBroadcast('TAB_CONNECTED', { isPerformanceTab: this.isPerformanceTab });
    }
    
    setPerformanceTab(isPerformance) {
        this.isPerformanceTab = isPerformance;
        this.safeBroadcast('TAB_ROLE_CHANGED', { isPerformanceTab: isPerformance });
    }
    
    // パターン変更を他タブに通知
    broadcastPatternChange(code, patternInfo = null) {
        if (!this.isActive) return;
        
        const data = {
            code: code,
            patternInfo: patternInfo || this.analyzePattern(code),
            timestamp: Date.now()
        };
        
        const success = this.safeBroadcast('PATTERN_CHANGE', data);
        if (success) {
            console.log('[SYNC] Pattern change broadcasted:', data);
            this.lastSyncTime = Date.now();
        }
    }
    
    // 演奏状態を通知
    broadcastPlaybackState(isPlaying, tempo = null) {
        if (!this.isActive) return;
        
        this.safeBroadcast('PLAYBACK_STATE', { isPlaying, tempo });
    }
    
    // MCPメッセージを転送
    broadcastMCPMessage(messageType, data) {
        if (!this.isActive) return;
        
        this.safeBroadcast('MCP_MESSAGE', { messageType, data });
    }
    
    handleSyncMessage(type, data, timestamp) {
        console.log('[SYNC] Received message:', type, data);
        
        switch (type) {
            case 'TAB_CONNECTED':
                console.log('[SYNC] New tab connected, sync may be needed');
                this.requestSyncState();
                break;
                
            case 'TAB_CLOSED':
                console.log('[SYNC] Tab closed');
                break;
                
            case 'TAB_ROLE_CHANGED':
                console.log('[SYNC] Tab role changed:', data);
                break;
                
            case 'PATTERN_CHANGE':
                this.handlePatternChange(data, timestamp);
                break;
                
            case 'PLAYBACK_STATE':
                this.handlePlaybackState(data, timestamp);
                break;
                
            case 'MCP_MESSAGE':
                this.handleMCPMessage(data, timestamp);
                break;
                
            case 'REQUEST_SYNC_STATE':
                this.sendCurrentState();
                break;
        }
    }
    
    handlePatternChange(data, timestamp) {
        // 演奏タブの場合、パターンコードを更新
        if (this.isPerformanceTab && data.code) {
            console.log('[SYNC] Performance tab receiving pattern:', data.code);
            
            // エディタを更新（DOMが存在する場合）
            const codeEditor = document.getElementById('codeEditor');
            if (codeEditor) {
                codeEditor.value = data.code;
                updateLineNumbers(data.code);
                updateBasicStatus(data.code);
            }
            
            // パターンを実行
            try {
                executeCode(data.code);
                addMessage('🔄 他タブからパターンを同期しました', 'success');
            } catch (error) {
                addMessage('同期パターン実行エラー: ' + error.message, 'error');
            }
        }
    }
    
    handlePlaybackState(data, timestamp) {
        const { isPlaying, tempo } = data;
        let message = isPlaying ? '▶️ 他タブで演奏開始' : '⏸️ 他タブで演奏停止';
        if (tempo) message += ` (テンポ: ${tempo})`;
        addMessage(`🔄 ${message}`, 'info');
    }
    
    handleMCPMessage(data, timestamp) {
        addMessage(`🤖 MCP同期: ${data.messageType}`, 'info');
        // 必要に応じてMCPメッセージを処理
    }
    
    requestSyncState() {
        this.safeBroadcast('REQUEST_SYNC_STATE', {});
    }
    
    sendCurrentState() {
        const currentCode = getCurrentPattern();
        if (currentCode) {
            this.safeBroadcast('SYNC_STATE_RESPONSE', {
                code: currentCode,
                isPlaying: activePattern !== null,
                tabRole: this.isPerformanceTab ? 'performance' : 'mcp'
            });
        }
    }
    
    analyzePattern(code) {
        return {
            length: code.length,
            lines: code.split('\n').length,
            hasSoundPatterns: /(s\(|note\()/i.test(code),
            hasEffects: /(\.fast|\.slow|\.rev|\.jux|\.stack)/i.test(code),
            timestamp: Date.now()
        };
    }
    
    // 同期機能のON/OFF
    toggleSync() {
        this.isActive = !this.isActive;
        console.log('[SYNC] Sync', this.isActive ? 'enabled' : 'disabled');
        return this.isActive;
    }
    
    getStatus() {
        return {
            isActive: this.isActive,
            tabId: this.tabId,
            isPerformanceTab: this.isPerformanceTab,
            connectedTabs: this.getConnectedTabs(),
            errorCount: this.errorCount,
            maxErrors: this.maxErrors,
            reconnectAttempts: this.reconnectAttempts,
            pendingMessages: this.pendingMessages.length,
            lastSyncTime: this.lastSyncTime
        };
    }
    
    getConnectedTabs() {
        // 簡易的な実装：実際には各タブの状態を追跡
        return this.tabId ? 1 : 0;
    }
}

// 同期マネージャーをグローバルに初期化
let syncManager = null;

function initializeSyncManager() {
    if (!syncManager) {
        syncManager = new StrudelSyncManager();
        
        // ウィンドウタイトルに役割を表示（5秒後）
        setTimeout(() => {
            const role = syncManager.isPerformanceTab ? 'Performance' : 'MCP';
            const originalTitle = document.title;
            document.title = `${document.title} [${role}]`;
            setTimeout(() => {
                document.title = originalTitle;
            }, 3000);
        }, 1000);
    }
    return syncManager;
}

// 既存のexecuteCode関数を拡張して同期機能を追加
const originalExecuteCode = window.executeCode;
window.executeCode = function(code) {
    // 元の実行
    const result = originalExecuteCode(code);
    
    // 同期マネージャーがあれば変更を通知
    if (syncManager) {
        setTimeout(() => {
            syncManager.broadcastPatternChange(code);
        }, 100); // 少し遅延させて実行完了を待つ
    }
    
    return result;
};

// グローバル関数
window.executeCode = executeCode;
window.getCurrentPattern = getCurrentPattern;
window.stopMusic = stopMusic;
window.clearMessages = clearMessages;
window.initAudioAndTest = initAudioAndTest;
window.testSimpleSound = testSimpleSound;

// 同期関係のグローバル関数
window.togglePerformanceTab = function() {
    if (syncManager) {
        syncManager.setPerformanceTab(!syncManager.isPerformanceTab);
        const status = syncManager.isPerformanceTab ? '演奏タブ' : 'MCPタブ';
        addMessage(`🎭 タブの役割を${status}に変更しました`, 'info');
        return syncManager.isPerformanceTab;
    }
    return false;
};

window.toggleSync = function() {
    if (syncManager) {
        const active = syncManager.toggleSync();
        addMessage(`${active ? '✅' : '❌'} 同期機能${active ? '有効' : '無効'}`, 'info');
        return active;
    }
    return false;
};

window.getSyncStatus = function() {
    if (syncManager) {
        const status = syncManager.getStatus();
        addMessage(`📊 同期状態: ${JSON.stringify(status, null, 2)}`, 'info');
        return status;
    }
    return null;
};

window.reenableSync = async function() {
    if (syncManager) {
        const success = await syncManager.attemptReenableSync();
        if (success) {
            addMessage('✅ 同期機能の再有効化に成功しました', 'success');
        } else {
            addMessage('❌ 同期機能の再有効化に失敗しました', 'error');
        }
        return success;
    }
    return false;
};

window.resetSyncErrors = function() {
    if (syncManager) {
        syncManager.errorCount = 0;
        syncManager.reconnectAttempts = 0;
        addMessage('🔄 同期エラーカウンターをリセットしました', 'info');
        return true;
    }
    return false;
};

window.forceSyncReconnect = function() {
    if (syncManager) {
        syncManager.attemptReconnect();
        addMessage('🔄 同期接続の再試行を開始しました', 'info');
        return true;
    }
    return false;
};
