document.addEventListener('DOMContentLoaded', () => {
  const botao = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.menu');

  if (!botao || !menu) return;

  const fecharMenu = () => {
    menu.classList.remove('aberto');
    botao.setAttribute('aria-expanded', 'false');
    botao.setAttribute('aria-label', 'Abrir menu');
    botao.textContent = '☰';
  };

  const abrirOuFecharMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const aberto = menu.classList.toggle('aberto');
    botao.setAttribute('aria-expanded', String(aberto));
    botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    botao.textContent = aberto ? '×' : '☰';
  };

  botao.addEventListener('click', abrirOuFecharMenu);

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', fecharMenu);
  });

  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target) && !botao.contains(event.target)) {
      fecharMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') fecharMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) fecharMenu();
  });
});
