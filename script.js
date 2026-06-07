const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const SCREENS = {
  login: $('#screen-login'),
  register: $('#screen-register'),
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

// ---- Gestão de Navegação Global ----
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

// ---- Fluxo de Roteamento / Cliques Iniciais ----
if ($('#link-go-recover')) {
  $('#link-go-recover').addEventListener('click', () => show('recover'));
}
if ($('#link-go-register')) {
  $('#link-go-register').addEventListener('click', () => show('register'));
}

$$('.btn-back-to-login-class').forEach(btn => {
  btn.addEventListener('click', () => show('login'));
});

// Registro de Usuário
$('#register-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#register-name').value.trim();
  const email = $('#register-email').value.trim().toLowerCase();
  const pass = $('#register-pass').value;
  const confirmPass = $('#register-confirm-pass').value;

  if (pass !== confirmPass) {
    return alert('As senhas introduzidas não coincidem.');
  }

  const registeredUsers = JSON.parse(localStorage.getItem('agendaTask_registered_users') || '[]');
  if (registeredUsers.some(u => u.email === email)) {
    return alert('Este e-mail já está cadastrado.');
  }

  registeredUsers.push({ name, email, pass });
  localStorage.setItem('agendaTask_registered_users', JSON.stringify(registeredUsers));

  // Perfil Inicial
  localStorage.setItem(`profile_${email}`, JSON.stringify({ name, category: '', start: '08:00', end: '18:00', price: '' }));

  alert('Conta criada com sucesso! Faça login para continuar.');
  $('#register-form').reset();
  show('login');
});

// Recuperação de Senha
$('#recover-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#recover-email').value.trim().toLowerCase();
  const registeredUsers = JSON.parse(localStorage.getItem('agendaTask_registered_users') || '[]');
  const found = registeredUsers.find(u => u.email === email);

  if (!found) {
    return alert('E-mail não encontrado no sistema.');
  }

  state.user = email; // Guarda temporariamente para a troca
  alert(`Código de verificação enviado para o e-mail: ${email}`);
  show('newPassword');
});

$('#password-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const pass = $('#new-pass').value;
  const confirmPass = $('#confirm-pass').value;

  if (pass !== confirmPass) {
    return alert('As senhas introduzidas não coincidem. Tente novamente.');
  }

  let registeredUsers = JSON.parse(localStorage.getItem('agendaTask_registered_users') || '[]');
  const idx = registeredUsers.findIndex(u => u.email === state.user);
  
  if (idx >= 0) {
    registeredUsers[idx].pass = pass;
    localStorage.setItem('agendaTask_registered_users', JSON.stringify(registeredUsers));
    alert('Senha atualizada com sucesso!');
    $('#password-form').reset();
    show('login');
  }
});

// Login
$('#login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = $('#login-user').value.trim().toLowerCase();
  const pass = $('#login-pass').value;

  const registeredUsers = JSON.parse(localStorage.getItem('agendaTask_registered_users') || '[]');
  const found = registeredUsers.find(u => u.email === user && u.pass === pass);

  if (!found) {
    return alert('Usuário ou senha incorretos.');
  }

  state.user = user;
  localStorage.setItem('agendaTaskUser', user);
  initHome();
  show('home');
});

// ---- Relógio e Inicialização da Home ----
function initHome() {
  $('#today-date').textContent = fmt.format(new Date());
  setInterval(() => {
    $('#live-time').textContent = nowClock();
  }, 1000);
  $('#live-time').textContent = nowClock();
  renderEvents();
}

// ---- Controle do Perfil ----
function loadProfile() {
  const data = JSON.parse(localStorage.getItem(`profile_${state.user}`) || '{}');
  $('#prof-name').value = data.name || '';
  $('#prof-category').value = data.category || '';
  $('#work-start').value = data.start || '08:00';
  $('#work-end').value = data.end || '18:00';
  $('#prof-price').value = data.price || '';
}

