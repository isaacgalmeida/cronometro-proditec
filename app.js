// app.js (versão corrigida)
let countdown = null;
let timeLeft = 0; // segundos
let isRunning = false;
let startTime = null;
let pausedTime = 0;
// NOVO: timestamp absoluto de término (em ms desde epoch)
let endTimestamp = null;

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

// Funções de Cache
function saveTimerState() {
  // Só salvar se houver tempo definido
  if ((timeLeft <= 0 && !isRunning) || (!endTimestamp && !isRunning)) {
    clearTimerCache();
    return;
  }

  const state = {
    timeLeft,
    isRunning,
    startTime,
    pausedTime,
    // SALVA o alvo absoluto (crucial para restaurar corretamente)
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

    // Verificar se o estado é válido
    if (!state.timestamp || typeof state.timeLeft !== 'number') {
      clearTimerCache();
      return null;
    }

    // Preferimos restaurar com base no endTimestamp (se existir)
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
        // recalcula startTime aproximado
        startTime: now - (state.timeLeft - computed) * 1000,
        pausedTime: 0
      };
    }

    // Fallback antigo (se não houver endTimestamp salvo)
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
        // cria um endTimestamp a partir do momento de carga
        endTimestamp: now + newTimeLeft * 1000
      };
    }

    // Se estava pausado ou parado
    // garante consistência do endTimestamp
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

// Dados das músicas (fallback integrado)
const defaultMusic = [
  {
    id: 1,
    title: '🎹 Piano Relaxante',
    description: 'Música suave de piano para concentração',
    youtubeUrl: 'https://www.youtube.com/watch?v=2OEL4P1Rz04',
    category: 'piano',
    duration: '1 hora'
  },
  {
    id: 2,
    title: '🌊 Música Ambiente',
    description: 'Sons ambientes relaxantes',
    youtubeUrl: 'https://www.youtube.com/watch?v=lFcSrYw-ARY',
    category: 'ambient',
    duration: '2 horas'
  },
  {
    id: 3,
    title: '🌿 Som da Natureza',
    description: 'Sons naturais para relaxamento',
    youtubeUrl: 'https://www.youtube.com/watch?v=1ZYbU82GVz4',
    category: 'nature',
    duration: '3 horas'
  },
  {
    id: 4,
    title: '🎵 Música Clássica',
    description: 'Peças clássicas suaves',
    youtubeUrl: 'https://www.youtube.com/watch?v=jgpJVI3tDbY',
    category: 'classical',
    duration: '1.5 horas'
  },
  {
    id: 5,
    title: '🌙 Música para Meditação',
    description: 'Sons meditativos e tranquilos',
    youtubeUrl: 'https://www.youtube.com/watch?v=M0r2cStOikw',
    category: 'meditation',
    duration: '2 horas'
  },
  {
    id: 6,
    title: '☕ Café Jazz',
    description: 'Jazz suave para ambiente de trabalho',
    youtubeUrl: 'https://www.youtube.com/watch?v=Dx5qFachd3A',
    category: 'jazz',
    duration: '1 hora'
  },
  {
    id: 7,
    title: '🌧️ Chuva Relaxante',
    description: 'Som de chuva para concentração',
    youtubeUrl: 'https://www.youtube.com/watch?v=mPZkdNFkNps',
    category: 'rain',
    duration: '8 horas'
  },
  {
    id: 8,
    title: '🎼 Lo-Fi Study',
    description: 'Música lo-fi para estudos',
    youtubeUrl: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    category: 'lofi',
    duration: '1 hora'
  }
];

function updateDisplay() {
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  // Atualizar status
  const statusEl = document.getElementById('timer-status');
  if (statusEl) {
    if (isRunning) {
      statusEl.textContent = 'Timer em execução...';
    } else if (timeLeft > 0) {
      statusEl.textContent = 'Timer pausado';
    } else {
      statusEl.textContent = 'Defina um tempo para começar';
    }
  }

  // Salvar estado
  saveTimerState();
}

// NOVO: sempre calcula com base no alvo
function recomputeTimeLeftFromEnd() {
  if (endTimestamp && isRunning) {
    const now = Date.now();
    timeLeft = Math.max(0, Math.round((endTimestamp - now) / 1000));
  }
}

function tick() {
  // usa o endTimestamp para maior precisão/robustez
  recomputeTimeLeftFromEnd();
  updateDisplay();

  if (timeLeft <= 0) {
    clearInterval(countdown);
    isRunning = false;
    updateButtonStates('stopped');
    clearTimerCache();
    endTimestamp = null;

    // Notificação moderna
    showNotification('⏰ Tempo esgotado!', 'O timer chegou ao fim.');
  }
}

