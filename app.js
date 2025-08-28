// app.js (persistência robusta com endTimestamp + gate canPersist + música via music.json + mensagens via messages.json + custom via localStorage + limpar custom)
let countdown = null;
let timeLeft = 0; // segundos
let isRunning = false;
let startTime = null;
let pausedTime = 0;
let endTimestamp = null; // alvo absoluto (ms desde epoch)

// Só persistimos depois da restauração inicial
let canPersist = false;

const timerEl = document.getElementById('timer');
const controls = document.querySelector('.timer-controls');
const presetMusic = document.getElementById('presetMusic');
const youtubeLink = document.getElementById('youtubeLink');
const playCustom = document.getElementById('playCustom');
const musicPlayer = document.getElementById('musicPlayer');

// Variáveis para dados JSON
let backgroundMusic = [];
let backgroundImages = [];

// Mensagens personalizáveis (run-text)
let runMessages = [];

// -------------------- Music State Manager --------------------
const musicState = {
  isSelected: false,        // há música selecionada?
  isPlaying: false,         // música está tocando?
  currentUrl: '',           // URL da música atual
  syncEnabled: true,        // sincronização ativa?
  lastAction: 'manual'      // 'manual' | 'timer-sync'
};

function getMusicState() {
  return { ...musicState };
}

function setMusicSelected(url) {
  musicState.isSelected = !!url;
  musicState.currentUrl = url || '';
  console.log('Music selected:', { url, isSelected: musicState.isSelected });
}

function setMusicPlaying(playing) {
  musicState.isPlaying = !!playing;
  console.log('Music playing state:', musicState.isPlaying);
}

function isMusicAvailableForSync() {
  return musicState.isSelected && musicState.currentUrl && musicState.syncEnabled;
}

function detectSelectedMusic() {
  // Verifica música preset selecionada
  const presetSelect = document.getElementById('presetMusic');
  if (presetSelect && presetSelect.value) {
    setMusicSelected(presetSelect.value);
    return presetSelect.value;
  }

  // Verifica URL customizada válida
  const customInput = document.getElementById('youtubeLink');
  if (customInput && customInput.value.trim()) {
    const url = customInput.value.trim();
    if (isValidYouTubeUrl(url)) {
      setMusicSelected(url);
      return url;
    }
  }

  // Nenhuma música válida encontrada
  setMusicSelected('');
  return '';
}

function isValidYouTubeUrl(url) {
  if (!url) return false;
  const videoId = extractVideoId(url);
  return !!videoId;
}

function checkMusicAvailability() {
  const selectedUrl = detectSelectedMusic();
  const isAvailable = !!selectedUrl;

  console.log('Music availability check:', {
    selectedUrl,
    isAvailable,
    syncEnabled: musicState.syncEnabled
  });

  return isAvailable;
}

// Sistema de Cache
const CACHE_KEYS = {
  TIMER_STATE: 'cronometro_timer_state',
  TIMER_CONFIG: 'cronometro_timer_config',
  MUSIC_STATE: 'cronometro_music_state',
  RUN_TEXT_SELECTED: 'cronometro_run_text',
  RUN_TEXT_CUSTOMS: 'cronometro_run_text_customs' // lista de mensagens personalizadas
};

// -------------------- Cache do Timer --------------------
function saveTimerState() {
  if (!canPersist) return; // ainda inicializando
  if (timeLeft <= 0 && !isRunning) return; // não salva estado "vazio"

  const state = {
    timeLeft,
    isRunning,
    startTime,
    pausedTime,
    endTimestamp,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(CACHE_KEYS.TIMER_STATE, JSON.stringify(state));
  } catch (error) {
    console.error('Erro ao salvar timer:', error);
  }
}

