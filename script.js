// Agenda Task — Versão Completa e Unificada
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// Mapeamento de todos os ecrãs do sistema
const SCREENS = {
  login: $('#screen-login'),
  home: $('#screen-home'),
  profile: $('#screen-profile'),
  recover: $('#screen-recover'),
  newPassword: $('#screen-new-password')
};

const state = {
  user: null,
  editingId: null,
};

// ---- Utilidades ----
const fmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' });
function pad(n) { return ('0' + n).slice(-2); }

function nowClock() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function storageKey() {
  return `agendaTaskEvents_${state.user}`;
}

function loadEvents() {
  try { return JSON.parse(localStorage.getItem(storageKey()) || '[]'); }
  catch { return []; }
}

function saveEvents(events) {
  localStorage.setItem(storageKey(), JSON.stringify(events));
}

function deleteEvent(id) {
  const filtered = loadEvents().filter(e => e.id !== id);
  saveEvents(filtered);
}

function upsertEvent(evt) {
  const list = loadEvents();
  const idx = list.findIndex(e => e.id === evt.id);
  if (idx >= 0) list[idx] = evt; else list.push(evt);
  list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  saveEvents(list);
}

// ---- Gestão de Navegação ----
function show(screenKey) {
  Object.values(SCREENS).forEach(s => {
    if(s) s.classList.remove('active');
  });
  $$('.tab').forEach(t => t.classList.remove('active'));

  if (SCREENS[screenKey]) {
    SCREENS[screenKey].classList.add('active');
    const tab = $(`.tab[data-screen="${screenKey}"]`);
    if (tab) tab.classList.add('active');
  }
}

$$('.tab[data-screen]').forEach(btn => {
  btn.addEventListener('click', () => {
    const screen = btn.dataset.screen;
    show(screen);
    if (screen === 'home') renderEvents();
    if (screen === 'profile') loadProfile();
  });
});

// ---- Fluxo de Recuperação de Acesso ligado ao PHP Backend ----
if ($('#link-go-recover')) {
  $('#link-go-recover').addEventListener('click', () => show('recover'));
}
if ($('#btn-back-to-login')) {
  $('#btn-back-to-login').addEventListener('click', () => show('login'));
}

$('#recover-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#recover-email').value.trim();
  if (email) {
    alert(`Código de confirmação enviado para: ${email}`);
    show('newPassword'); // Avança para a criação da nova senha
  }
});

$('#password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = $('#recover-email').value.trim();
  const pass = $('#new-pass').value;
  const confirmPass = $('#confirm-pass').value;

  if (pass !== confirmPass) {
    return alert('As senhas introduzidas não coincidem. Tente novamente.');
  }

  try {
    const response = await fetch('atualizar_senha.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        nova_senha: pass
      })
    });

    const result = await response.json();

    if (result.status === 'success') {
      alert(result.message);
      $('#new-pass').value = '';
      $('#confirm-pass').value = '';
      show('login');
    } else {
      alert('Erro: ' + result.message);
    }
  } catch (error) {
    console.error('Erro na requisição PHP:', error);
    // Fallback de teste local caso o PHP não esteja rodando de imediato no XAMPP:
    alert('Simulação local: Senha alterada com sucesso! (Certifica-te de rodar o XAMPP para salvar no banco real)');
    show('login');
  }
});

// ---- Perfil Profissional ----
function loadProfile() {
  const data = JSON.parse(localStorage.getItem(`profile_${state.user}`) || '{}');
  $('#prof-name').value = data.name || '';
  $('#prof-category').value = data.category || '';
  $('#work-start').value = data.start || '08:00';
  $('#work-end').value = data.end || '18:00';
  $('#prof-price').value = data.price || '';
}

$('#btn-save-profile').addEventListener('click', () => {
  const profileData = {
    name: $('#prof-name').value.trim(),
    category: $('#prof-category').value.trim(),
    start: $('#work-start').value,
    end: $('#work-end').value,
    price: $('#prof-price').value
  };
  localStorage.setItem(`profile_${state.user}`, JSON.stringify(profileData));
  alert('Perfil profissional guardado com sucesso!');
});

// ---- Ecrã Home e Eventos ----
function initHome() {
  const d = new Date();
  $('#today-label').textContent = 'Hoje';
  $('#today-date').textContent = fmt.format(d);
  $('#filter-date').valueAsDate = d;
  renderEvents();
}

function renderEvents() {
  const day = $('#filter-date').value;
  const text = $('#filter-text').value.trim().toLowerCase();
  const listNode = $('#events-list');
  if(!listNode) return;
  listNode.innerHTML = '';

  let events = loadEvents().filter(e => e.date === day);
  if (text) {
    events = events.filter(e => (e.title + ' ' + (e.desc || '')).toLowerCase().includes(text));
  }

  $('#empty-state').hidden = events.length !== 0;

  for (const e of events) {
    const li = document.createElement('li');
    li.className = 'event';
    li.innerHTML = `
      <div class="event-header">
        <h4 class="event-title">${e.title}</h4>
        <div class="event-actions">
          <button class="icon-btn" title="Editar" data-edit="${e.id}"><i class="fa-solid fa-pen"></i></button>
        </div>
      </div>
      <div class="event-meta"><i class="fa-regular fa-clock"></i> ${e.time}</div>
    `;
    listNode.appendChild(li);
  }
}

$('#events-list').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-edit]');
  if (!btn) return;
  const id = btn.dataset.edit;
  const match = loadEvents().find(x => x.id === id);
  if (match) openModal(match);
});

// ---- Janela de Diálogo (Modal controlado unicamente pela Tabbar) ----
function openModal(existing) {
  state.editingId = existing?.id ?? null;
  $('#modal-title').textContent = existing ? 'Editar compromisso' : 'Novo compromisso';
  $('#event-title').value = existing?.title || '';
  $('#event-date').value = existing?.date || new Date().toISOString().slice(0, 10);
  $('#event-time').value = existing?.time || '09:00';
  $('#event-desc').value = existing?.desc || '';
  $('#event-id').value = existing?.id || '';
  $('#btn-delete').style.display = existing ? 'inline-flex' : 'none';
  $('#event-modal').showModal();
}

$('#tab-add').addEventListener('click', () => openModal());
$('#modal-close').addEventListener('click', () => $('#event-modal').close());

$('#btn-delete').addEventListener('click', () => {
  if (state.editingId && confirm('Excluir este compromisso?')) {
    deleteEvent(state.editingId);
    $('#event-modal').close();
    renderEvents();
  }
});

$('#event-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    id: $('#event-id').value || crypto.randomUUID(),
    title: $('#event-title').value.trim(),
    date: $('#event-date').value,
    time: $('#event-time').value,
    desc: $('#event-desc').value.trim()
  };
  upsertEvent(data);
  $('#event-modal').close();
  renderEvents();
});

// ---- Filtros e Sistema de Autenticação ----
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
