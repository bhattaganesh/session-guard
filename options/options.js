import { SERVICE_LIBRARY } from '../lib/services-library.js';

let services = [];

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init() {
  const { services: saved, guardEnabled } = await chrome.storage.sync.get({
    services: [],
    guardEnabled: true,
  });
  services = saved;
  document.getElementById('guardToggle').checked = guardEnabled;

  renderActiveList();
  renderLibrary();
}

// ── Render active services ────────────────────────────────────────────────────

function renderActiveList() {
  const container = document.getElementById('activeServiceList');
  const enabled = services.filter((s) => s.enabled !== undefined); // all known services

  if (services.length === 0) {
    container.innerHTML = '<div class="empty-list">No services added yet.</div>';
    return;
  }

  container.innerHTML = '';

  for (const service of services) {
    const item = document.createElement('div');
    item.className = 'service-item';
    item.dataset.id = service.id;

    item.innerHTML = `
      <div class="svc-avatar" style="background:${service.color ?? '#888'}">${service.icon ?? '?'}</div>
      <div class="svc-info">
        <div class="svc-name"></div>
        <div class="svc-domain"></div>
      </div>
      <label class="toggle svc-toggle">
        <input type="checkbox" data-id="${service.id}" ${service.enabled ? 'checked' : ''} />
        <span class="toggle-slider"></span>
      </label>
      <button class="remove-btn" data-id="${service.id}" title="Remove">×</button>
    `;

    item.querySelector('.svc-name').textContent = service.name;
    item.querySelector('.svc-domain').textContent = service.domains[0];

    container.appendChild(item);
  }

  // Toggle enabled/disabled per service
  container.querySelectorAll('input[type=checkbox]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const svc = services.find((s) => s.id === cb.dataset.id);
      if (svc) svc.enabled = cb.checked;
      save();
    });
  });

  // Remove service
  container.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      services = services.filter((s) => s.id !== btn.dataset.id);
      save();
      renderActiveList();
      renderLibrary(); // re-enable in library
    });
  });
}

// ── Render pre-built library ──────────────────────────────────────────────────

function renderLibrary() {
  const grid = document.getElementById('libraryGrid');
  grid.innerHTML = '';

  const activeIds = new Set(services.map((s) => s.id));

  for (const svc of SERVICE_LIBRARY) {
    const isAdded = activeIds.has(svc.id);
    const btn = document.createElement('button');
    btn.className = `library-btn${isAdded ? ' added' : ''}`;
    btn.dataset.id = svc.id;
    btn.innerHTML = `
      <div class="lib-avatar" style="background:${svc.color}">${svc.icon}</div>
      ${svc.name}${isAdded ? ' ✓' : ''}
    `;

    btn.addEventListener('click', () => {
      if (isAdded) return;
      services.push({ ...svc, enabled: true });
      save();
      renderActiveList();
      renderLibrary();
    });

    grid.appendChild(btn);
  }
}

// ── Add custom service ────────────────────────────────────────────────────────

document.getElementById('addCustomBtn').addEventListener('click', () => {
  const nameInput = document.getElementById('customName');
  const domainInput = document.getElementById('customDomain');
  const name   = nameInput.value.trim();
  let domain = domainInput.value.trim();

  // Clear previous error states
  nameInput.style.borderColor = '';
  domainInput.style.borderColor = '';

  let hasError = false;
  if (!name) {
    nameInput.style.borderColor = '#d93025';
    hasError = true;
  }
  if (!domain) {
    domainInput.style.borderColor = '#d93025';
    hasError = true;
  }
  
  if (hasError) return;

  // Basic domain format validation mapping
  if (!domain.startsWith('.')) {
    domain = '.' + domain;
  }

  const id = `custom_${Date.now()}`;
  services.push({
    id,
    name,
    domains: [domain],
    sessionCookies: [],
    logoutUrl: null,
    enabled: true,
    icon: name.slice(0, 2).toUpperCase(),
    color: '#888',
  });

  document.getElementById('customName').value = '';
  document.getElementById('customDomain').value = '';

  save();
  renderActiveList();
});

// ── Protection toggle ─────────────────────────────────────────────────────────

document.getElementById('guardToggle').addEventListener('change', (e) => {
  chrome.storage.sync.set({ guardEnabled: e.target.checked });
  showToast();
});

// ── Persist ───────────────────────────────────────────────────────────────────

async function save() {
  await chrome.storage.sync.set({ services });
  showToast();
}

function showToast() {
  const toast = document.getElementById('saveToast');
  toast.style.display = 'block';
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { toast.style.display = 'none'; }, 2000);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

init();
