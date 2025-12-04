import './style.css'

// WebSocket and Sync management
let ws = null
let reconnectAttempts = 0
let maxReconnectAttempts = 5
let playingNotes = new Map()
let soundCache = new Map()

// Audio context and playback
let audioContext = null
let currentVolume = 0.3

// Utility functions
function addMessage(message, type = 'info') {
    const messages = document.getElementById('messages')
    if (!messages) return
    
    const div = document.createElement('div')
    div.className = 'message'
    div.style.borderLeftColor = 
        type === 'success' ? '#00ff00' :
        type === 'error' ? '#ff0000' :
        type === 'warning' ? '#ffff00' :
        type === 'music' ? '#ff00ff' :
        '#00ff00'
    div.innerHTML = `<strong>${new Date().toLocaleTimeString()}:</strong> <pre style="margin: 0; white-space: pre-wrap;">${message}</pre>`
    messages.appendChild(div)
    messages.scrollTop = messages.scrollHeight
}

function updateStatus(status, className) {
    const statusEl = document.getElementById('status')
    if (!statusEl) return
    statusEl.textContent = `WebSocket: ${status}`
    statusEl.className = `status ${className}`
}

// Initialize Audio Context
function getAudioContext() {
    if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        audioContext = new AudioCtx()
    }
    return audioContext
}

// Play drum sound with oscillator (fallback)
function playDrumSound(drum, time = 0) {
    try {
        const ctx = getAudioContext()
        const startTime = ctx.currentTime + time
        
        // Simple drum synthesis
        const synth = ctx.createOscillator()
        const env = ctx.createGain()
        
        const frequency = {
            'bd': 60,      // bass drum
            'hh': 200,     // hi-hat
            'sd': 150,     // snare drum
            'oh': 180,     // open hi-hat
            'rim': 400,    // rim shot
            'rd': 100,     // ride
            'conga': 250,  // conga
            'tom': 120,    // tom
            'kick': 60,    // kick
            'snare': 150,  // snare
            'hat': 200,    // hat
            'perc': 300    // percussion
        }[drum] || 100
        
        synth.frequency.setValueAtTime(frequency, startTime)
        synth.type = 'sine'
        
        // Envelope
        env.gain.setValueAtTime(currentVolume, startTime)
        env.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2)
        
        synth.connect(env)
        env.connect(ctx.destination)
        
        synth.start(startTime)
        synth.stop(startTime + 0.2)
        
        const noteId = Math.random().toString(36)
        playingNotes.set(noteId, { synth, env })
        setTimeout(() => playingNotes.delete(noteId), 300)
        
    } catch (error) {
        addMessage(`Play error: ${error.message}`, 'error')
    }
}

// Simple pattern parser
function parseSimplePattern(code) {
    const pattern = {
        sounds: [],
        duration: 1,
        effects: {}
    }
    
    // Extract s("...") pattern
    const soundMatch = code.match(/s\("([^"]+)"\)/);
    if (soundMatch) {
        const soundStr = soundMatch[1]
        pattern.sounds = soundStr.split(/\s+/).filter(s => s.length > 0)
    }
    
    // Parse transformations
    if (code.includes('.fast(')) {
        const match = code.match(/\.fast\((\d+)\)/)
        if (match) pattern.duration = 1 / parseInt(match[1])
    }
    if (code.includes('.slow(')) {
        const match = code.match(/\.slow\((\d+)\)/)
        if (match) pattern.duration = parseInt(match[1])
    }
    if (code.includes('.rev()') || code.includes('.reverse()')) {
        pattern.sounds = pattern.sounds.reverse()
    }
    
    // Parse effects
    if (code.includes('.lpf(')) {
        const match = code.match(/\.lpf\((\d+)\)/)
        if (match) pattern.effects.lpf = parseInt(match[1])
    }
    if (code.includes('.delay(')) {
        const match = code.match(/\.delay\(([0-9.]+)\)/)
        if (match) pattern.effects.delay = parseFloat(match[1])
    }
    
    return pattern
}

