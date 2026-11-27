export async function loadAndValidateQuiz(url = './data/quiz.json') {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro HTTP ao carregar quiz.json: ${response.status}`);
  }

  const data = await response.json();

  if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('O arquivo quiz.json não contém uma lista válida de questões.');
  }

  data.questions.forEach((q, idx) => {
    const num = idx + 1;
    if (!q.prompt || !Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Questão ${num}: deve ter enunciado e exatamente 4 alternativas.`);
    }

    // Aceita tanto correctIndex (0..3) quanto isCorrect nas opções
    if (typeof q.correctIndex === 'number') {
      if (q.correctIndex < 0 || q.correctIndex > 3) {
        throw new Error(`Questão ${num}: correctIndex deve estar entre 0 e 3.`);
      }
      q.options.forEach((opt, optIdx) => {
        opt.isCorrect = optIdx === q.correctIndex;
      });
    } else {
      const correctCount = q.options.filter((opt) => opt.isCorrect === true).length;
      if (correctCount !== 1) {
        throw new Error(`Questão ${num}: deve haver exatamente 1 alternativa correta (encontradas: ${correctCount}).`);
      }
      q.correctIndex = q.options.findIndex((opt) => opt.isCorrect === true);
    }
  });

  return data;
}

export class QuizEngine {
  constructor(questions) {
    this.questions = questions;
    this.currentIndex = 0;
    this.score = 0;
    this.correctCount = 0;
    this.timeMode = 'standard';
    this.timeLeft = 20;
    this.timerId = null;
    this.answered = false;
  }

  startNewMatch(timeMode = 'standard') {
    this.stopTimer();
    this.currentIndex = 0;
    this.score = 0;
    this.correctCount = 0;
    this.timeMode = timeMode;
    this.answered = false;
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex];
  }

  startTimer({ onTick, onTimeout }) {
    this.stopTimer();
    this.answered = false;

    if (this.timeMode === 'unlimited') {
      this.timeLeft = null;
      onTick(null);
      return;
    }

    const initialSeconds = this.timeMode === 'extended' ? 40 : 20;
    this.timeLeft = initialSeconds;
    onTick(this.timeLeft);

    this.timerId = setInterval(() => {
      this.timeLeft -= 1;
      onTick(Math.max(0, this.timeLeft));

      if (this.timeLeft <= 0) {
        this.stopTimer();
        onTimeout();
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

    const q = this.getCurrentQuestion();
    const isCorrect = optionIndex === q.correctIndex;
    const correctOption = q.options[q.correctIndex];

    let pointsEarned = 0;
    if (isCorrect) {
      this.correctCount += 1;
      if (this.timeMode === 'unlimited') {
        pointsEarned = 100;
      } else {
        const maxTime = this.timeMode === 'extended' ? 40 : 20;
        const speedBonus = Math.round((Math.max(0, this.timeLeft) / maxTime) * 50);
        pointsEarned = 100 + speedBonus;
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
    if (this.answered) return null;
    this.answered = true;
    this.stopTimer();

    const q = this.getCurrentQuestion();
    return {
      isCorrect: false,
      timedOut: true,
      pointsEarned: 0,
      totalScore: this.score,
      correctOption: q.options[q.correctIndex]
    };
  }

  hasNextQuestion() {
    return this.currentIndex < this.questions.length - 1;
  }

  advanceQuestion() {
    if (this.hasNextQuestion()) {
      this.currentIndex += 1;
      this.answered = false;
    }
  }
}