$('#btn-save-profile').addEventListener('click', () => {
  const data = {
    name: $('#prof-name').value,
    category: $('#prof-category').value,
    start: $('#work-start').value,
    end: $('#work-end').value,
    price: $('#prof-price').value
  };
  localStorage.setItem(`profile_${state.user}`, JSON.stringify(data));
  alert('Perfil atualizado com sucesso!');
});

// Logout
$('#btn-logout').addEventListener('click', () => {
  state.user = null;
  localStorage.removeItem('agendaTaskUser');
  show('login');
  $('#login-form').reset();
});

// ---- Sistema de Agendamentos (Eventos) ----
const modal = $('#event-modal');

$('#tab-add').addEventListener('click', () => {
  state.editingId = null;
  $('#modal-title').textContent = "Novo compromisso";
  $('#event-form').reset();
  
  // Setar data atual por defeito
  const hoje = new Date().toISOString().split('T')[0];
  $('#event-date').value = hoje;
  
  modal.showModal();
});

$('#modal-close').addEventListener('click', () => modal.close());

$('#event-form').addEventListener('submit', (e) => {
  const title = $('#event-title').value.trim();
  const date = $('#event-date').value;
  const time = $('#event-time').value;

  let list = loadEvents();

  if (state.editingId) {
    list = list.map(item => item.id === state.editingId ? { id: state.editingId, title, date, time } : item);
  } else {
    list.push({ id: Date.now().toString(), title, date, time });
  }

  list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  saveEvents(list);
  renderEvents();
});

function renderEvents() {
  const listEl = $('#events-list');
  const emptyState = $('#empty-state');
  listEl.innerHTML = '';

  const fDate = $('#filter-date').value;
  const fText = $('#filter-text').value.toLowerCase().trim();

  let events = loadEvents();

  // Aplicação dos filtros
  events = events.filter(e => {
    const matchDate = fDate ? e.date === fDate : true;
    const matchText = fText ? e.title.toLowerCase().includes(fText) : true;
    return matchDate && matchText;
  });

  if (events.length === 0) {
    emptyState.removeAttribute('hidden');
  } else {
    emptyState.setAttribute('hidden', 'true');
    events.forEach(e => {
      const li = document.createElement('li');
      li.className = 'event';
      
      // Inverter exibição da data para formato BR/PT
      const [ano, mes, dia] = e.date.split('-');

      li.innerHTML = `
        <div class="event-header">
          <h4 class="event-title">${e.title}</h4>
          <div class="event-actions">
            <button class="icon-btn edit-btn" data-id="${e.id}"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn del-btn" data-id="${e.id}" style="color: #dc3545;"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div class="event-meta">
          <i class="fa-regular fa-calendar"></i> ${dia}/${mes}/${ano} &nbsp;&nbsp;
          <i class="fa-regular fa-clock"></i> ${e.time}
        </div>
      `;
      listEl.appendChild(li);
    });
  }

  // Eventos dos botões internos da lista
  $$('.edit-btn').forEach(b => b.addEventListener('click', (e) => openEdit(e.currentTarget.dataset.id)));
  $$('.del-btn').forEach(b => b.addEventListener('click', (e) => removeEvent(e.currentTarget.dataset.id)));
}

function openEdit(id) {
  const ev = loadEvents().find(e => e.id === id);
  if (!ev) return;
  state.editingId = id;
  $('#modal-title').textContent = "Editar compromisso";
  $('#event-title').value = ev.title;
  $('#event-date').value = ev.date;
  $('#event-time').value = ev.time;
  modal.showModal();
}

function removeEvent(id) {
  if (confirm('Tem certeza de que deseja excluir este compromisso?')) {
    const filtered = loadEvents().filter(e => e.id !== id);
    saveEvents(filtered);
    renderEvents();
  }
}

// Filtros em Tempo Real
$('#filter-date').addEventListener('change', renderEvents);
$('#filter-text').addEventListener('input', renderEvents);
$('#btn-clear-filters').addEventListener('click', () => {
  $('#filter-date').value = '';
  $('#filter-text').value = '';
  renderEvents();
});

// Auto login se sessão existir localmente
const savedUser = localStorage.getItem('agendaTaskUser');
if (savedUser) {
  state.user = savedUser;
  initHome();
  show('home');
}