function loadTimerState() {
  try {
    const saved = localStorage.getItem(CACHE_KEYS.TIMER_STATE);
    if (!saved) return null;

    const state = JSON.parse(saved);
    const now = Date.now();

    if (!state.timestamp || typeof state.timeLeft !== 'number') {
      clearTimerCache();
      return null;
    }

    const hasEnd = typeof state.endTimestamp === 'number' && state.endTimestamp > 0;

    if (state.isRunning && hasEnd) {
      const computed = Math.max(0, Math.round((state.endTimestamp - now) / 1000));
      if (computed <= 0) {
        clearTimerCache();
        return null;
      }
      return {
        ...state,
        timeLeft: computed,
        isRunning: true,
        startTime: now - (state.timeLeft - computed) * 1000,
        pausedTime: 0
      };
    }

    if (state.isRunning && state.timeLeft > 0) {
      const elapsedTime = Math.floor((now - state.timestamp) / 1000);
      const newTimeLeft = Math.max(0, state.timeLeft - elapsedTime);

      if (newTimeLeft <= 0) {
        clearTimerCache();
        return null;
      }

      return {
        ...state,
        timeLeft: newTimeLeft,
        isRunning: true,
        startTime: now - elapsedTime * 1000,
        pausedTime: 0,
        endTimestamp: now + newTimeLeft * 1000
      };
    }

    // pausado ou parado
    return {
      ...state,
      isRunning: false,
      endTimestamp: hasEnd ? state.endTimestamp : null
    };
  } catch (error) {
    console.error('Erro ao carregar timer:', error);
    clearTimerCache();
    return null;
  }
}

function clearTimerCache() {
  localStorage.removeItem(CACHE_KEYS.TIMER_STATE);
}

function showCacheStatus(message, type = 'success') {
  let indicator = document.querySelector('.cache-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'cache-indicator';
    document.body.appendChild(indicator);
  }

  indicator.textContent = message;
  indicator.className = `cache-indicator show ${type}`;

  setTimeout(() => {
    indicator.classList.remove('show');
  }, 2000);
}

// -------------------- Timer UI/Fluxo --------------------
function updateDisplay() {
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const statusEl = document.getElementById('timer-status');
  if (statusEl) {
    if (isRunning) statusEl.textContent = '';
    else if (timeLeft > 0) statusEl.textContent = 'Timer pausado';
    else statusEl.textContent = 'Defina um tempo para começar';
  }

  // Mostra/esconde o aviso divertido DURANTE execução
  const runFun = document.getElementById('run-fun');
  if (runFun) {
    if (isRunning && timeLeft > 0) runFun.classList.remove('hidden');
    else runFun.classList.add('hidden');
  }

  // Atualiza status de sincronização
  updateSyncStatusDisplay();

  saveTimerState();
}

function recomputeTimeLeftFromEnd() {
  if (endTimestamp && isRunning) {
    const now = Date.now();
    timeLeft = Math.max(0, Math.round((endTimestamp - now) / 1000));
  }
}

function tick() {
  recomputeTimeLeftFromEnd();
  updateDisplay();

  if (timeLeft <= 0) {
    clearInterval(countdown);
    isRunning = false;
    updateButtonStates('stopped');
    clearTimerCache();
    endTimestamp = null;

    // Sincronizar música quando timer termina
    syncMusicWithTimer('stop');

    // Mensagem no status
    const statusEl = document.getElementById('timer-status');
    if (statusEl) {
      statusEl.textContent = '⏰ Tempo esgotado!';
    }

    showNotification('⏰ Tempo esgotado!', 'O timer chegou ao fim.');
  }
}

function startTimer(min) {
  clearInterval(countdown);
  timeLeft = Math.max(0, Math.round(min * 60));
  isRunning = true;
  startTime = Date.now();
  pausedTime = 0;
  endTimestamp = startTime + timeLeft * 1000;

  updateDisplay();
  countdown = setInterval(tick, 1000);
  updateButtonStates('running');

  document.body.classList.add('timer-running');

  // Re-habilita sync e sincroniza música quando timer inicia
  reEnableSync();
  syncMusicWithTimer('start');
}

function adjustTimer(delta) {
  const deltaSecs = Math.round(delta * 60);

  if (isRunning) {
    if (!endTimestamp) endTimestamp = Date.now() + timeLeft * 1000;
    endTimestamp = Math.max(Date.now(), endTimestamp + deltaSecs * 1000);
    recomputeTimeLeftFromEnd();
  } else {
    timeLeft = Math.max(0, timeLeft + deltaSecs);
  }

  updateDisplay();
}

function startCurrentTimer() {
  if (timeLeft > 0) {
    clearInterval(countdown);
    isRunning = true;
    startTime = Date.now() - pausedTime;
    endTimestamp = Date.now() + timeLeft * 1000;

    countdown = setInterval(tick, 1000);
    updateButtonStates('running');
    document.body.classList.add('timer-running');
    updateDisplay();

    // Re-habilita sync e sincroniza música quando timer atual inicia
    reEnableSync();
    syncMusicWithTimer('start');
  } else {
    showNotification('⚠️ Tempo não definido', 'Defina um tempo primeiro usando os botões de minutos!');
  }
}

