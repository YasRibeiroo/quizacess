const btnContrast = document.getElementById('btn-contrast');

btnContrast.addEventListener('click', () => {
  const isHighContrast = document.documentElement.getAttribute('data-theme') === 'high-contrast';
  if (isHighContrast) {
    document.documentElement.removeAttribute('data-theme');
    btnContrast.setAttribute('aria-pressed', 'false');
  } else {
    document.documentElement.setAttribute('data-theme', 'high-contrast');
    btnContrast.setAttribute('aria-pressed', 'true');
  }
});