// Translations
const translations = {
    en: {
        title: "Audio Spectrogram Analyzer",
        upload: "Upload Audio File",
        play: "Play",
        pause: "Pause",
        stop: "Stop",
        detectedBpm: "Detected BPM:",
        noFile: "No file selected",
        analyzing: "Analyzing...",
        estimatedBpm: "Estimated BPM:",
        bpmError: "Could not detect BPM",
        error: "Error processing audio file",
        invalidFileType: "Invalid audio file type",
        fileTooLarge: "File is too large"
    },
    zh: {
        title: "音頻頻譜分析儀",
        upload: "上傳音頻文件",
        play: "播放",
        pause: "暫停",
        stop: "停止",
        detectedBpm: "檢測BPM:",
        noFile: "未選擇文件",
        analyzing: "分析中...",
        estimatedBpm: "預測BPM:",
        bpmError: "無法檢測BPM",
        error: "音頻文件處理錯誤",
        invalidFileType: "無效的音頻文件類型",
        fileTooLarge: "文件太大"
    }
};

let currentLanguage = 'en';

const i18nElements = document.querySelectorAll('[data-i18n]');
function translatePage() {
    i18nElements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = translations[currentLanguage][key];
    });
}

document.querySelectorAll('.language-selector button').forEach(button => {
    button.addEventListener('click', (e) => {
        currentLanguage = e.target.getAttribute('data-lang');
        translatePage();
    });
});

// Audio context setup
let audioContext;
let analyser;
let audioBuffer;
let source;
let isPlaying = false;
let pausedTime = 0;

// Canvas setup
const spectrogramCanvas = document.getElementById('spectrogram');
const waveformCanvas = document.getElementById('waveform');
const spectrogramCtx = spectrogramCanvas.getContext('2d');
const waveformCtx = waveformCanvas.getContext('2d');

// Button setup
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const fileInput = document.getElementById('audio-upload');
const fileInfo = document.getElementById('file-info');
const bpmValue = document.getElementById('bpm-value');

// Modify file upload event listeners
const uploadTrigger = document.getElementById('upload-trigger');

// Add click event to trigger file dialog
uploadTrigger.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', handleFileUpload);

// File upload handling
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) {
        fileInfo.textContent = translations[currentLanguage].noFile;
        return;
    }

    const validAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/webm'];
    if (!validAudioTypes.includes(file.type)) {
        fileInfo.textContent = translations[currentLanguage].invalidFileType || 'Invalid audio file type';
        return;
    }

    const maxFileSize = 100 * 1024 * 1024; // 50MB
    if (file.size > maxFileSize) {
        fileInfo.textContent = translations[currentLanguage].fileTooLarge || 'File is too large';
        return;
    }

    fileInfo.textContent = `${file.name} (${file.size > 1000000 ? `${Math.round(file.size/1000)}KB` : ''})`;

    resetAudio();
    if (audioContext?.close) await audioContext.close();

    try {
        const arrayBuffer = await file.arrayBuffer();
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Wrap decodeAudioData in a Promise to catch errors more gracefully.
        audioBuffer = await new Promise((resolve, reject) => {
            audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        });
        
        setupAudio();
    } catch (err) {
        fileInfo.textContent = translations[currentLanguage].error;
        console.error("Error processing audio file:", err);
        // Reset input to allow re-uploading
        fileInput.value = '';
    }
}

function setupAudio() {
    if (!audioBuffer) return;

    // Recreate audio context if it's closed
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    setupAnalyser();
    drawWaveform();
    detectBPM(audioBuffer);
    enableControls(); // Enable buttons after setup
}

// Enable Play, Pause, and Stop buttons
function enableControls() {
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
}
function setupAnalyser() {
    // Clear any existing source
    if (source) {
        source.disconnect();
    }

    // Create new analyser and source
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    source.onended = () => {
        stopAudio();
    };
}

// Global variable to switch waveform modes: "line" or "bar"
let waveformMode = 'line';

function drawWaveformLine() {
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    waveformCanvas.width = waveformCanvas.offsetWidth;
    waveformCanvas.height = 300;

    // Clear and set background
    waveformCtx.fillStyle = 'rgb(200, 200, 200)';
    waveformCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);

    // Set waveform style for line mode
    waveformCtx.lineWidth = 2;
    waveformCtx.strokeStyle = '#166088';
    waveformCtx.beginPath();

    const sliceWidth = waveformCanvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // Normalize to [0, 2]
        const y = v * waveformCanvas.height / 2; // Map to canvas height
        if (i === 0) {
            waveformCtx.moveTo(x, y);
        } else {
            waveformCtx.lineTo(x, y);
        }
        x += sliceWidth;
    }
    waveformCtx.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
    waveformCtx.stroke();
}

function drawWaveformBar() {
    const bufferLength = analyser.frequencyBinCount; // Use frequencyBinCount for smoother bars
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray); // Get frequency data for bar visualization

    // Dynamically set canvas dimensions
    waveformCanvas.width = waveformCanvas.offsetWidth;
    waveformCanvas.height = 400;

    // Clear the canvas
    waveformCtx.fillStyle = 'rgb(240, 240, 240)';
    waveformCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);

    // Calculate bar width and spacing dynamically
    const barWidth = (waveformCanvas.width / bufferLength) * 25; // Adjust multiplier for spacing
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 255.0 * waveformCanvas.height; // Normalize height to canvas
        const y = waveformCanvas.height - barHeight; // Align bars to the bottom

        // Draw each bar
        waveformCtx.fillStyle = `rgb(${barHeight + 30}, 20, 30)`; // Dynamic color based on height
        waveformCtx.fillRect(x, y, barWidth, barHeight);

        x += barWidth + 5; // Add spacing between bars
    }
}