function pauseTimer() {
  clearInterval(countdown);
  recomputeTimeLeftFromEnd();
  isRunning = false;
  if (startTime) pausedTime = Date.now() - startTime;

  updateButtonStates('paused');
  document.body.classList.remove('timer-running');
  updateDisplay();

  // Sincronizar música quando timer pausa
  syncMusicWithTimer('pause');
}

function resetTimer() {
  clearInterval(countdown);
  isRunning = false;
  timeLeft = 0;
  startTime = null;
  pausedTime = 0;
  endTimestamp = null;

  updateDisplay();
  updateButtonStates('stopped');
  document.body.classList.remove('timer-running');
  clearTimerCache();

  // Sincronizar música quando timer reseta
  syncMusicWithTimer('reset');
}

function updateButtonStates(state) {
  const startBtn = document.querySelector('[data-action="start"]');
  const pauseBtn = document.querySelector('[data-action="pause"]');

  if (startBtn && pauseBtn) {
    if (state === 'running') {
      startBtn.classList.add('hidden');
      pauseBtn.classList.remove('hidden');
    } else {
      startBtn.classList.remove('hidden');
      pauseBtn.classList.add('hidden');
    }
  } else {
    console.error('Botões não encontrados:', { startBtn: !!startBtn, pauseBtn: !!pauseBtn });
  }
}

function showNotification(title, message) {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⏱️</text></svg>'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body: message });
        }
      });
    }
  }
  // sem alert() para não interromper a tela
}

// -------------------- YouTube Player API --------------------
let youtubePlayer = null;
let isYouTubeAPIReady = false;

// Função chamada automaticamente quando a API do YouTube está pronta
function onYouTubeIframeAPIReady() {
  isYouTubeAPIReady = true;
  console.log('YouTube API ready');
}

// Torna a função disponível globalmente para a API do YouTube
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

function createYouTubePlayer(videoId) {
  return new Promise((resolve, reject) => {
    try {
      if (youtubePlayer) {
        youtubePlayer.destroy();
      }

      youtubePlayer = new YT.Player('musicPlayer', {
        height: '200',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: videoId,
          controls: 1,
          modestbranding: 1,
          rel: 0
        },
        events: {
          onReady: (event) => {
            console.log('YouTube player ready');
            resolve(event.target);
          },
          onStateChange: (event) => {
            handleYouTubeStateChange(event);
          },
          onError: (event) => {
            console.error('YouTube player error:', event.data);
            reject(new Error(`YouTube player error: ${event.data}`));
          }
        }
      });
    } catch (error) {
      console.error('Error creating YouTube player:', error);
      reject(error);
    }
  });
}

function handleYouTubeStateChange(event) {
  const state = event.data;

  // YT.PlayerState constants: UNSTARTED (-1), ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
  switch (state) {
    case YT.PlayerState.PLAYING:
      setMusicPlaying(true);
      break;
    case YT.PlayerState.PAUSED:
    case YT.PlayerState.ENDED:
      setMusicPlaying(false);
      break;
  }
}

// -------------------- Eventos / Música --------------------
function initializeEventListeners() {
  const controls = document.querySelector('.timer-controls');
  if (controls) {
    controls.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'quick') return startTimer(Number(btn.dataset.min));
      if (action === 'adjust') return adjustTimer(Number(btn.dataset.min));
      if (action === 'start') return startCurrentTimer();
      if (action === 'pause') return pauseTimer();
      if (action === 'reset') return resetTimer();
    });
  }

  const startBtn = document.querySelector('[data-action="start"]');
  const pauseBtn = document.querySelector('[data-action="pause"]');
  const resetBtn = document.querySelector('[data-action="reset"]');

  if (startBtn) startBtn.addEventListener('click', startCurrentTimer);
  if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
  if (resetBtn) resetBtn.addEventListener('click', resetTimer);

  const presetMusic = document.getElementById('presetMusic');
  const playCustom = document.getElementById('playCustom');
  const stopMusicBtn = document.getElementById('stopMusic');

  if (presetMusic) {
    presetMusic.addEventListener('change', () => {
      const url = presetMusic.value;
      if (url) {
        handleManualMusicControl();
        playYouTube(url);
      } else {
        // Quando deseleciona música
        setMusicSelected('');
      }
    });
  }

  if (playCustom) {
    playCustom.addEventListener('click', () => {
      const url = document.getElementById('youtubeLink').value.trim();
      if (url) {
        handleManualMusicControl();
        playYouTube(url);
      }
    });
  }

  if (stopMusicBtn) {
    stopMusicBtn.addEventListener('click', () => {
      handleManualMusicControl();
      stopMusic();
    });
  }

  // Detecta mudanças no campo de URL customizada
  const youtubeInput = document.getElementById('youtubeLink');
  if (youtubeInput) {
    youtubeInput.addEventListener('input', () => {
      // Detecta música selecionada quando usuário digita
      setTimeout(detectSelectedMusic, 300); // debounce
    });
  }

  const setCustomTimeBtn = document.getElementById('setCustomTime');
  if (setCustomTimeBtn) {
    setCustomTimeBtn.addEventListener('click', () => {
      const customTime = parseInt(document.getElementById('customTimeInput').value);
      if (!isNaN(customTime) && customTime > 0) {
        // startTimer já inclui sincronização automática com música
        startTimer(customTime);
      } else {
        alert('Por favor, insira um valor válido para o tempo.');
      }
    });
  }
}

