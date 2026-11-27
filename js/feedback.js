let audioCtx = null;

export function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function playFeedbackSound(isCorrect) {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (isCorrect) {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } else {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(174.61, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

export function triggerVibration(isCorrect) {
  if (!('vibrate' in navigator)) return;
  try {
    if (isCorrect) {
      navigator.vibrate(100);
    } else {
      navigator.vibrate([120, 80, 120]);
    }
  } catch {
    // Ignora silenciosamente caso o navegador bloqueie
  }
}

let ptBrVoice = null;

export function setupTTS(onAvailabilityChange) {
  if (!('speechSynthesis' in window)) {
    onAvailabilityChange(false);
    return;
  }

  const checkVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    ptBrVoice = voices.find((v) => v.lang.toLowerCase().includes('pt-br')) ||
                voices.find((v) => v.lang.toLowerCase().startsWith('pt'));
    onAvailabilityChange(Boolean(ptBrVoice));
  };

  checkVoices();
  window.speechSynthesis.onvoiceschanged = checkVoices;
}

export function speakQuestion(questionObj, rate = 1.0) {
  if (!('speechSynthesis' in window) || !ptBrVoice) return;

  cancelSpeech();

  const optionsSpeech = questionObj.options.map((opt) => opt.speechText).join('. ');
  const fullText = `${questionObj.speechPrompt}. ${optionsSpeech}`;

  const utterance = new SpeechSynthesisUtterance(fullText);
  utterance.voice = ptBrVoice;
  utterance.lang = 'pt-BR';
  utterance.rate = Number(rate) || 1.0;

  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}