// Strudel MCP WebSocket Client
import './style.css'

// WebSocket and Audio management
let ws = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let audioContext = null;
let activePattern = null;
let synthesizer = null;
let soundFuncs = null;

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

    createOscillator(type = 'sine', frequency = 440) {
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        return osc;
    }

    createGain(gain = 1) {
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
        return gainNode;
    }

    createFilter(type = 'lowpass', frequency = 1000, Q = 1) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        filter.Q.setValueAtTime(Q, this.ctx.currentTime);
        return filter;
    }

    createDelay(delayTime = 0.3, feedbackAmount = 0.4) {
        const delay = this.ctx.createDelay(delayTime);
        const feedbackGain = this.ctx.createGain();
        
        feedbackGain.gain.setValueAtTime(feedbackAmount, this.ctx.currentTime);
        
        delay.connect(feedbackGain);
        feedbackGain.connect(delay);
        
        return { delay, feedbackGain };
    }

    createReverb() {
        const convolver = this.ctx.createConvolver();
        const wetGain = this.ctx.createGain();
        const dryGain = this.ctx.createGain();
        
        wetGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        dryGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        
        return { convolver, wetGain, dryGain };
    }

    createFMSynth(carrierFreq = 220, ratio = 1.5) {
        const carrier = this.createOscillator('sine', carrierFreq);
        const modulator = this.createOscillator('sine', carrierFreq * ratio);
        const carrierGain = this.createGain(1);
        const modulatorGain = this.createGain(carrierFreq);
        
        modulator.connect(modulatorGain);
        modulatorGain.connect(carrier.frequency);
        carrier.connect(carrierGain);
        
        return { carrier, modulator, carrierGain };
    }

    createAdditiveSynthesizer(frequencies = [220, 440, 880, 1760]) {
        const gains = frequencies.map(() => this.createGain());
        
        const oscillators = frequencies.map(freq => {
            const osc = this.createOscillator('sine', freq);
            return osc;
        });
        
        return { oscillators, gains };
    }

    createNoiseSource(type = 'white') {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        if (type === 'white') {
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1);
            }
        } else if (type === 'pink') {
            for (let i = 0; i < bufferSize; i++) {
                data[i] = this.generatePinkNoiseSample(i);
            }
        } else if (type === 'brown') {
            for (let i = 0; i < bufferSize; i++) {
                data[i] = this.generateBrownNoiseSample(i, data);
            }
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        return noise;
    }

    generatePinkNoiseSample(index) {
        const x = Math.random() - 0.5;
        return x / (1.0 + Math.abs(x));
    }

    generateBrownNoiseSample(index, data) {
        if (index === 0) {
            return (Math.random() - 0.5) * 0.1;
        }
        return data[index - 1] + (Math.random() - 0.5) * 0.01;
    }

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
        
        // ADSR envelope
        gainNode.gain.setValueAtTime(0, start);
        gainNode.gain.linearRampToValueAtTime(soundGenerator.gain, start + soundGenerator.envelope.attack);
        gainNode.gain.linearRampToValueAtTime(soundGenerator.envelope.sustain, start + soundGenerator.envelope.attack + soundGenerator.envelope.decay);
        gainNode.gain.setValueAtTime(soundGenerator.gain * soundGenerator.envelope.sustain, start + soundGenerator.envelope.attack + soundGenerator.envelope.decay + soundGenerator.envelope.sustain);
        gainNode.gain.linearRampToValueAtTime(0.001, end);

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

    createStereoPan(panPosition = 0) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(panPosition, this.ctx.currentTime);
        return panner;
    }

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
            },
            getValue: () => param.value,
            automate: (automationPattern) => {
                if (!Array.isArray(automationPattern)) {
                    automationPattern = [{time: 0, value: automationPattern}];
                }
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
    if (!messages) return;
    
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
    if (!statusEl) return;
    statusEl.textContent = `WebSocket: ${status}`;
    statusEl.className = `status ${className}`;
}

