import { moveFocusTo } from './a11y.js';

export const STATES = {
  CONFIG: 'screen-config',
  LOBBY: 'screen-lobby',
  QUESTION: 'screen-question',
  FEEDBACK: 'screen-feedback',
  PODIUM: 'screen-podium'
};

export function transitionTo(targetScreenId) {
  Object.values(STATES).forEach((screenId) => {
    const el = document.getElementById(screenId);
    if (!el) return;
    const isTarget = screenId === targetScreenId;
    el.hidden = !isTarget;
  });
}

let currentState = STATES.CONFIG;
const listeners = [];

export function getState() {
  return currentState;
}

export function onStateChange(callback) {
  listeners.push(callback);
}

export function transitionTo(nextState) {
  currentState = nextState;

  const sections = document.querySelectorAll('main > section[data-screen]');
  sections.forEach((sec) => {
    const isTarget = sec.dataset.screen === nextState;
    sec.hidden = !isTarget;
  });

  // Regra de foco por estado (Seção 6 da documentação)
  if (nextState === STATES.CONFIG) {
    moveFocusTo(document.querySelector('#screen-config h1'));
  } else if (nextState === STATES.LOBBY) {
    moveFocusTo(document.querySelector('#screen-lobby h1'));
  } else if (nextState === STATES.QUESTION) {
    moveFocusTo(document.getElementById('question-prompt'));
  } else if (nextState === STATES.FEEDBACK) {
    moveFocusTo(document.getElementById('btn-next-question'));
  } else if (nextState === STATES.PODIUM) {
    moveFocusTo(document.getElementById('podium-summary'));
  }

  listeners.forEach((fn) => fn(nextState));
}