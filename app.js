// app.js (corrigido: não limpa storage no refresh + gate de persistência + endTimestamp + music.json)
let countdown = null;
let timeLeft = 0; // segundos
let isRunning = false;
let startTime = null;
let pausedTime = 0;
let endTimestamp = null; // alvo absoluto (ms desde epoch)

// NOVO: só começamos a salvar no localStorage após a restauração inicial
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

// Sistema de Cache
const CACHE_KEYS = {
  TIMER_STATE: 'cronometro_timer_state',
  TIMER_CONFIG: 'cronometro_timer_config',
  MUSIC_STATE: 'cronometro_music_state'
};

// -------------------- Cache do Timer --------------------
function saveTimerState() {
  // IMPORTANTE: não limpe o cache aqui quando estiver zerado; apenas não salve.
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
    if (isRunning) statusEl.textContent = 'Timer em execução...';
    else if (timeLeft > 0) statusEl.textContent = 'Timer pausado';
    else statusEl.textContent = 'Defina um tempo para começar';
  }

  // Só persiste quando permitido
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
    clearTimerCache();      // aqui sim limpamos explicitamente
    endTimestamp = null;

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
  clearTimerCache();       // limpar só aqui (e quando terminar)
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
        if (permission === 'granted') new Notification(title, { body: message });
      });
    }
  }
  alert(`${title}\n${message}`);
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
      if (url) playYouTube(url);
    });
  }

  if (playCustom) {
    playCustom.addEventListener('click', () => {
      const url = document.getElementById('youtubeLink').value.trim();
      if (url) playYouTube(url);
    });
  }

  if (stopMusicBtn) {
    stopMusicBtn.addEventListener('click', stopMusic);
  }
}

function playYouTube(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    alert('Link do YouTube inválido. Verifique o URL.');
    return;
  }
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=1&modestbranding=1&rel=0`;

  if (musicPlayer) {
    musicPlayer.style.width = '100%';
    musicPlayer.style.height = '200px';
    musicPlayer.style.maxWidth = '400px';
    musicPlayer.src = embedUrl;
  }

  const musicTitle = findMusicTitle(url);
  showMusicStatus(`🎵 Reproduzindo: ${musicTitle}`);
}

function findMusicTitle(url) {
  const music = backgroundMusic.find(m => m.youtubeUrl === url);
  return music ? music.title : 'Música personalizada';
}

function stopMusic() {
  if (musicPlayer) {
    musicPlayer.src = '';
    musicPlayer.style.width = '0';
    musicPlayer.style.height = '0';
  }
  showMusicStatus('🔇 Música parada');
}

function showMusicStatus(message) {
  let statusEl = document.getElementById('musicStatus');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'musicStatus';
    statusEl.style.cssText = 'margin-top: 8px; font-size: 0.9rem; opacity: 0.8;';
    const container = document.querySelector('.music-player-container');
    if (container) container.appendChild(statusEl);
  }
  statusEl.textContent = message;
  setTimeout(() => {
    if (statusEl.textContent === message) statusEl.textContent = '';
  }, 3000);
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

// Slideshow (como antes)
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
    updateDisplay(); // faz um render já com persistência habilitada

    await Promise.all([loadBackgroundMusic(), loadBackgroundImages()]);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  } catch (error) {
    console.error('Erro na inicialização:', error);
    // mesmo em erro, habilite persistência para não travar salvamentos daqui pra frente
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

      await Promise.all([loadBackgroundMusic(), loadBackgroundImages()]);
    } catch (error) {
      console.error('Erro na inicialização:', error);
      canPersist = true;
      updateDisplay();
    }
  }, 100);
}

window.addEventListener('beforeunload', () => {
  // agora não limpa o storage por engano
  saveTimerState();
});

setInterval(() => {
  if (isRunning || timeLeft > 0) saveTimerState();
}, 5000);

// Render inicial (não irá salvar pois canPersist=false)
updateDisplay();