function drawWaveform() {
    requestAnimationFrame(drawWaveform);
    if (!audioContext || !analyser) return;

    if (waveformMode === 'line') {
        drawWaveformLine();
    } else if (waveformMode === 'bar') {
        drawWaveformBar();
    }
}

// Example toggle button to switch waveform modes.
// Add a button with id "waveform-mode-btn" in your HTML as a toggle control.
const waveformModeBtn = document.getElementById('waveform-mode-btn');
if (waveformModeBtn) {
    waveformModeBtn.addEventListener('click', () => {
        // Toggle between "line" and "bar"
        waveformMode = waveformMode === 'line' ? 'bar' : 'line';
        waveformModeBtn.textContent = waveformMode === 'line' ? 'Switch to Bar Mode' : 'Switch to Line Mode';
    });
}

function drawSpectrogram() {


    if (!isPlaying) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Save the existing spectrogram data
    const lastImageData = spectrogramCtx.getImageData(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);

    // Only shift and update if we have previous data
    if (lastImageData) {
        // Shift existing spectrogram to the left
        const imageData = spectrogramCtx.getImageData(1, 0, spectrogramCanvas.width - 1, spectrogramCanvas.height);
        spectrogramCtx.putImageData(imageData, 0, 0);
    }

    // Draw new frequency data
    for (let i = 0; i < spectrogramCanvas.height; i++) {
        const value = dataArray[Math.floor(i * bufferLength / spectrogramCanvas.height)];
        const normalizedValue = value / 255;
        
        // Use HSL for smoother color transitions
        const hue = (1 - normalizedValue) * 240; // Blue to Red
        spectrogramCtx.fillStyle = `hsl(${hue}, 100%, ${normalizedValue * 50}%)`;
        
        spectrogramCtx.fillRect(
            spectrogramCanvas.width - 1,    // x position
            spectrogramCanvas.height - i - 1,// y position
            1,                              // width
            1                               // height
        );
    }

    requestAnimationFrame(drawSpectrogram);
}

function enableControls() {
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
}

let playtimeInterval; // To store the interval ID

function updatePlaytime() {
    if (!isPlaying || !source || !audioContext) return;

    // Calculate the current playtime
    const currentTime = pausedTime + (audioContext.currentTime - source.startTime);
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);

    // Update the playtime display
    const playtimeDisplay = document.getElementById('playtime');
    playtimeDisplay.textContent = `Playtime: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function playAudio() {
    if (isPlaying) return;

    // Ensure audio context is created/resumed
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        setupAnalyser();
    } else if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    // Recreate source node if needed
    if (!source || source.playbackState === source.FINISHED_STATE) {
        setupAnalyser();
    }

// Enable playtime tracking
playtimeInterval = setInterval(updatePlaytime, 1000);

    // Start playback from the paused position
    source.start(0, pausedTime || 0);
    // Record the start time for calculating pause duration
    source.startTime = audioContext.currentTime;  
    isPlaying = true;
    playBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;

    // Set up spectrogram
    spectrogramCanvas.width = spectrogramCanvas.offsetWidth;
    spectrogramCanvas.height = spectrogramCanvas.offsetHeight || 400;
    spectrogramCtx.fillStyle = 'rgb(2, 0, 0)';
    spectrogramCtx.fillRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);
    drawSpectrogram();
}

function pauseAudio() {
    if (!isPlaying) return;

    // Calculate and add elapsed time since playback started
    pausedTime += audioContext.currentTime - source.startTime;
    
    // Remove onended handler so that stopping the source doesn't reset pausedTime
    source.onended = null;

    // Stop the current source
    source.stop();
    source.disconnect();
    source = null;
    
    isPlaying = false;

// Stop playtime tracking
clearInterval(playtimeInterval);


    playBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = false;
    
    // Don't clear the spectrogram when pausing
    // The visualization will continue from where it left off when resumed
}

function stopAudio() {
    pausedTime = 0; // Reset paused time
    isPlaying = false;

    if (source) {
        source.stop();
        source.disconnect();
        source = null;
    }

// Stop playtime tracking
clearInterval(playtimeInterval);

// Reset playtime display
const playtimeDisplay = document.getElementById('playtime');
playtimeDisplay.textContent = 'Playtime: 0:00';


    playBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;

    // Clear spectrogram and waveform
    spectrogramCtx.clearRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);
    waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
}

playBtn.addEventListener('click', playAudio);
pauseBtn.addEventListener('click', pauseAudio);
stopBtn.addEventListener('click', stopAudio);

async function detectBPM(buffer) {
    bpmValue.textContent = translations[currentLanguage].analyzing;
    
    try {
        const bpmDetector = new BPMDetector(audioContext);
        const { bpm } = await bpmDetector.detectBPM(buffer);
        bpmValue.textContent = `${translations[currentLanguage].estimatedBpm} ${Math.round(bpm)}`;
    } catch (err) {
        console.error("BPM detection failed:", err);
        bpmValue.textContent = translations[currentLanguage].bpmError;
    }
}

function resetAudio() {
    stopAudio();
    spectrogramCtx.clearRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);
    waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
    bpmValue.textContent = "--";
    playBtn.disabled = true;  // Disable Play button
    pauseBtn.disabled = true; // Disable Pause button
    stopBtn.disabled = true;  // Disable Stop button
    if (source) {
        source.disconnect();
    }
    if (analyser) {
        analyser.disconnect();
    }
    source = null;
    analyser = null;
    audioBuffer = null;
}

// Initialize
resetAudio(); // Disable buttons and clear visuals
translatePage();