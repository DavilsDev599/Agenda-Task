$('#filter-date').addEventListener('change', renderEvents);
$('#filter-text').addEventListener('input', renderEvents);
$('#btn-clear-filters').addEventListener('click', () => {
  $('#filter-text').value = '';
  $('#filter-date').valueAsDate = new Date();
  renderEvents();
});

$('#btn-logout').addEventListener('click', () => {
  if (confirm('Deseja sair?')) {
    localStorage.removeItem('agendaTaskUser');
    state.user = null;
    show('login');
  }
});

$('#login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = $('#login-user').value.trim();
  if (!user) return alert('Preencha o usuário.');
  state.user = user;
  localStorage.setItem('agendaTaskUser', user);
  initHome();
  show('home');
});

// ---- Inicialização (Boot) ----
(function boot() {
  setInterval(() => {
    const liveTimeNode = $('#live-time');
    if(liveTimeNode) liveTimeNode.textContent = nowClock();
  }, 1000);

  const lastUser = localStorage.getItem('agendaTaskUser');
  if (lastUser) {
    state.user = lastUser;
    initHome();
    show('home');
  } else {
    show('login');
  }
})();
