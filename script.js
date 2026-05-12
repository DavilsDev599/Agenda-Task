// Agenda Task — Versão Unificada com Perfil Profissional
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const SCREENS = {
  login: $('#screen-login'),
  home: $('#screen-home'),
  profile: $('#screen-profile')
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

function upsertEvent(evt) {
  const list = loadEvents();
  const idx = list.findIndex(e => e.id === evt.id);
  if (idx >= 0) list[idx] = evt; else list.push(evt);
  list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  saveEvents(list);
}

function deleteEvent(id) {
  const list = loadEvents().filter(e => e.id !== id);
  saveEvents(list);
}

// ---- Navegação ----
function show(screenKey) {
  // Esconde todas as telas e remove active das abas
  Object.values(SCREENS).forEach(s => s.classList.remove('active'));
  $$('.tab').forEach(t => t.classList.remove('active'));

  // Ativa a tela e a aba correspondente
  if (SCREENS[screenKey]) {
    SCREENS[screenKey].classList.add('active');
    const tab = $(`.tab[data-screen="${screenKey}"]`);
    if (tab) tab.classList.add('active');
  }
}

// Eventos de clique nas abas
$$('.tab[data-screen]').forEach(btn => {
  btn.addEventListener('click', () => {
    const screen = btn.dataset.screen;
    show(screen);
    if (screen === 'home') renderEvents();
    if (screen === 'profile') loadProfile();
  });
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
  alert('Perfil profissional salvo com sucesso!');
});

// ---- Home e Eventos ----
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
          <button class="icon-btn" title="Excluir" data-del="${e.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="event-meta"><i class="fa-regular fa-clock"></i> ${e.time} • <span class="badge">${formatBadge(e.date)}</span></div>
      ${e.desc ? `<p>${e.desc}</p>` : ''}
    `;
    listNode.appendChild(li);
  }
}

function formatBadge(dateStr) {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return 'Hoje';
  const d = new Date(dateStr + 'T00:00:00');
  const t = new Date(today + 'T00:00:00');
  const diff = Math.round((d - t) / 86400000);
  if (diff === 1) return 'Amanhã';
  if (diff > 1) return `Em ${diff} dias`;
  if (diff === -1) return 'Ontem';
  return `${Math.abs(diff)} dia(s) ${diff < 0 ? 'atrás' : ''}`;
}

// ---- Modais e Formulários ----
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

$('#btn-open-modal').addEventListener('click', () => openModal());
$('#tab-add').addEventListener('click', () => openModal());
$('#modal-close').addEventListener('click', () => $('#event-modal').close());

$('#event-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    id: $('#event-id').value || crypto.randomUUID(),
    title: $('#event-title').value.trim(),
    date: $('#event-date').value,
    time: $('#event-time').value,
    desc: $('#event-desc').value.trim()
  };
  if (!data.title) return alert('Informe um título.');
  upsertEvent(data);
  $('#event-modal').close();
  renderEvents();
});

// Delegação de eventos na lista
$('#events-list').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.edit || btn.dataset.del;
  if (btn.dataset.edit) {
    const match = loadEvents().find(x => x.id === id);
    if (match) openModal(match);
  } else if (btn.dataset.del) {
    if (confirm('Excluir este compromisso?')) {
      deleteEvent(id);
      renderEvents();
    }
  }
});

// ---- Filtros e Logout ----
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

// ---- Inicialização ----
(function boot() {
  setInterval(() => {
    $('#live-time').textContent = nowClock();
    const d = new Date();
    $('#now-time').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
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