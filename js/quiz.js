import { announce } from './a11y.js';

export async function loadAndValidateQuiz(url = './data/quiz.json') {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro HTTP ao carregar quiz.json: ${response.status}`);
  }

  const data = await response.json();
  validateQuizData(data);
  return data;
}

export function validateQuizData(data) {
  if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('Validação falhou: "questions" deve ser uma lista não vazia.');
  }

  const expectedKeys = ['A', 'B', 'C', 'D'];
  const expectedShapes = ['triangle', 'diamond', 'circle', 'square'];

  data.questions.forEach((q, idx) => {
    const qNum = idx + 1;

    if (!q.prompt || !q.speechPrompt) {
      throw new Error(`Questão ${qNum}: "prompt" e "speechPrompt" são obrigatórios.`);
    }

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Questão ${qNum}: deve ter exatamente 4 alternativas.`);
    }

    const keys = q.options.map((opt) => opt.key);
    const shapes = q.options.map((opt) => opt.shape);
    const correctCount = q.options.filter((opt) => opt.isCorrect === true).length;

    if (correctCount !== 1) {
      throw new Error(`Questão ${qNum}: deve haver exatamente 1 alternativa correta (encontradas: ${correctCount}).`);
    }

    const hasAllKeys = expectedKeys.every((k) => keys.includes(k)) && new Set(keys).size === 4;
    if (!hasAllKeys) {
      throw new Error(`Questão ${qNum}: chaves devem ser A, B, C, D sem repetição.`);
    }

    const hasAllShapes = expectedShapes.every((s) => shapes.includes(s)) && new Set(shapes).size === 4;
    if (!hasAllShapes) {
      throw new Error(`Questão ${qNum}: formas devem ser distintas (triangle, diamond, circle, square).`);
    }

    q.options.forEach((opt) => {
      if (!opt.text || !opt.speechText) {
        throw new Error(`Questão ${qNum} (${opt.key}): "text" e "speechText" são obrigatórios.`);
      }
      if (opt.image && !opt.altText) {
        throw new Error(`Questão ${qNum} (${opt.key}): "altText" é obrigatório quando há imagem.`);
      }
    });
  });
}

// --- Lógica da Partida (Etapa E4) ---
export class QuizEngine {
  constructor(questions) {
    this.questions = questions;
    this.currentIndex = 0;
    this.score = 0;
    this.correctCount = 0;
    this.timeMode = 'standard';
    this.maxTime = 20;
    this.remainingTime = 20;
    this.timerId = null;
    this.answered = false;
  }

  startNewMatch(timeMode) {
    this.currentIndex = 0;
    this.score = 0;
    this.correctCount = 0;
    this.timeMode = timeMode;
    this.answered = false;
    this.stopTimer();
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex];
  }

  hasNextQuestion() {
    return this.currentIndex + 1 < this.questions.length;
  }

  advanceQuestion() {
    this.currentIndex += 1;
  }

  startTimer({ onTick, onTimeout }) {
    this.stopTimer();
    this.answered = false;

    if (this.timeMode === 'unlimited') {
      this.maxTime = null;
      this.remainingTime = null;
      onTick(null);
      return;
    }

    this.maxTime = this.timeMode === 'extended' ? 40 : 20;
    this.remainingTime = this.maxTime;
    onTick(this.remainingTime);

    this.timerId = setInterval(() => {
      this.remainingTime -= 1;
      onTick(this.remainingTime);

      // Marcos de tempo anunciados de forma polite (Seção 6)
      if (this.remainingTime === 10) {
        announce('10 segundos restantes.', 'polite');
      } else if (this.remainingTime === 5) {
        announce('5 segundos restantes.', 'polite');
      }

      if (this.remainingTime <= 0) {
        this.stopTimer();
        if (!this.answered) {
          this.answered = true;
          onTimeout();
        }
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  submitAnswer(optionIndex) {
    if (this.answered) return null;
    this.answered = true;
    this.stopTimer();

    const question = this.getCurrentQuestion();
    const chosen = question.options[optionIndex];
    const correctOption = question.options.find((o) => o.isCorrect);
    const isCorrect = Boolean(chosen && chosen.isCorrect);

    let pointsEarned = 0;
    if (isCorrect) {
      this.correctCount += 1;
      pointsEarned = 100;

      // Bônus de velocidade (até +50) somente no modo Padrão (Seção 8)
      if (this.timeMode === 'standard' && this.maxTime > 0) {
        const speedBonus = Math.round((this.remainingTime / this.maxTime) * 50);
        pointsEarned += speedBonus;
      }

      this.score += pointsEarned;
    }

    return {
      isCorrect,
      timedOut: false,
      pointsEarned,
      totalScore: this.score,
      correctOption
    };
  }

  handleTimeout() {
    const question = this.getCurrentQuestion();
    const correctOption = question.options.find((o) => o.isCorrect);

    return {
      isCorrect: false,
      timedOut: true,
      pointsEarned: 0,
      totalScore: this.score,
      correctOption
    };
  }
}