function startTimer(min) {
  clearInterval(countdown);
  timeLeft = Math.max(0, Math.round(min * 60));
  isRunning = true;
  startTime = Date.now();
  pausedTime = 0;
  // define o alvo absoluto
  endTimestamp = startTime + timeLeft * 1000;

  updateDisplay();
  countdown = setInterval(tick, 1000);
  updateButtonStates('running');

  document.body.classList.add('timer-running');
}

function adjustTimer(delta) {
  // delta em minutos
  const deltaSecs = Math.round(delta * 60);

  if (isRunning) {
    // se estiver rodando, mova o alvo
    if (!endTimestamp) endTimestamp = Date.now() + timeLeft * 1000;
    endTimestamp = Math.max(Date.now(), endTimestamp + deltaSecs * 1000);
    recomputeTimeLeftFromEnd();
  } else {
    // se estiver parado/pausado, só ajusta o timeLeft
    timeLeft = Math.max(0, timeLeft + deltaSecs);
  }

  updateDisplay();
}

function startCurrentTimer() {
  if (timeLeft > 0) {
    clearInterval(countdown);
    isRunning = true;
    startTime = Date.now() - pausedTime;
    // ao retomar, constrói um novo alvo a partir do restante
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
  console.log('Pausando timer...');
  clearInterval(countdown);
  // antes de pausar, garante que timeLeft reflete o alvo atual
  recomputeTimeLeftFromEnd();

  isRunning = false;
  if (startTime) {
    pausedTime = Date.now() - startTime;
  }

  updateButtonStates('paused');
  document.body.classList.remove('timer-running');
  updateDisplay();
}

function resetTimer() {
  console.log('Resetando timer...');
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
}

// Função para atualizar o estado visual dos botões
function updateButtonStates(state) {
  const startBtn = document.querySelector('[data-action="start"]');
  const pauseBtn = document.querySelector('[data-action="pause"]');

  console.log('Atualizando botões para estado:', state);

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

// Função para mostrar notificações modernas
function showNotification(title, message) {
  // Verificar se o navegador suporta notificações
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

  // Fallback para alert
  alert(`${title}\n${message}`);
}

// Função para inicializar event listeners
function initializeEventListeners() {
  // Event listeners para controles do timer
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

  // Event listeners para botões de ação individuais
  const startBtn = document.querySelector('[data-action="start"]');
  const pauseBtn = document.querySelector('[data-action="pause"]');
  const resetBtn = document.querySelector('[data-action="reset"]');

  if (startBtn) {
    startBtn.addEventListener('click', startCurrentTimer);
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', pauseTimer);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', resetTimer);
  }

  // Event listeners para música
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

// Função principal para reproduzir música
function playYouTube(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    alert('Link do YouTube inválido. Verifique o URL.');
    return;
  }

  // Usar apenas o player do YouTube
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=1&modestbranding=1&rel=0`;

  if (musicPlayer) {
    musicPlayer.style.width = '100%';
    musicPlayer.style.height = '80px';
    musicPlayer.style.maxWidth = '400px';
    musicPlayer.src = embedUrl;
  }

  // Encontrar o título da música se for uma das predefinidas
  const musicTitle = findMusicTitle(url);
  showMusicStatus(`🎵 Reproduzindo: ${musicTitle}`);
}

// Função para encontrar o título da música baseado na URL
function findMusicTitle(url) {
  const music = backgroundMusic.find(m => m.youtubeUrl === url);
  return music ? music.title : 'Música personalizada';
}

// Função para parar música
function stopMusic() {
  if (musicPlayer) {
    musicPlayer.src = '';
    musicPlayer.style.width = '0';
    musicPlayer.style.height = '0';
  }
  showMusicStatus('🔇 Música parada');
}

// Função para mostrar status da música
function showMusicStatus(message) {
  let statusEl = document.getElementById('musicStatus');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'musicStatus';
    statusEl.style.cssText = 'margin-top: 8px; font-size: 0.9rem; opacity: 0.8;';
    const container = document.querySelector('.music-player-container');
    if (container) {
      container.appendChild(statusEl);
    }
  }
  statusEl.textContent = message;

  // Remover mensagem após 3 segundos
  setTimeout(() => {
    if (statusEl.textContent === message) {
      statusEl.textContent = '';
    }
  }, 3000);
}

// Função para extrair video ID do YouTube
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /[?&]v=([^&\n?#]+)/ // Para URLs com parâmetros extras como list=
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1].split('&')[0].split('#')[0];
    }
  }
  return '';
}

// Carregar músicas do JSON (com fallback integrado)
async function loadBackgroundMusic() {
  try {
    const response = await fetch('music.json');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    backgroundMusic = data.backgroundMusic;

  } catch (error) {
    console.error('Erro ao carregar music.json:', error.message);
    // Usar músicas padrão integradas
    backgroundMusic = defaultMusic;
  }

  // Sempre popular o select no final
  populateMusicSelect();
}

// Preencher o select com as músicas do JSON
function populateMusicSelect() {
  const select = document.getElementById('presetMusic');
  if (!select) {
    console.error('Elemento select não encontrado!');
    return;
  }

  // Limpar opções existentes (exceto a primeira)
  while (select.children.length > 1) {
    select.removeChild(select.lastChild);
  }

  // Adicionar músicas do JSON
  backgroundMusic.forEach((music) => {
    const option = document.createElement('option');
    option.value = music.youtubeUrl;
    option.textContent = `${music.title}${music.duration ? ` (${music.duration})` : ''}`;
    option.dataset.category = music.category;
    select.appendChild(option);
  });
}

// Sistema de slideshow baseado em JSON
let currentSlide = 0;
let slides = [];

// Carregar imagens do JSON
async function loadBackgroundImages() {
  try {
    const response = await fetch('images.json');
    const data = await response.json();
    backgroundImages = data.backgroundImages;
    createSlideshow();
  } catch (error) {
    console.error('Erro ao carregar imagens:', error);
    // Fallback para imagens padrão
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

// Criar elementos do slideshow dinamicamente
function createSlideshow() {
  const slideshowContainer = document.getElementById('backgroundSlideshow');
  if (!slideshowContainer) return;

  // Limpar slides existentes
  slideshowContainer.innerHTML = '';
  slides = [];

  // Criar slides baseados no JSON
  backgroundImages.forEach((image, index) => {
    const slideDiv = document.createElement('div');
    slideDiv.className = 'slide';
    slideDiv.style.backgroundImage = `url('${image.url}')`;
    slideDiv.setAttribute('aria-label', image.alt);
    slideDiv.dataset.category = image.category;

    if (index === 0) {
      slideDiv.classList.add('active');
    }

    slideshowContainer.appendChild(slideDiv);
    slides.push(slideDiv);
  });

  // Iniciar slideshow se houver imagens
  if (slides.length > 1) {
    startSlideshow();
  }
}

// Função para avançar slide
function nextSlide() {
  if (slides.length === 0) return;

  slides[currentSlide].classList.remove('active');
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add('active');
}

// Iniciar slideshow automático
function startSlideshow() {
  // Trocar imagem a cada 10 segundos
  setInterval(nextSlide, 10000);
}

// Inicialização quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Inicializar ícones do Lucide
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Inicializar event listeners
    initializeEventListeners();

    // Carregar estado do timer do cache
    const savedState = loadTimerState();
    if (savedState) {
      timeLeft = savedState.timeLeft;
      isRunning = savedState.isRunning;
      startTime = savedState.startTime;
      pausedTime = savedState.pausedTime;
      endTimestamp = savedState.endTimestamp || (isRunning ? Date.now() + timeLeft * 1000 : null);

      updateDisplay();

      if (isRunning && timeLeft > 0) {
        countdown = setInterval(tick, 1000);
        updateButtonStates('running');
        document.body.classList.add('timer-running');
        showCacheStatus('Timer restaurado', 'success');
      } else {
        updateButtonStates('stopped');
      }
    }

    // Carregar dados dos JSONs
    await Promise.all([
      loadBackgroundMusic(),
      loadBackgroundImages()
    ]);

    // Solicitar permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

  } catch (error) {
    console.error('Erro na inicialização:', error);
  }
});

// Fallback caso DOMContentLoaded já tenha passado
if (document.readyState !== 'loading') {
  setTimeout(async () => {
    try {
      // Inicializar ícones
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }

      // Inicializar event listeners
      initializeEventListeners();

      // Carregar estado do cache
      const savedState = loadTimerState();
      if (savedState) {
        timeLeft = savedState.timeLeft;
        isRunning = savedState.isRunning;
        startTime = savedState.startTime;
        pausedTime = savedState.pausedTime;
        endTimestamp = savedState.endTimestamp || (isRunning ? Date.now() + timeLeft * 1000 : null);

        updateDisplay();

        if (isRunning && timeLeft > 0) {
          countdown = setInterval(tick, 1000);
          updateButtonStates('running');
          document.body.classList.add('timer-running');
        } else {
          updateButtonStates('stopped');
        }
      }

      await Promise.all([
        loadBackgroundMusic(),
        loadBackgroundImages()
      ]);
    } catch (error) {
      console.error('Erro na inicialização:', error);
    }
  }, 100);
}

// Salvar estado quando a página for fechada ou recarregada
window.addEventListener('beforeunload', () => {
  saveTimerState();
});

// Salvar estado periodicamente (a cada 5 segundos)
setInterval(() => {
  if (isRunning || timeLeft > 0) {
    saveTimerState();
  }
}, 5000);

// Inicializar display do timer
updateDisplay();
