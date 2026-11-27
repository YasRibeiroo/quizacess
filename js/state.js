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
    el.hidden = screenId !== targetScreenId;
  });

  const targetEl = document.getElementById(targetScreenId);
  if (targetEl) {
    const heading = targetEl.querySelector('h1, h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }
}