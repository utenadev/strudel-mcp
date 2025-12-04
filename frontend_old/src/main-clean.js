// Strudel MCP WebSocket Client - Clean Version
import './style.css'

// WebSocket and Audio management
let ws = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let audioContext = null;
let activePattern = null;
let soundFuncs = null;

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

// グローバル関数
window.executeCode = executeCode;
window.getCurrentPattern = getCurrentPattern;
window.stopMusic = stopMusic;
window.clearMessages = clearMessages;
window.initAudioAndTest = initAudioAndTest;
window.testSimpleSound = testSimpleSound;
