const politeRegion = document.getElementById('live-polite');
const assertiveRegion = document.getElementById('live-assertive');

export function moveFocusTo(element) {
  if (!element) return;
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1');
  }
  requestAnimationFrame(() => {
    element.focus();
  });
}

export function announce(message, priority = 'polite') {
  const target = priority === 'assertive' ? assertiveRegion : politeRegion;
  if (!target) return;

  // Limpa antes para garantir releitura mesmo se a mensagem repetir
  target.textContent = '';
  setTimeout(() => {
    target.textContent = message;
  }, 50);
}