function connect() {
    try {
        ws = new WebSocket('ws://localhost:8081/ws?type=strudel');
        
        ws.onopen = () => {
            addMessage('WebSocket connection established', 'success');
            updateStatus('Connected', 'connected');
            reconnectAttempts = 0;
            initAudio();
        };

        ws.onmessage = (event) => {
            const message = event.data;
            addMessage(`Received: ${message}`, 'received');
            
            if (message === 'GET_CURRENT_PATTERN') {
                const currentCode = document.getElementById('strudelCode')?.value || '';
                ws.send(currentCode);
                addMessage(`Sent current pattern: ${currentCode}`, 'sent');
            } else if (message.trim()) {
                const codeElem = document.getElementById('strudelCode');
                if (codeElem) {
                    codeElem.value = message;
                }
                addMessage(`New code received: ${message}`, 'info');
                playStrudelPattern(message);
            }
        };

        ws.onclose = (event) => {
            addMessage(`WebSocket connection closed: ${event.code} ${event.reason}`, 'warning');
            updateStatus('Disconnected', 'disconnected');
            
            if (activePattern) {
                activePattern.stop();
                activePattern = null;
            }
            
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                addMessage(`Reconnection attempt ${reconnectAttempts}...`, 'info');
                updateStatus('Reconnecting', 'reconnecting');
                setTimeout(connect, 3000);
            } else {
                addMessage('Maximum reconnection attempts reached', 'error');
            }
        };

        ws.onerror = (error) => {
            addMessage(`WebSocket error: ${error}`, 'error');
            updateStatus('Error', 'disconnected');
        };

    } catch (error) {
        addMessage(`Connection error: ${error.message}`, 'error');
    }
}

function playStrudelPattern(code) {
    const ctx = initAudio();
    
    if (activePattern) {
        activePattern.stop();
    }

    try {
        addMessage(`🎵 Playing pattern:\n${code}`, 'music');
        
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
                addMessage(`Single pattern detected: ${patterns[0]}`, 'info');
                playSimpleBeat(patterns[0], ctx, code);
            } else {
                addMessage(`Multiple patterns detected: ${patterns.length}`, 'info');
                playMultiplePatterns(patterns, ctx, code);
            }
        } else {
            addMessage('⚠️ Could not detect any patterns', 'warning');
            
            const simpleMatch = code.match(/(?:s\(|sound\()([^)]+)\)/);
            if (simpleMatch) {
                const fallbackPattern = simpleMatch[1].replace(/['"]/g, '').trim();
                addMessage(`Trying fallback pattern: ${fallbackPattern}`, 'warning');
                playSimpleBeat(fallbackPattern, ctx, code);
            }
        }
    } catch (error) {
        addMessage(`Pattern execution error: ${error.message}`, 'error');
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
    
    addMessage(`Processing pattern: ${pattern} (operations: ${patternOps.map(op => op.type + (op.value ? '(' + op.value + ')' : '')).join(', ')})`, 'info');

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
                if (activePattern?.interval) {
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
    addMessage(`Multiple patterns detected: executing ${patterns.length} patterns`, 'info');
    
    if (!soundFuncs) {
        initAudio();
    }
    
    if (activePattern?.interval) {
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
    
    addMessage(`Combined pattern: ${combinedPattern}`, 'info');
}

function playPatternAtBeat(pattern, beatCount, originalCode) {
    const sounds = pattern.split(/\s+/).filter(s => s);
    const soundIndex = beatCount % sounds.length;
    const currentSound = sounds[soundIndex];
    
    if (!currentSound || !soundFuncs) {
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
    const codeElem = document.getElementById('strudelCode');
    const code = codeElem?.value || '';
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(code);
        addMessage(`Code sent: ${code}`, 'sent');
        playStrudelPattern(code);
    } else {
        addMessage('WebSocket connection required', 'error');
    }
}

function getCurrentPattern() {
    const codeElem = document.getElementById('strudelCode');
    const code = codeElem?.value || '';
    addMessage(`Current pattern: ${code}`, 'info');
    return code;
}

function stopMusic() {
    if (activePattern) {
        activePattern.stop();
        activePattern = null;
        addMessage('🛑 Music stopped', 'info');
    }
}

function clearMessages() {
    const messagesElem = document.getElementById('messages');
    if (messagesElem) {
        messagesElem.innerHTML = '';
    }
}

function initAudioAndTest() {
    const ctx = initAudio();
    addMessage(`AudioContext state: ${ctx.state}`, 'info');
    addMessage(`Sample rate: ${ctx.sampleRate}`, 'info');
    
    if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
            addMessage('AudioContext resumed', 'success');
        }).catch(err => {
            addMessage(`Resume error: ${err.message}`, 'error');
        });
    }
}

