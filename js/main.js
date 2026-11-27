import { loadAndValidateQuiz, QuizEngine } from './quiz.js';
import { loadSettings, saveSettings, applyVisualPreferences } from './settings.js';
import { STATES, transitionTo } from './state.js';
import { FIXED_BOTS } from './bots.js';
import { announce } from './a11y.js';
import {
  initAudio,
  playFeedbackSound,
  triggerVibration,
  setupTTS,
  speakQuestion,
  cancelSpeech
} from './feedback.js';

const SHAPES = {
  triangle: '▲',
  diamond: '◆',
  circle: '●',
  square: '■'
};

let settings = loadSettings();
let engine = null;

// 1. Aplica preferências visuais e preenche formulário
applyVisualPreferences(settings);

const inputNickname = document.getElementById('input-nickname');
if (settings.nickname) inputNickname.value = settings.nickname;

const savedRadio = document.querySelector(`input[name="timeMode"][value="${settings.timeMode}"]`);
if (savedRadio) savedRadio.checked = true;

// 2. Configura botão de leitura em voz alta (TTS)
const ttsBar = document.querySelector('.tts-bar');
setupTTS((hasPtBrVoice) => {
  if (ttsBar) {
    ttsBar.hidden = !hasPtBrVoice;
  }
});

document.getElementById('btn-tts').addEventListener('click', () => {
  if (!engine) return;
  const rate = document.getElementById('select-tts-rate').value;
  speakQuestion(engine.getCurrentQuestion(), rate);
});

// 3. Controles globais do cabeçalho
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

// 4. Tela 1 (CONFIG) -> Tela 2 (LOBBY)
document.getElementById('form-config').addEventListener('submit', (e) => {
  e.preventDefault();
  initAudio(); // Gesto do usuário libera Web Audio API

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

  FIXED_BOTS.forEach((bot, idx) => {
    setTimeout(() => {
      const li = document.createElement('li');
      li.textContent = bot.name;
      list.appendChild(li);
      announce(`${bot.name} entrou na sala.`, 'polite');
    }, (idx + 1) * 500);
  });
}

// 5. Tela 2 (LOBBY) -> Tela 3 (QUESTÃO)
document.getElementById('btn-start-quiz').addEventListener('click', () => {
  if (!engine) return;
  initAudio();
  engine.startNewMatch(settings.timeMode);
  renderCurrentQuestion();
  transitionTo(STATES.QUESTION);
});

function renderCurrentQuestion() {
  const q = engine.getCurrentQuestion();
  const total = engine.questions.length;

  document.getElementById('question-progress').textContent = `Questão ${engine.currentIndex + 1} de ${total}`;
  document.getElementById('question-prompt').textContent = q.prompt;

  const optionButtons = document.querySelectorAll('#options-group .option-btn');
  q.options.forEach((opt, idx) => {
    const btn = optionButtons[idx];
    btn.disabled = false;
    btn.dataset.index = String(idx);
    btn.querySelector('.option-badge').textContent = `${SHAPES[opt.shape]} ${opt.key}`;
    btn.querySelector('.option-text').textContent = opt.text;
  });

  const timerEl = document.getElementById('question-timer');
  engine.startTimer({
    onTick: (seconds) => {
      timerEl.textContent = seconds === null ? 'Sem limite' : `${seconds}s`;
    },
    onTimeout: () => {
      cancelSpeech();
      const result = engine.handleTimeout();
      showFeedback(result);
    }
  });
}

// 6. Resposta por clique/toque ou atalhos de teclado (1-4 / A-D)
const optionsGroup = document.getElementById('options-group');

optionsGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.option-btn');
  if (!btn || !engine) return;
  handleUserChoice(Number(btn.dataset.index));
});

// Atalhos ativos SOMENTE quando o foco está dentro de #options-group (WCAG 2.1.4)
optionsGroup.addEventListener('keydown', (e) => {
  if (!settings.shortcutsEnabled || !engine) return;

  const keyMap = {
    '1': 0, 'a': 0, 'A': 0,
    '2': 1, 'b': 1, 'B': 1,
    '3': 2, 'c': 2, 'C': 2,
    '4': 3, 'd': 3, 'D': 3
  };

  if (Object.prototype.hasOwnProperty.call(keyMap, e.key)) {
    e.preventDefault();
    handleUserChoice(keyMap[e.key]);
  }
});

function handleUserChoice(optionIndex) {
  cancelSpeech();
  const result = engine.submitAnswer(optionIndex);
  if (!result) return;
  showFeedback(result);
}

