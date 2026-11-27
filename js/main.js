import { loadAndValidateQuiz } from './quiz.js';
import { loadSettings, saveSettings, applyVisualPreferences } from './settings.js';
import { STATES, transitionTo } from './state.js';
import { FIXED_BOTS } from './bots.js';
import { announce } from './a11y.js';

let settings = loadSettings();
let quizData = null;

// Aplica preferências salvas ao abrir
applyVisualPreferences(settings);

// Preenche formulário com dados salvos anteriormente
const inputNickname = document.getElementById('input-nickname');
if (settings.nickname) inputNickname.value = settings.nickname;

const savedRadio = document.querySelector(`input[name="timeMode"][value="${settings.timeMode}"]`);
if (savedRadio) savedRadio.checked = true;

// Controles globais do cabeçalho
document.getElementById('btn-contrast').addEventListener('click', () => {
  settings = saveSettings({ highContrast: !settings.highContrast });
  applyVisualPreferences(settings);
});

document.getElementById('btn-motion').addEventListener('click', () => {
  settings = saveSettings({ reducedMotion: !settings.reducedMotion });
  applyVisualPreferences(settings);
});

document.getElementById('btn-shortcuts').addEventListener('click', () => {
  settings = saveSettings({ shortcutsEnabled: !settings.shortcutsEnabled });
  applyVisualPreferences(settings);
});

// Tela 1 (CONFIG) -> Tela 2 (LOBBY)
document.getElementById('form-config').addEventListener('submit', (e) => {
  e.preventDefault();
  const nickname = inputNickname.value.trim() || 'Jogador';
  const timeMode = document.querySelector('input[name="timeMode"]:checked')?.value || 'standard';

  settings = saveSettings({ nickname, timeMode });
  renderLobby(nickname);
  transitionTo(STATES.LOBBY);
});

function renderLobby(nickname) {
  const list = document.getElementById('lobby-players');
  list.innerHTML = '';

  const playerLi = document.createElement('li');
  playerLi.innerHTML = `<strong>${nickname} (Você)</strong>`;
  list.appendChild(playerLi);

  // Simula entrada gradual dos bots com anúncio polite (RF02)
  FIXED_BOTS.forEach((bot, idx) => {
    setTimeout(() => {
      const li = document.createElement('li');
      li.textContent = bot.name;
      list.appendChild(li);
      announce(`${bot.name} entrou na sala.`, 'polite');
    }, (idx + 1) * 600);
  });
}

// Tela 2 (LOBBY) -> Tela 3 (QUESTÃO) - Navegação provisória para validar Etapa E3
document.getElementById('btn-start-quiz').addEventListener('click', () => {
  transitionTo(STATES.QUESTION);
});

// Navegação provisória de teste entre QUESTÃO -> FEEDBACK -> PÓDIO -> CONFIG
document.querySelectorAll('.option-btn').forEach((btn) => {
  btn.addEventListener('click', () => transitionTo(STATES.FEEDBACK));
});

document.getElementById('btn-next-question').addEventListener('click', () => {
  transitionTo(STATES.PODIUM);
});

document.getElementById('btn-restart').addEventListener('click', () => {
  transitionTo(STATES.CONFIG);
});

// Carrega o quiz.json
loadAndValidateQuiz()
  .then((data) => {
    quizData = data;
  })
  .catch((err) => {
    console.error('❌ Erro ao carregar quiz:', err.message);
  });