function testSimpleSound() {
    const ctx = initAudio();
    addMessage('Playing test sound...', 'info');
    
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
        
        addMessage('Test sound played (440Hz, 0.5s)', 'success');
    } catch (error) {
        addMessage(`Test sound error: ${error.message}`, 'error');
    }
}

function analyzeStrudelCode(code) {
    const lines = code.split('\n');
    const chars = code.split('').length;
    
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    const openBrackets = (code.match(/\[/g) || []).length;
    const closeBrackets = (code.match(/\]/g) || []).length;
    
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
        
        updateBasicStatus(textarea.value);
        updateLineNumbers(textarea.value);
        addMessage('Editor initialized', 'success');
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
    
    let statusHtml = '<div class="status-success">✓ Editor: Ready</div>';
    statusHtml += `<div class="status-warning">📊 ${analysis.lines} lines, ${analysis.chars} chars</div>`;
    statusHtml += `<div class="status-success">🎵 Pattern types: ${analysis.types.join(', ')}</div>`;
    statusHtml += `<div class="status-warning">🔧 Complexity: ${analysis.complexity}</div>`;
    
    if (analysis.parensBalanced && analysis.bracketsBalanced) {
        statusHtml += '<div class="status-success">✓ Brackets balanced: OK</div>';
    } else {
        statusHtml += '<div class="status-error">⚠ Brackets not balanced</div>';
    }
    
    statusPanel.innerHTML = statusHtml;
}

window.getStrudelDocs = async function() {
    addMessage('📚 Fetching Strudel documentation...', 'info');
    try {
        const response = await fetch('/api/strudel/docs');
        const docs = await response.text();
        addMessage('Documentation fetched:\n' + docs, 'success');
    } catch (error) {
        addMessage('Documentation fetch error: ' + error.message, 'error');
        addMessage('📚 Strudel basics:\n- s("bd hh sd oh"): drum pattern\n- .fast(2): 2x speed\n- .slow(2): 2x slow\n- .rev(): reverse\n- .stack(): layer\n- .jux(): alternate', 'info');
    }
};

window.startChromeDevTools = function() {
    addMessage('🔧 Chrome DevTools integration available via MCP server', 'info');
};

window.takePageSnapshot = function() {
    addMessage('📸 Page snapshot available via MCP server', 'info');
};

window.analyzePerformance = function() {
    addMessage('📊 Performance analysis available via MCP server', 'info');
};

window.onload = () => {
    connect();
    initializeBasicEditor();
    initializeSyncManager();
};

window.onbeforeunload = () => {
    if (ws) {
        ws.close();
    }
    if (activePattern) {
        activePattern.stop();
    }
};