// 7. Tela 4 (FEEDBACK)
function showFeedback(result) {
  playFeedbackSound(result.isCorrect);
  triggerVibration(result.isCorrect);

  const box = document.getElementById('feedback-box');
  const icon = document.getElementById('feedback-icon');
  const label = document.getElementById('feedback-label');
  const detail = document.getElementById('feedback-detail');
  const correctNote = document.getElementById('feedback-correct-answer');
  const nextBtn = document.getElementById('btn-next-question');

  box.classList.remove('is-correct', 'is-wrong');

  let announcementText = '';

  if (result.isCorrect) {
    box.classList.add('is-correct');
    icon.textContent = '✔';
    label.textContent = 'Resposta Correta!';
    detail.textContent = `Você ganhou +${result.pointsEarned} pontos. Total: ${result.totalScore} pontos.`;
    correctNote.textContent = '';
    announcementText = `Resposta correta! Você ganhou ${result.pointsEarned} pontos.`;
  } else if (result.timedOut) {
    box.classList.add('is-wrong');
    icon.textContent = '⏱';
    label.textContent = 'Tempo Esgotado!';
    detail.textContent = `0 pontos nesta rodada. Total: ${result.totalScore} pontos.`;
    correctNote.textContent = `A resposta correta era: ${result.correctOption.key} — ${result.correctOption.text}`;
    announcementText = `Tempo esgotado! A resposta correta era ${result.correctOption.key}: ${result.correctOption.text}.`;
  } else {
    box.classList.add('is-wrong');
    icon.textContent = '✖';
    label.textContent = 'Resposta Incorreta.';
    detail.textContent = `0 pontos nesta rodada. Total: ${result.totalScore} pontos.`;
    correctNote.textContent = `A resposta correta era: ${result.correctOption.key} — ${result.correctOption.text}`;
    announcementText = `Resposta incorreta. A resposta correta era ${result.correctOption.key}: ${result.correctOption.text}.`;
  }

  nextBtn.textContent = engine.hasNextQuestion() ? 'Próxima' : 'Ver Pódio';

  transitionTo(STATES.FEEDBACK);
  announce(announcementText, 'assertive');

  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.removeAttribute('tabindex');
    nextBtn.textContent = engine.hasNextQuestion() ? 'Próxima' : 'Ver Pódio';
  }

  transitionTo(STATES.FEEDBACK);
  announce(announcementText, 'assertive');

  // Garante que o foco do teclado vá direto para o botão "Próxima"
  if (nextBtn) {
    requestAnimationFrame(() => {
      nextBtn.focus();
    });
  }
}

// 8. Botão Próxima -> Próxima questão ou PÓDIO
document.getElementById('btn-next-question').addEventListener('click', () => {
  if (!engine) return;

  if (engine.hasNextQuestion()) {
    engine.advanceQuestion();
    renderCurrentQuestion();
    transitionTo(STATES.QUESTION);
  } else {
    renderPodium();
    transitionTo(STATES.PODIUM);
  }
});

// 9. Tela 5 (PÓDIO) e Reiniciar
function renderPodium() {
  const playerEntry = {
    id: 'player',
    name: `${settings.nickname} (Você)`,
    score: engine.score,
    isBot: false
  };

  const ranking = [playerEntry, ...FIXED_BOTS].sort((a, b) => b.score - a.score);
  const playerRank = ranking.findIndex((p) => p.id === 'player') + 1;

  const summary = document.getElementById('podium-summary');
  summary.textContent = `Fim de Jogo! Você ficou em ${playerRank}º lugar com ${engine.score} pontos (${engine.correctCount} de ${engine.questions.length} acertos).`;

  const list = document.getElementById('podium-list');
  list.innerHTML = '';

  ranking.forEach((participant) => {
    const li = document.createElement('li');
    if (participant.id === 'player') {
      li.innerHTML = `<strong>${participant.name} — ${participant.score} pontos</strong>`;
    } else {
      li.textContent = `${participant.name} — ${participant.score} pontos`;
    }
    list.appendChild(li);
  });
}

document.getElementById('btn-restart').addEventListener('click', () => {
  transitionTo(STATES.CONFIG);
});

// Inicialização: carrega e valida quiz.json
loadAndValidateQuiz()
  .then((data) => {
    engine = new QuizEngine(data.questions);
  })
  .catch((err) => {
    console.error('❌ Falha ao iniciar QuizAccess:', err.message);
    announce('Erro ao carregar as perguntas do quiz.', 'assertive');
  });