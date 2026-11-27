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

  console.info(`✅ Validação concluída com sucesso: ${data.questions.length} questões carregadas.`);
}