// BroadcastChannel Sync Manager
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
        
        console.log('[SYNC] Manager initialized, tab ID:', this.tabId);
    }
    
    generateTabId() {
        return 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    initializeChannel() {
        try {
            this.channel = new BroadcastChannel('strudel-sync');
            this.setupChannelErrorHandling();
            console.log('[SYNC] BroadcastChannel initialized');
        } catch (error) {
            this.handleChannelError('INIT_ERROR', error);
        }
    }
    
    setupChannelErrorHandling() {
        if (this.channel && typeof this.channel.addEventListener === 'function') {
            this.channel.addEventListener('error', (event) => {
                this.handleChannelError('CHANNEL_ERROR', event.error);
            });
        }
    }
    
    handleChannelError(errorType, error) {
        this.errorCount++;
        console.error(`[SYNC] ${errorType}:`, error);
        
        if (this.errorCount >= this.maxErrors) {
            this.disableSync('Too many errors');
            return;
        }
        
        this.showSyncErrorNotification(errorType, error);
        
        if (errorType === 'INIT_ERROR' || errorType === 'CHANNEL_ERROR') {
            this.attemptReconnect();
        }
    }
    
    showSyncErrorNotification(errorType, error) {
        const errorMessages = {
            'INIT_ERROR': 'Sync initialization failed',
            'CHANNEL_ERROR': 'Sync channel error',
            'SEND_ERROR': 'Sync message send failed',
            'TIMEOUT_ERROR': 'Sync timeout',
            'RECONNECT_ERROR': 'Reconnection failed'
        };
        
        const message = errorMessages[errorType] || `Sync error: ${errorType}`;
        addMessage(`⚠️ ${message} (${this.errorCount}/${this.maxErrors})`, 'error');
        
        if (this.errorCount >= this.maxErrors - 2) {
            addMessage(`🔧 Error details: ${error.message || error}`, 'error');
        }
    }
    
    setupEventListeners() {
        if (!this.channel) return;
        
        this.channel.onmessage = (event) => {
            if (!this.isActive) return;
            
            try {
                const { type, data, senderTabId, timestamp } = event.data;
                
                if (senderTabId === this.tabId) return;
                
                if (timestamp && timestamp < this.lastSyncTime - 10000) {
                    console.warn('[SYNC] Ignoring old message');
                    return;
                }
                
                this.handleSyncMessage(type, data, timestamp);
            } catch (error) {
                this.handleChannelError('MESSAGE_ERROR', error);
            }
        };
        
        window.addEventListener('beforeunload', () => {
            this.safeBroadcast('TAB_CLOSED', {}, true);
        });
    }
    
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
    
    trimPendingMessages() {
        if (this.pendingMessages.length > 50) {
            this.pendingMessages = this.pendingMessages.slice(-25);
        }
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.disableSync('Max reconnection attempts reached');
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
                
                addMessage(`✅ Sync reconnected (attempt ${this.reconnectAttempts})`, 'success');
                this.errorCount = Math.max(0, this.errorCount - 3);
                this.reconnectAttempts = 0;
                
                this.resendPendingMessages();
                this.announceConnection();
            } catch (error) {
                this.handleChannelError('RECONNECT_ERROR', error);
            }
        }, delay);
    }
    
    resendPendingMessages() {
        if (this.pendingMessages.length === 0) return;
        
        console.log(`[SYNC] Resending ${this.pendingMessages.length} pending messages`);
        
        const messages = [...this.pendingMessages];
        this.pendingMessages = [];
        
        messages.forEach(message => {
            this.safeBroadcast(message.type, message.data);
        });
    }
    
    disableSync(reason) {
        this.isActive = false;
        console.warn(`[SYNC] Sync disabled: ${reason}`);
        addMessage(`❌ Sync disabled: ${reason}`, 'error');
        
        try {
            if (this.channel) {
                this.channel.close();
                this.channel = null;
            }
        } catch (error) {
            console.error('[SYNC] Error closing channel:', error);
        }
    }
    
    async attemptReenableSync() {
        if (this.errorCount >= this.maxErrors) {
            addMessage('⚠️ Too many errors to re-enable sync', 'error');
            return false;
        }
        
        this.errorCount = Math.max(0, this.errorCount - 5);
        this.reconnectAttempts = 0;
        
        try {
            this.isActive = true;
            this.initializeChannel();
            this.setupEventListeners();
            this.announceConnection();
            addMessage('✅ Sync re-enabled', 'success');
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
    
    broadcastPatternChange(code, patternInfo = null) {
        if (!this.isActive) return;
        
        const data = {
            code: code,
            patternInfo: patternInfo || this.analyzePattern(code),
            timestamp: Date.now()
        };
        
        const success = this.safeBroadcast('PATTERN_CHANGE', data);
        if (success) {
            console.log('[SYNC] Pattern broadcasted:', data);
            this.lastSyncTime = Date.now();
        }
    }
    
    broadcastPlaybackState(isPlaying, tempo = null) {
        if (!this.isActive) return;
        
        this.safeBroadcast('PLAYBACK_STATE', { isPlaying, tempo });
    }
    
    broadcastMCPMessage(messageType, data) {
        if (!this.isActive) return;
        
        this.safeBroadcast('MCP_MESSAGE', { messageType, data });
    }
    
    handleSyncMessage(type, data, timestamp) {
        console.log('[SYNC] Received:', type, data);
        
        switch (type) {
            case 'TAB_CONNECTED':
                console.log('[SYNC] New tab connected');
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
        if (this.isPerformanceTab && data.code) {
            console.log('[SYNC] Performance tab receiving pattern:', data.code);
            
            const codeEditor = document.getElementById('codeEditor');
            if (codeEditor) {
                codeEditor.value = data.code;
                updateLineNumbers(data.code);
                updateBasicStatus(data.code);
            }
            
            try {
                executeCode(data.code);
                addMessage('🔄 Pattern synced from other tab', 'success');
            } catch (error) {
                addMessage('Sync pattern error: ' + error.message, 'error');
            }
        }
    }
    
    handlePlaybackState(data, timestamp) {
        const { isPlaying, tempo } = data;
        let message = isPlaying ? '▶️ Playback started' : '⏸️ Playback stopped';
        if (tempo) message += ` (Tempo: ${tempo})`;
        addMessage(`🔄 ${message}`, 'info');
    }
    
    handleMCPMessage(data, timestamp) {
        addMessage(`🤖 MCP: ${data.messageType}`, 'info');
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
    
    toggleSync() {
        this.isActive = !this.isActive;
        console.log('[SYNC]', this.isActive ? 'enabled' : 'disabled');
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
        return this.tabId ? 1 : 0;
    }
}

let syncManager = null;

function initializeSyncManager() {
    if (!syncManager) {
        syncManager = new StrudelSyncManager();
        
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

const originalExecuteCodeImpl = executeCode;
window.executeCode = function(code) {
    const result = originalExecuteCodeImpl(code);
    
    if (syncManager) {
        setTimeout(() => {
            syncManager.broadcastPatternChange(code);
        }, 100);
    }
    
    return result;
};

// Global API
window.executeCode = executeCode;
window.getCurrentPattern = getCurrentPattern;
window.stopMusic = stopMusic;
window.clearMessages = clearMessages;
window.initAudioAndTest = initAudioAndTest;
window.testSimpleSound = testSimpleSound;

window.togglePerformanceTab = function() {
    if (syncManager) {
        syncManager.setPerformanceTab(!syncManager.isPerformanceTab);
        const status = syncManager.isPerformanceTab ? 'Performance' : 'MCP';
        addMessage(`🎭 Tab role: ${status}`, 'info');
        return syncManager.isPerformanceTab;
    }
    return false;
};

window.toggleSync = function() {
    if (syncManager) {
        const active = syncManager.toggleSync();
        addMessage(`${active ? '✅' : '❌'} Sync ${active ? 'enabled' : 'disabled'}`, 'info');
        return active;
    }
    return false;
};

window.getSyncStatus = function() {
    if (syncManager) {
        const status = syncManager.getStatus();
        addMessage(`📊 Sync status: ${JSON.stringify(status, null, 2)}`, 'info');
        return status;
    }
    return null;
};

window.reenableSync = async function() {
    if (syncManager) {
        const success = await syncManager.attemptReenableSync();
        if (success) {
            addMessage('✅ Sync re-enabled', 'success');
        } else {
            addMessage('❌ Sync re-enable failed', 'error');
        }
        return success;
    }
    return false;
};

window.resetSyncErrors = function() {
    if (syncManager) {
        syncManager.errorCount = 0;
        syncManager.reconnectAttempts = 0;
        addMessage('🔄 Sync errors reset', 'info');
        return true;
    }
    return false;
};

window.forceSyncReconnect = function() {
    if (syncManager) {
        syncManager.attemptReconnect();
        addMessage('🔄 Sync reconnection started', 'info');
        return true;
    }
    return false;
};
