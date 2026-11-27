import { moveFocusTo } from './a11y.js';

export const STATES = {
  CONFIG: 'CONFIG',
  LOBBY: 'LOBBY',
  QUESTION: 'QUESTÃO',
  FEEDBACK: 'FEEDBACK',
  PODIUM: 'PÓDIO'
};

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