async function playYouTube(url) {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      const errorMsg = 'Link do YouTube inválido. Verifique o URL.';
      if (musicState.lastAction === 'timer-sync') {
        showSyncError(errorMsg);
      } else {
        alert(errorMsg);
      }
      return;
    }

    // Verifica se a API do YouTube está disponível
    if (!isYouTubeAPIReady || typeof YT === 'undefined') {
      // Fallback para iframe simples se API não estiver disponível
      playYouTubeFallback(url, videoId);
      return;
    }

    // Mostra o player
    const playerElement = document.getElementById('musicPlayer');
    if (playerElement) {
      playerElement.style.width = '100%';
      playerElement.style.height = '200px';
      playerElement.style.maxWidth = '600px';
      playerElement.style.display = 'block';
    }

    // Cria ou atualiza o player do YouTube
    if (youtubePlayer && youtubePlayer.loadVideoById) {
      // Player já existe, apenas carrega novo vídeo
      youtubePlayer.loadVideoById(videoId);
    } else {
      // Cria novo player
      await createYouTubePlayer(videoId);
    }

    // Atualizar music state
    setMusicSelected(url);
    setMusicPlaying(true);

    const musicTitle = findMusicTitle(url);
    showMusicStatus(`🎵 Reproduzindo: ${musicTitle}`);
  } catch (error) {
    console.error('Error in playYouTube:', error);
    // Fallback para iframe simples em caso de erro
    const videoId = extractVideoId(url);
    if (videoId) {
      playYouTubeFallback(url, videoId);
    } else {
      showSyncError('Erro inesperado ao reproduzir música');
    }
  }
}