// Play pattern
function playStrudelPattern(code) {
    try {
        addMessage(`🎵 Playing pattern:\n${code}`, 'music')
        
        const pattern = parseSimplePattern(code)
        
        if (pattern.sounds.length === 0) {
            addMessage('No sounds found in pattern', 'warning')
            return
        }
        
        const ctx = getAudioContext()
        const bpm = 120
        const beatDuration = (60 / bpm) * pattern.duration
        
        // Schedule each sound
        pattern.sounds.forEach((sound, index) => {
            const delay = beatDuration * index
            setTimeout(() => {
                if (sound) {
                    playDrumSound(sound, 0)
                    addMessage(`▶ ${sound}`, 'music')
                }
            }, delay * 1000)
        })
        
        addMessage(`✅ Pattern scheduled (${pattern.sounds.length} sounds)`, 'success')
        
        // Broadcast to other tabs
        if (syncManager) {
            setTimeout(() => {
                syncManager.broadcastPatternChange(code)
            }, 100)
        }
        
    } catch (error) {
        addMessage(`Pattern error: ${error.message}`, 'error')
    }
}

// WebSocket connection
function connect() {
    try {
        ws = new WebSocket('ws://localhost:8081/ws?type=strudel')
        
        ws.onopen = () => {
            addMessage('WebSocket connection established', 'success')
            updateStatus('Connected', 'connected')
            reconnectAttempts = 0
            try {
                getAudioContext()
                addMessage('Audio context initialized', 'info')
            } catch (e) {
                addMessage('Audio context init error: ' + e.message, 'warning')
            }
        }

        ws.onmessage = (event) => {
            const message = event.data
            addMessage(`Received: ${message}`, 'received')
            
            if (message === 'GET_CURRENT_PATTERN') {
                const currentCode = document.getElementById('strudelCode')?.value || ''
                ws.send(currentCode)
                addMessage(`Sent current pattern: ${currentCode}`, 'sent')
            } else if (message.trim()) {
                const codeElem = document.getElementById('strudelCode')
                if (codeElem) {
                    codeElem.value = message
                }
                addMessage(`New code received: ${message}`, 'info')
                playStrudelPattern(message)
            }
        }

        ws.onclose = (event) => {
            addMessage(`WebSocket closed: ${event.code} ${event.reason}`, 'warning')
            updateStatus('Disconnected', 'disconnected')
            
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++
                addMessage(`Reconnection attempt ${reconnectAttempts}...`, 'info')
                updateStatus('Reconnecting', 'reconnecting')
                setTimeout(connect, 3000)
            } else {
                addMessage('Max reconnection attempts reached', 'error')
            }
        }

        ws.onerror = (error) => {
            addMessage(`WebSocket error: ${error}`, 'error')
            updateStatus('Error', 'disconnected')
        }

    } catch (error) {
        addMessage(`Connection error: ${error.message}`, 'error')
    }
}

function executeCode() {
    const codeElem = document.getElementById('strudelCode')
    const code = codeElem?.value || ''
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(code)
        addMessage(`Code sent: ${code}`, 'sent')
        playStrudelPattern(code)
    } else {
        addMessage('WebSocket connection required', 'error')
    }
}

function getCurrentPattern() {
    const codeElem = document.getElementById('strudelCode')
    const code = codeElem?.value || ''
    addMessage(`Current pattern: ${code}`, 'info')
    return code
}

function stopMusic() {
    playingNotes.forEach((note) => {
        try {
            note.synth.stop()
            note.env.gain.setValueAtTime(0, getAudioContext().currentTime)
        } catch (e) {
            // Already stopped
        }
    })
    playingNotes.clear()
    addMessage('🛑 Music stopped', 'info')
}

function clearMessages() {
    const messagesElem = document.getElementById('messages')
    if (messagesElem) {
        messagesElem.innerHTML = ''
    }
}

function initAudioAndTest() {
    try {
        const ctx = getAudioContext()
        addMessage(`AudioContext state: ${ctx.state}`, 'info')
        addMessage(`Sample rate: ${ctx.sampleRate}`, 'info')
        
        if (ctx.state === 'suspended') {
            ctx.resume().then(() => {
                addMessage('AudioContext resumed', 'success')
            }).catch(err => {
                addMessage(`Resume error: ${err.message}`, 'error')
            })
        }
    } catch (error) {
        addMessage(`Audio init error: ${error.message}`, 'error')
    }
}

function testSimpleSound() {
    try {
        addMessage('Playing test sound (440Hz A4)...', 'info')
        playDrumSound('hh', 0)
        addMessage('Test sound played', 'success')
    } catch (error) {
        addMessage(`Test sound error: ${error.message}`, 'error')
    }
}

