let countdown = null;
let timeLeft = 0; // segundos
const timerEl = document.getElementById('timer');
const controls = document.querySelector('.timer-controls');
const presetMusic = document.getElementById('presetMusic');
const youtubeLink = document.getElementById('youtubeLink');
const playCustom = document.getElementById('playCustom');
const musicPlayer = document.getElementById('musicPlayer');

// Variáveis para dados JSON
let backgroundMusic = [];
let backgroundImages = [];

function updateDisplay() {
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function tick() {
  timeLeft = Math.max(0, timeLeft - 1);
  updateDisplay();
  if (timeLeft <= 0) {
    clearInterval(countdown);
    alert('Tempo esgotado!');
  }
}

function startTimer(min) {
  clearInterval(countdown);
  timeLeft = Math.max(0, Math.round(min * 60));
  updateDisplay();
  countdown = setInterval(tick, 1000);
}

function adjustTimer(delta) {
  timeLeft = Math.max(0, timeLeft + Math.round(delta * 60));
  updateDisplay();
}

function pauseTimer() {
  clearInterval(countdown);
}

function resetTimer() {
  clearInterval(countdown);
  timeLeft = 0;
  updateDisplay();
}

// Event listeners para controles do timer
controls.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'quick') return startTimer(Number(btn.dataset.min));
  if (action === 'adjust') return adjustTimer(Number(btn.dataset.min));
  if (action === 'pause') return pauseTimer();
  if (action === 'reset') return resetTimer();
});

// Event listeners para música
presetMusic.addEventListener('change', () => {
  const url = presetMusic.value;
  if (url) playYouTube(url);
});

playCustom.addEventListener('click', () => {
  const url = youtubeLink.value.trim();
  if (url) playYouTube(url);
});

// Função principal para reproduzir música
function playYouTube(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    alert('Link do YouTube inválido. Verifique o URL.');
    return;
  }

  // Usar apenas o player do YouTube
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=1&modestbranding=1&rel=0`;

  musicPlayer.style.width = '100%';
  musicPlayer.style.height = '80px';
  musicPlayer.style.maxWidth = '400px';
  musicPlayer.src = embedUrl;

  // Encontrar o título da música se for uma das predefinidas
  const musicTitle = findMusicTitle(url);
  showMusicStatus(`🎵 Reproduzindo: ${musicTitle}`);

  console.log('Reproduzindo:', musicTitle, videoId);
}

// Função para encontrar o título da música baseado na URL
function findMusicTitle(url) {
  const music = backgroundMusic.find(m => m.youtubeUrl === url);
  return music ? music.title : 'Música personalizada';
}

// Função para parar música
function stopMusic() {
  musicPlayer.src = '';
  musicPlayer.style.width = '0';
  musicPlayer.style.height = '0';
  showMusicStatus('🔇 Música parada');
}

// Event listener para botão de parar
const stopMusicBtn = document.getElementById('stopMusic');
if (stopMusicBtn) {
  stopMusicBtn.addEventListener('click', stopMusic);
}

// Função para mostrar status da música
function showMusicStatus(message) {
  let statusEl = document.getElementById('musicStatus');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'musicStatus';
    statusEl.style.cssText = 'margin-top: 8px; font-size: 0.9rem; opacity: 0.8;';
    document.querySelector('.music-player-container').appendChild(statusEl);
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

// Carregar músicas do JSON
async function loadBackgroundMusic() {
  console.log('Iniciando carregamento das músicas...');
  try {
    const response = await fetch('music.json');
    console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Dados carregados:', data);

    backgroundMusic = data.backgroundMusic;
    console.log('Músicas carregadas:', backgroundMusic.length);

    populateMusicSelect();
  } catch (error) {
    console.error('Erro ao carregar músicas:', error);
    console.log('Usando fallback...');

    // Fallback para músicas padrão
    backgroundMusic = [
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
      }
    ];
    populateMusicSelect();
  }
}

// Preencher o select com as músicas do JSON
function populateMusicSelect() {
  console.log('Populando select de músicas...');

  const select = document.getElementById('presetMusic');
  if (!select) {
    console.error('Elemento select não encontrado!');
    return;
  }

  console.log('Select encontrado, músicas disponíveis:', backgroundMusic.length);

  // Limpar opções existentes (exceto a primeira)
  while (select.children.length > 1) {
    select.removeChild(select.lastChild);
  }

  // Adicionar músicas do JSON
  backgroundMusic.forEach((music, index) => {
    console.log(`Adicionando música ${index + 1}:`, music.title);

    const option = document.createElement('option');
    option.value = music.youtubeUrl;
    option.textContent = `${music.title}${music.duration ? ` (${music.duration})` : ''}`;
    option.dataset.category = music.category;
    select.appendChild(option);
  });

  console.log(`✅ ${backgroundMusic.length} músicas adicionadas ao select`);
  console.log('Total de opções no select:', select.children.length);
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

  console.log(`Carregadas ${backgroundImages.length} imagens de fundo`);
}

// Função para avançar slide
function nextSlide() {
  if (slides.length === 0) return;

  slides[currentSlide].classList.remove('active');
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add('active');

  console.log(`Slide ${currentSlide + 1}/${slides.length}: ${backgroundImages[currentSlide]?.alt}`);
}

// Iniciar slideshow automático
function startSlideshow() {
  // Trocar imagem a cada 10 segundos
  setInterval(nextSlide, 10000);
}

// Inicialização quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DOM carregado, iniciando aplicação...');

  try {
    // Carregar dados dos JSONs
    console.log('Carregando dados...');
    await Promise.all([
      loadBackgroundMusic(),
      loadBackgroundImages()
    ]);

    console.log('✅ Aplicação inicializada com sucesso!');
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
  }
});

// Fallback caso DOMContentLoaded já tenha passado
if (document.readyState === 'loading') {
  console.log('DOM ainda carregando...');
} else {
  console.log('DOM já carregado, executando inicialização...');
  setTimeout(async () => {
    await Promise.all([
      loadBackgroundMusic(),
      loadBackgroundImages()
    ]);
  }, 100);
}

// Função de teste para verificar se o JSON está acessível
async function testJsonAccess() {
  try {
    console.log('🧪 Testando acesso ao music.json...');
    const response = await fetch('music.json');
    console.log('Status da resposta:', response.status, response.statusText);

    if (response.ok) {
      const text = await response.text();
      console.log('Conteúdo do JSON (primeiros 200 chars):', text.substring(0, 200));

      try {
        const data = JSON.parse(text);
        console.log('JSON válido! Músicas encontradas:', data.backgroundMusic?.length || 0);
      } catch (parseError) {
        console.error('Erro ao fazer parse do JSON:', parseError);
      }
    } else {
      console.error('Erro HTTP:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Erro ao acessar music.json:', error);
  }
}

// Executar teste imediatamente
testJsonAccess();

// Inicializar display do timer
updateDisplay();