// Função fallback para usar iframe simples quando API não está disponível
function playYouTubeFallback(url, videoId) {
  try {
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=1&modestbranding=1&rel=0`;

    const playerElement = document.getElementById('musicPlayer');
    if (playerElement) {
      // Cria iframe dentro do div
      playerElement.innerHTML = `<iframe 
        src="${embedUrl}" 
        width="100%" 
        height="200" 
        frameborder="0" 
        allow="autoplay; encrypted-media"
        class="rounded-lg shadow-lg"
        title="Reprodutor do YouTube">
      </iframe>`;

      playerElement.style.width = '100%';
      playerElement.style.height = '200px';
      playerElement.style.maxWidth = '600px';
      playerElement.style.display = 'block';
    }

    // Atualizar music state
    setMusicSelected(url);
    setMusicPlaying(true);

    const musicTitle = findMusicTitle(url);
    showMusicStatus(`🎵 Reproduzindo: ${musicTitle} (modo compatibilidade)`);

    console.log('Using fallback iframe method');
  } catch (error) {
    showSyncError('Erro ao reproduzir música');
    console.error('Error in playYouTubeFallback:', error);
  }
}

function findMusicTitle(url) {
  const music = backgroundMusic.find(m => m.youtubeUrl === url);
  return music ? music.title : 'Música personalizada';
}

// Variável para armazenar URL pausada
let pausedMusicUrl = '';

function pauseMusic() {
  try {
    // Tenta usar a API do YouTube primeiro
    if (youtubePlayer && youtubePlayer.pauseVideo && isYouTubeAPIReady) {
      youtubePlayer.pauseVideo();
      setMusicPlaying(false);
      showMusicStatus('⏸️ Música pausada');
      console.log('Music paused via YouTube API');
      return;
    }

    // Fallback para método iframe (salva URL e remove src)
    const playerElement = document.getElementById('musicPlayer');
    if (playerElement && (playerElement.querySelector('iframe') || playerElement.src)) {
      pausedMusicUrl = musicState.currentUrl;

      if (playerElement.querySelector('iframe')) {
        playerElement.innerHTML = '';
      } else {
        playerElement.src = '';
      }

      playerElement.style.width = '0';
      playerElement.style.height = '0';
      setMusicPlaying(false);
      showMusicStatus('⏸️ Música pausada');
      console.log('Music paused via fallback method');
    }
  } catch (error) {
    console.error('Erro ao pausar música:', error);
  }
}

function resumeMusic() {
  try {
    // Tenta usar a API do YouTube primeiro
    if (youtubePlayer && youtubePlayer.playVideo && isYouTubeAPIReady && musicState.isPlaying === false) {
      youtubePlayer.playVideo();

      // Mostra o player
      const playerElement = document.getElementById('musicPlayer');
      if (playerElement) {
        playerElement.style.width = '100%';
        playerElement.style.height = '200px';
        playerElement.style.maxWidth = '600px';
        playerElement.style.display = 'block';
      }

      setMusicPlaying(true);
      showMusicStatus('▶️ Música retomada');
      console.log('Music resumed via YouTube API');
      return;
    }

    // Fallback para método iframe (recarrega a música)
    if (pausedMusicUrl) {
      playYouTube(pausedMusicUrl);
      pausedMusicUrl = '';
      showMusicStatus('▶️ Música retomada');
      console.log('Music resumed via fallback method');
    }
  } catch (error) {
    console.error('Erro ao retomar música:', error);
  }
}

function stopMusic() {
  try {
    // Tenta usar a API do YouTube primeiro
    if (youtubePlayer && youtubePlayer.stopVideo && isYouTubeAPIReady) {
      youtubePlayer.stopVideo();
      console.log('Music stopped via YouTube API');
    }

    // Limpa o player element
    const playerElement = document.getElementById('musicPlayer');
    if (playerElement) {
      if (playerElement.querySelector('iframe')) {
        playerElement.innerHTML = '';
      } else {
        playerElement.src = '';
      }

      playerElement.style.width = '0';
      playerElement.style.height = '0';
      playerElement.style.display = 'block'; // reset display
    }

    // Limpa URL pausada quando para completamente
    pausedMusicUrl = '';
    setMusicPlaying(false);
    setMusicSelected(''); // limpa seleção quando para
    showMusicStatus('🔇 Música parada');
  } catch (error) {
    console.error('Erro ao parar música:', error);
  }
}

// -------------------- Sync Controller --------------------
function syncMusicWithTimer(action) {
  // Verifica se há música disponível antes de sincronizar
  if (!checkMusicAvailability()) {
    console.log('Music sync skipped - no music selected');
    return;
  }

  if (!musicState.syncEnabled) {
    console.log('Music sync skipped - sync disabled');
    return;
  }

  try {
    musicState.lastAction = 'timer-sync';

    switch (action) {
      case 'start':
        handleTimerStart();
        break;
      case 'pause':
        handleTimerPause();
        break;
      case 'stop':
      case 'reset':
        handleTimerStop();
        break;
      default:
        console.warn('Unknown sync action:', action);
    }
  } catch (error) {
    console.error('Erro na sincronização música-timer:', error);
    // Timer continua normalmente mesmo se música falhar
  }
}

function handleTimerStart() {
  try {
    // Se há música pausada, retoma
    if (pausedMusicUrl) {
      resumeMusic();
      console.log('Music resumed via timer sync');
    }
    // Se há URL selecionada mas não está tocando, inicia
    else if (musicState.currentUrl && !musicState.isPlaying) {
      playYouTube(musicState.currentUrl);
      console.log('Music started via timer sync');
    }
  } catch (error) {
    showSyncError('Falha ao iniciar música');
    console.error('Error in handleTimerStart:', error);
  }
}

function handleTimerPause() {
  try {
    if (musicState.isPlaying) {
      pauseMusic();
      console.log('Music paused via timer sync');
    }
  } catch (error) {
    showSyncError('Falha ao pausar música');
    console.error('Error in handleTimerPause:', error);
  }
}

function handleTimerStop() {
  try {
    if (musicState.isPlaying) {
      // Para música completamente quando timer para/reseta
      stopMusic();
      console.log('Music stopped via timer sync');
    }
  } catch (error) {
    showSyncError('Falha ao parar música');
    console.error('Error in handleTimerStop:', error);
  }
}

function handleManualMusicControl() {
  // Desabilita sync temporariamente quando usuário controla música manualmente
  musicState.lastAction = 'manual';
  musicState.syncEnabled = false;
  console.log('Manual music control detected - sync temporarily disabled');

  // Re-habilita sync após um tempo ou na próxima ação do timer
  setTimeout(() => {
    if (musicState.lastAction === 'manual') {
      musicState.syncEnabled = true;
      console.log('Sync re-enabled after manual control timeout');
    }
  }, 5000); // 5 segundos
}

function reEnableSync() {
  musicState.syncEnabled = true;
  musicState.lastAction = 'timer-sync';
  console.log('Sync re-enabled by timer action');
}

function showMusicStatus(message, persistent = false) {
  let statusEl = document.getElementById('musicStatus');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'musicStatus';
    statusEl.style.cssText = 'margin-top: 8px; font-size: 0.9rem; opacity: 0.8; text-align: center;';
    const container = document.querySelector('.music-player-container');
    if (container) container.appendChild(statusEl);
  }

  // Adiciona informação de sincronização se aplicável
  let fullMessage = message;
  if (musicState.lastAction === 'timer-sync' && musicState.isPlaying) {
    fullMessage += ' 🔄 (Sincronizado com timer)';
  }

  statusEl.textContent = fullMessage;

  if (!persistent) {
    setTimeout(() => {
      if (statusEl.textContent === fullMessage) {
        updateSyncStatusDisplay();
      }
    }, 3000);
  }
}

function updateSyncStatusDisplay() {
  const statusEl = document.getElementById('musicStatus');
  if (!statusEl) return;

  if (isRunning && isMusicAvailableForSync()) {
    statusEl.textContent = '🔄 Timer e música sincronizados';
    statusEl.style.color = '#10b981'; // verde
  } else if (isRunning && !musicState.isSelected) {
    statusEl.textContent = '⏱️ Apenas timer ativo';
    statusEl.style.color = '#f59e0b'; // amarelo
  } else if (musicState.isSelected && !isRunning) {
    statusEl.textContent = '🎵 Música selecionada';
    statusEl.style.color = '#3b82f6'; // azul
  } else {
    statusEl.textContent = '';
    statusEl.style.color = '';
  }
}

function showSyncError(error) {
  showMusicStatus(`❌ Erro na música: ${error}. Timer continua normalmente.`, false);
  console.error('Music sync error:', error);
}

// Função de debug para testar sincronização
function debugMusicSync() {
  console.log('=== Music Sync Debug Info ===');
  console.log('Music State:', getMusicState());
  console.log('Timer Running:', isRunning);
  console.log('Time Left:', timeLeft);
  console.log('Music Available for Sync:', isMusicAvailableForSync());
  console.log('Selected Music URL:', detectSelectedMusic());
  console.log('============================');
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /[?&]v=([^&\n?#]+)/ // Para URLs com parâmetros extras como list=
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1].split('&')[0].split('#')[0];
  }
  return '';
}

// -------------------- Carregar JSONs --------------------
async function loadBackgroundMusic() {
  try {
    const response = await fetch('music.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    backgroundMusic = Array.isArray(data) ? data : (data.backgroundMusic || []);
    if (!Array.isArray(backgroundMusic)) backgroundMusic = [];
  } catch (error) {
    console.error('Erro ao carregar music.json:', error);
    backgroundMusic = [];
  }

  populateMusicSelect();
}

function populateMusicSelect() {
  const select = document.getElementById('presetMusic');
  if (!select) {
    console.error('Elemento select não encontrado!');
    return;
  }

  // limpa tudo menos o placeholder
  while (select.children.length > 1) {
    select.removeChild(select.lastChild);
  }

  if (!backgroundMusic.length) return;

  backgroundMusic.forEach((music) => {
    const option = document.createElement('option');
    option.value = music.youtubeUrl || music.url || '';
    option.textContent = `${music.title || 'Sem título'}${music.duration ? ` (${music.duration})` : ''}`;
    option.dataset.category = music.category || '';
    select.appendChild(option);
  });
}

// ======== MENSAGENS (messages.json + personalizadas via localStorage) ========
async function loadRunMessages() {
  try {
    const res = await fetch('messages.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    runMessages = Array.isArray(data) ? data : (data.messages || []);
    if (!Array.isArray(runMessages)) runMessages = [];
  } catch (e) {
    console.error('Erro ao carregar messages.json:', e);
    runMessages = [];
  }

  renderRunMessageOptions();
  // aplica a seleção persistida (ou primeira opção)
  applySelectedRunText(getSavedRunText() || getAllMessages()[0] || 'Estamos no ritmo! 💨');
}

function renderRunMessageOptions() {
  const container = document.getElementById('messageOptions');
  if (!container) return;
  container.innerHTML = '';

  const all = getAllMessages();
  const saved = getSavedRunText();

  // cria os pills para todas as mensagens (JSON + personalizadas)
  all.forEach((msg) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'msg-option' + (saved === msg ? ' active' : '');
    pill.textContent = msg;

    pill.addEventListener('click', () => {
      // marca visualmente
      [...container.children].forEach(c => c.classList.remove('active'));
      pill.classList.add('active');
      // salva e aplica
      saveRunText(msg);
      applySelectedRunText(msg);
    });

    container.appendChild(pill);
  });

  // ➕ pill para adicionar mensagem personalizada
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'msg-option';
  add.textContent = '➕ Personalizar';
  add.title = 'Criar sua própria mensagem';
  add.addEventListener('click', addCustomMessage);
  container.appendChild(add);

  // 🗑️ limpar personalizadas (só aparece se houver custom)
  if (getCustomMessages().length > 0) {
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'msg-option';
    clearBtn.textContent = '🗑️ Limpar personalizadas';
    clearBtn.title = 'Remover todas as mensagens personalizadas';
    clearBtn.addEventListener('click', clearCustomMessages);
    container.appendChild(clearBtn);
  }
}

function getSavedRunText() {
  try { return localStorage.getItem(CACHE_KEYS.RUN_TEXT_SELECTED) || ''; }
  catch { return ''; }
}

function saveRunText(txt) {
  try { localStorage.setItem(CACHE_KEYS.RUN_TEXT_SELECTED, txt); } catch { }
}

function applySelectedRunText(txt) {
  const el = document.querySelector('#run-fun .run-text');
  if (el && txt) el.textContent = txt;
}

// ----- mensagens personalizadas (lista) -----
function getCustomMessages() {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.RUN_TEXT_CUSTOMS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveCustomMessages(arr) {
  try { localStorage.setItem(CACHE_KEYS.RUN_TEXT_CUSTOMS, JSON.stringify(arr)); } catch { }
}
function getAllMessages() {
  // JSON + personalizadas (sem duplicar)
  const base = runMessages.slice();
  const customs = getCustomMessages();
  const set = new Set(base.concat(customs).map(s => (s || '').trim()).filter(Boolean));
  return Array.from(set);
}
function addCustomMessage() {
  const txt = (prompt('Digite sua mensagem (máx. 120 caracteres):') || '').trim();
  if (!txt) return;
  const clean = txt.slice(0, 120);

  const customs = getCustomMessages();
  // evita duplicatas (case-insensitive)
  if (!customs.find(m => m.toLowerCase() === clean.toLowerCase())) {
    customs.push(clean);
    saveCustomMessages(customs);
  }

  // seleciona imediatamente a nova mensagem
  saveRunText(clean);
  applySelectedRunText(clean);
  renderRunMessageOptions();
}
function clearCustomMessages() {
  const customs = getCustomMessages();
  if (!customs.length) return;

  const ok = confirm('Deseja apagar TODAS as mensagens personalizadas? Esta ação não pode ser desfeita.');
  if (!ok) return;

  // limpa todas as personalizadas
  saveCustomMessages([]);

  // se a selecionada era personalizada, escolher fallback
  const selected = getSavedRunText();
  const allNow = getAllMessages(); // agora só as do JSON
  if (!allNow.includes(selected)) {
    const fallback = allNow[0] || 'Estamos no ritmo! 💨';
    saveRunText(fallback);
    applySelectedRunText(fallback);
  }

  renderRunMessageOptions();
}

// Slideshow de fundo
let currentSlide = 0;
let slides = [];

async function loadBackgroundImages() {
  try {
    const response = await fetch('images.json');
    const data = await response.json();
    backgroundImages = data.backgroundImages;
    createSlideshow();
  } catch (error) {
    console.error('Erro ao carregar imagens:', error);
    backgroundImages = [
      {
        id: 1,
        url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&h=800&fit=crop&crop=center',
        alt: 'Estudantes em sala de aula',
        category: 'classroom'
      }
    ];
    createSlideshow();
  }
}

function createSlideshow() {
  const slideshowContainer = document.getElementById('backgroundSlideshow');
  if (!slideshowContainer) return;

  slideshowContainer.innerHTML = '';
  slides = [];

  backgroundImages.forEach((image, index) => {
    const slideDiv = document.createElement('div');
    slideDiv.className = 'slide';
    slideDiv.style.backgroundImage = `url('${image.url}')`;
    slideDiv.setAttribute('aria-label', image.alt);
    slideDiv.dataset.category = image.category;

    if (index === 0) slideDiv.classList.add('active');

    slideshowContainer.appendChild(slideDiv);
    slides.push(slideDiv);
  });

  if (slides.length > 1) startSlideshow();
}

function nextSlide() {
  if (slides.length === 0) return;

  slides[currentSlide].classList.remove('active');
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add('active');
}

function startSlideshow() {
  setInterval(nextSlide, 10000);
}

// -------------------- Boot --------------------
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (typeof lucide !== 'undefined') lucide.createIcons();

    initializeEventListeners();

    // restaura estado ANTES de permitir salvar
    const savedState = loadTimerState();
    if (savedState) {
      timeLeft = savedState.timeLeft;
      isRunning = savedState.isRunning;
      startTime = savedState.startTime;
      pausedTime = savedState.pausedTime;
      endTimestamp = savedState.endTimestamp || (isRunning ? Date.now() + timeLeft * 1000 : null);

      if (isRunning && timeLeft > 0) {
        countdown = setInterval(tick, 1000);
        updateButtonStates('running');
        document.body.classList.add('timer-running');
        showCacheStatus('Timer restaurado', 'success');
      } else {
        updateButtonStates('stopped');
      }
    }

    // agora permitimos persistir
    canPersist = true;
    updateDisplay(); // render com persistência habilitada

    await Promise.all([
      loadBackgroundMusic(),
      loadBackgroundImages(),
      loadRunMessages() // carrega as mensagens
    ]);

    // Inicializa detecção de música após carregar dados
    setTimeout(() => {
      detectSelectedMusic();
      updateSyncStatusDisplay();
    }, 100);

    // Inicializa YouTube API se ainda não estiver pronta
    if (typeof YT === 'undefined' || !isYouTubeAPIReady) {
      console.log('Waiting for YouTube API to load...');
      // A função onYouTubeIframeAPIReady será chamada automaticamente quando a API estiver pronta
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  } catch (error) {
    console.error('Erro na inicialização:', error);
    canPersist = true;
    updateDisplay();
  }
});

// Fallback caso DOMContentLoaded já tenha passado
if (document.readyState !== 'loading') {
  setTimeout(async () => {
    try {
      if (typeof lucide !== 'undefined') lucide.createIcons();
      initializeEventListeners();

      const savedState = loadTimerState();
      if (savedState) {
        timeLeft = savedState.timeLeft;
        isRunning = savedState.isRunning;
        startTime = savedState.startTime;
        pausedTime = savedState.pausedTime;
        endTimestamp = savedState.endTimestamp || (isRunning ? Date.now() + timeLeft * 1000 : null);

        if (isRunning && timeLeft > 0) {
          countdown = setInterval(tick, 1000);
          updateButtonStates('running');
          document.body.classList.add('timer-running');
        } else {
          updateButtonStates('stopped');
        }
      }

      canPersist = true;
      updateDisplay();

      await Promise.all([
        loadBackgroundMusic(),
        loadBackgroundImages(),
        loadRunMessages() // também no fallback
      ]);

      // Inicializa detecção de música após carregar dados (fallback)
      setTimeout(() => {
        detectSelectedMusic();
        updateSyncStatusDisplay();
      }, 100);
    } catch (error) {
      console.error('Erro na inicialização:', error);
      canPersist = true;
      updateDisplay();
    }
  }, 100);
}

window.addEventListener('beforeunload', () => {
  saveTimerState();
});

// salva periodicamente
setInterval(() => {
  if (isRunning || timeLeft > 0) saveTimerState();
}, 5000);

// render inicial (não persiste porque canPersist=false)
updateDisplay();