// Code analysis
function analyzeStrudelCode(code) {
    const lines = code.split('\n')
    const chars = code.split('').length
    
    const openParens = (code.match(/\(/g) || []).length
    const closeParens = (code.match(/\)/g) || []).length
    const openBrackets = (code.match(/\[/g) || []).length
    const closeBrackets = (code.match(/\]/g) || []).length
    
    const types = []
    if (code.includes('s(') || code.includes('sound(')) types.push('rhythm')
    if (code.includes('note(')) types.push('melody')
    if (code.includes('.fast(') || code.includes('.slow(')) types.push('transformation')
    if (code.includes('.stack(') || code.includes('.jux(')) types.push('combination')
    
    return {
        lines,
        chars,
        parensBalanced: openParens === closeParens,
        bracketsBalanced: openBrackets === closeBrackets,
        types: types.length > 0 ? types : ['basic'],
        complexity: (openParens + openBrackets) * 2 + lines.length
    }
}

function initializeBasicEditor() {
    const textarea = document.getElementById('strudelCode')
    const statusPanel = document.getElementById('codeStatus')
    const lineNumbers = document.getElementById('lineNumbers')
    
    if (textarea && statusPanel) {
        textarea.addEventListener('input', () => {
            updateBasicStatus(textarea.value)
            updateLineNumbers(textarea.value)
        })
        
        updateBasicStatus(textarea.value)
        updateLineNumbers(textarea.value)
        addMessage('Editor initialized', 'success')
    }
}

function updateLineNumbers(code) {
    const lineNumbersDiv = document.getElementById('lineNumbers')
    if (!lineNumbersDiv) return
    
    const lines = code.split('\n')
    const lineNumbersHtml = lines.map((_, index) => index + 1).join('\n')
    lineNumbersDiv.textContent = lineNumbersHtml
}

function updateBasicStatus(code) {
    const statusPanel = document.getElementById('codeStatus')
    if (!statusPanel) return
    
    const analysis = analyzeStrudelCode(code)
    
    let statusHtml = '<div class="status-success">✓ Editor: Ready</div>'
    statusHtml += `<div class="status-warning">📊 ${analysis.lines.length} lines, ${analysis.chars} chars</div>`
    statusHtml += `<div class="status-success">🎵 Pattern types: ${analysis.types.join(', ')}</div>`
    statusHtml += `<div class="status-warning">🔧 Complexity: ${analysis.complexity}</div>`
    
    if (analysis.parensBalanced && analysis.bracketsBalanced) {
        statusHtml += '<div class="status-success">✓ Brackets balanced: OK</div>'
    } else {
        statusHtml += '<div class="status-error">⚠ Brackets not balanced</div>'
    }
    
    statusPanel.innerHTML = statusHtml
}

// Global API functions
window.getStrudelDocs = async function() {
    addMessage('📚 Fetching Strudel documentation...', 'info')
    try {
        const response = await fetch('/api/strudel/docs')
        const docs = await response.text()
        addMessage('Documentation fetched:\n' + docs, 'success')
    } catch (error) {
        addMessage('Documentation fetch error: ' + error.message, 'error')
        addMessage('📚 Strudel basics:\n- s("bd hh sd oh"): drum pattern\n- .fast(2): 2x speed\n- .slow(2): 2x slow\n- .rev(): reverse\n- .stack(): layer\n- .jux(): alternate', 'info')
    }
}

window.startChromeDevTools = function() {
    addMessage('🔧 Chrome DevTools integration available via MCP server', 'info')
}

window.takePageSnapshot = function() {
    addMessage('📸 Page snapshot available via MCP server', 'info')
}

window.analyzePerformance = function() {
    addMessage('📊 Performance analysis available via MCP server', 'info')
}

window.executeCode = executeCode
window.getCurrentPattern = getCurrentPattern
window.stopMusic = stopMusic
window.clearMessages = clearMessages
window.initAudioAndTest = initAudioAndTest
window.testSimpleSound = testSimpleSound

// BroadcastChannel Sync Manager
class StrudelSyncManager {
    constructor() {
        this.channel = null
        this.isActive = true
        this.tabId = this.generateTabId()
        this.isPerformanceTab = false
        this.reconnectAttempts = 0
        this.maxReconnectAttempts = 5
        this.reconnectDelay = 1000
        this.lastSyncTime = 0
        this.pendingMessages = []
        this.errorCount = 0
        this.maxErrors = 10
        
        this.initializeChannel()
        this.setupEventListeners()
        this.announceConnection()
        
        console.log('[SYNC] Manager initialized, tab ID:', this.tabId)
    }
    
    generateTabId() {
        return 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    }

    initializeChannel() {
        try {
            this.channel = new BroadcastChannel('strudel-sync')
            console.log('[SYNC] BroadcastChannel initialized')
        } catch (error) {
            this.handleChannelError('INIT_ERROR', error)
        }
    }
    
    handleChannelError(errorType, error) {
        this.errorCount++
        console.error(`[SYNC] ${errorType}:`, error)
        
        if (this.errorCount >= this.maxErrors) {
            this.disableSync('Too many errors')
            return
        }
        
        const errorMessages = {
            'INIT_ERROR': 'Sync initialization failed',
            'CHANNEL_ERROR': 'Sync channel error',
            'SEND_ERROR': 'Sync message send failed',
            'TIMEOUT_ERROR': 'Sync timeout',
            'RECONNECT_ERROR': 'Reconnection failed'
        }
        
        const message = errorMessages[errorType] || `Sync error: ${errorType}`
        addMessage(`⚠️ ${message} (${this.errorCount}/${this.maxErrors})`, 'error')
        
        if (errorType === 'INIT_ERROR' || errorType === 'CHANNEL_ERROR') {
            this.attemptReconnect()
        }
    }
    
    setupEventListeners() {
        if (!this.channel) return
        
        this.channel.onmessage = (event) => {
            if (!this.isActive) return
            
            try {
                const { type, data, senderTabId, timestamp } = event.data
                
                if (senderTabId === this.tabId) return
                
                if (timestamp && timestamp < this.lastSyncTime - 10000) {
                    console.warn('[SYNC] Ignoring old message')
                    return
                }
                
                this.handleSyncMessage(type, data, timestamp)
            } catch (error) {
                this.handleChannelError('MESSAGE_ERROR', error)
            }
        }
        
        window.addEventListener('beforeunload', () => {
            this.safeBroadcast('TAB_CLOSED', {}, true)
        })
    }
    
    safeBroadcast(type, data, isFinal = false) {
        if (!this.isActive || !this.channel) return false
        
        try {
            const message = {
                type,
                data,
                senderTabId: this.tabId,
                timestamp: Date.now()
            }
            
            this.channel.postMessage(message)
            
            if (!isFinal) {
                this.pendingMessages.push(message)
                this.trimPendingMessages()
            }
            
            return true
        } catch (error) {
            this.handleChannelError('SEND_ERROR', error)
            return false
        }
    }
    
    trimPendingMessages() {
        if (this.pendingMessages.length > 50) {
            this.pendingMessages = this.pendingMessages.slice(-25)
        }
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.disableSync('Max reconnection attempts reached')
            return
        }
        
        this.reconnectAttempts++
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
        
        console.log(`[SYNC] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
        
        setTimeout(() => {
            try {
                if (this.channel) {
                    this.channel.close()
                }
                this.initializeChannel()
                this.setupEventListeners()
                
                addMessage(`✅ Sync reconnected (attempt ${this.reconnectAttempts})`, 'success')
                this.errorCount = Math.max(0, this.errorCount - 3)
                this.reconnectAttempts = 0
                
                this.resendPendingMessages()
                this.announceConnection()
            } catch (error) {
                this.handleChannelError('RECONNECT_ERROR', error)
            }
        }, delay)
    }
    
    resendPendingMessages() {
        if (this.pendingMessages.length === 0) return
        
        console.log(`[SYNC] Resending ${this.pendingMessages.length} pending messages`)
        
        const messages = [...this.pendingMessages]
        this.pendingMessages = []
        
        messages.forEach(message => {
            this.safeBroadcast(message.type, message.data)
        })
    }
    
    disableSync(reason) {
        this.isActive = false
        console.warn(`[SYNC] Sync disabled: ${reason}`)
        addMessage(`❌ Sync disabled: ${reason}`, 'error')
        
        try {
            if (this.channel) {
                this.channel.close()
                this.channel = null
            }
        } catch (error) {
            console.error('[SYNC] Error closing channel:', error)
        }
    }
    
    announceConnection() {
        this.safeBroadcast('TAB_CONNECTED', { isPerformanceTab: this.isPerformanceTab })
    }
    
    setPerformanceTab(isPerformance) {
        this.isPerformanceTab = isPerformance
        this.safeBroadcast('TAB_ROLE_CHANGED', { isPerformanceTab: isPerformance })
    }
    
    broadcastPatternChange(code, patternInfo = null) {
        if (!this.isActive) return
        
        const data = {
            code: code,
            timestamp: Date.now()
        }
        
        const success = this.safeBroadcast('PATTERN_CHANGE', data)
        if (success) {
            console.log('[SYNC] Pattern broadcasted:', data)
            this.lastSyncTime = Date.now()
        }
    }
    
    broadcastPlaybackState(isPlaying, tempo = null) {
        if (!this.isActive) return
        
        this.safeBroadcast('PLAYBACK_STATE', { isPlaying, tempo })
    }
    
    handleSyncMessage(type, data, timestamp) {
        console.log('[SYNC] Received:', type, data)
        
        switch (type) {
            case 'TAB_CONNECTED':
                console.log('[SYNC] New tab connected')
                break
                
            case 'TAB_CLOSED':
                console.log('[SYNC] Tab closed')
                break
                
            case 'PATTERN_CHANGE':
                this.handlePatternChange(data, timestamp)
                break
                
            case 'PLAYBACK_STATE':
                this.handlePlaybackState(data, timestamp)
                break
        }
    }
    
    handlePatternChange(data, timestamp) {
        if (this.isPerformanceTab && data.code) {
            console.log('[SYNC] Performance tab receiving pattern:', data.code)
            
            const codeEditor = document.getElementById('strudelCode')
            if (codeEditor) {
                codeEditor.value = data.code
                updateLineNumbers(data.code)
                updateBasicStatus(data.code)
            }
            
            try {
                playStrudelPattern(data.code)
                addMessage('🔄 Pattern synced from other tab', 'success')
            } catch (error) {
                addMessage('Sync pattern error: ' + error.message, 'error')
            }
        }
    }
    
    handlePlaybackState(data, timestamp) {
        const { isPlaying, tempo } = data
        let message = isPlaying ? '▶️ Playback started' : '⏸️ Playback stopped'
        if (tempo) message += ` (Tempo: ${tempo})`
        addMessage(`🔄 ${message}`, 'info')
    }
    
    getStatus() {
        return {
            isActive: this.isActive,
            tabId: this.tabId,
            isPerformanceTab: this.isPerformanceTab,
            errorCount: this.errorCount,
            maxErrors: this.maxErrors,
            reconnectAttempts: this.reconnectAttempts,
            pendingMessages: this.pendingMessages.length,
            lastSyncTime: this.lastSyncTime
        }
    }
    
    toggleSync() {
        this.isActive = !this.isActive
        console.log('[SYNC]', this.isActive ? 'enabled' : 'disabled')
        return this.isActive
    }
}

let syncManager = null

function initializeSyncManager() {
    if (!syncManager) {
        syncManager = new StrudelSyncManager()
    }
    return syncManager
}

window.togglePerformanceTab = function() {
    if (syncManager) {
        syncManager.setPerformanceTab(!syncManager.isPerformanceTab)
        const status = syncManager.isPerformanceTab ? 'Performance' : 'MCP'
        addMessage(`🎭 Tab role: ${status}`, 'info')
        return syncManager.isPerformanceTab
    }
    return false
}

window.toggleSync = function() {
    if (syncManager) {
        const active = syncManager.toggleSync()
        addMessage(`${active ? '✅' : '❌'} Sync ${active ? 'enabled' : 'disabled'}`, 'info')
        return active
    }
    return false
}

window.getSyncStatus = function() {
    if (syncManager) {
        const status = syncManager.getStatus()
        addMessage(`📊 Sync status: ${JSON.stringify(status, null, 2)}`, 'info')
        return status
    }
    return null
}

// Initialize on page load
window.onload = () => {
    connect()
    initializeBasicEditor()
    initializeSyncManager()
}

// Cleanup on page unload
window.onbeforeunload = () => {
    if (ws) {
        ws.close()
    }
    stopMusic()
}
