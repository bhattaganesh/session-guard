import { SERVICE_LIBRARY } from '../lib/services-library.js';

let services = [];

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init() {
  const guardToggle = document.getElementById('guardToggle');
  if (!guardToggle) {
    console.error('guardToggle element not found in DOM');
    return;
  }

  const { services: saved, guardEnabled } = await chrome.storage.sync.get({
    services: [],
    guardEnabled: true,
  });
  services = saved;
  guardToggle.checked = guardEnabled;

  renderActiveList();
  renderLibrary();
  setupEventListeners();
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

    const cleanDomain = service.domains[0].startsWith('.') ? service.domains[0].slice(1) : service.domains[0];
    const faviconUrl = `https://s2.googleusercontent.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=64`;

    const avatarContent = `<img src="${faviconUrl}" style="width:100%;height:100%;object-fit:contain;border-radius:inherit;" />`;

    item.innerHTML = `
      <div class="svc-avatar" style="background:#ffffff; border: 1px solid #f0f0f0;">${avatarContent}</div>
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
    const cleanDomain = svc.domains[0].startsWith('.') ? svc.domains[0].slice(1) : svc.domains[0];
    const faviconUrl = `https://s2.googleusercontent.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=64`;

    btn.innerHTML = `
      <div class="lib-avatar" style="background:#ffffff; border: 1px solid #f0f0f0;">
        <img src="${faviconUrl}" style="width:100%;height:100%;object-fit:contain;border-radius:inherit;" />
      </div>
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

// ── Setup UI event listeners ──────────────────────────────────────────────────

function setupEventListeners() {
  // Protection toggle
  const guardToggle = document.getElementById('guardToggle');
  if (guardToggle) {
    guardToggle.addEventListener('change', (e) => {
      chrome.storage.sync.set({ guardEnabled: e.target.checked });
      showToastMessage('success', 'Protection setting updated.');
    });
  }

  const addCustomBtn = document.getElementById('addCustomBtn');
  const nameInput = document.getElementById('customName');
  const domainInput = document.getElementById('customDomain');

  if (!addCustomBtn || !nameInput || !domainInput) {
    console.error('Required form elements not found in DOM');
    return;
  }

  domainInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomBtn.click();
    }
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      domainInput.focus();
    }
  });

  addCustomBtn.addEventListener('click', async () => {
    const nameInputEl = document.getElementById('customName');
    const domainInputEl = document.getElementById('customDomain');

    if (!nameInputEl || !domainInputEl) {
      showToastMessage('error', 'Form elements not found.');
      return;
    }

    const serviceName = nameInputEl.value.trim();
    let domain = domainInputEl.value.trim();

    if (!serviceName || !domain) {
      nameInputEl.style.borderColor = !serviceName ? '#d93025' : '#e8eaed';
      domainInputEl.style.borderColor = !domain ? '#d93025' : '#e8eaed';
      showToastMessage('error', 'Please provide both a service name and domain.');
      return;
    }

    try {
      if (domain.includes('://')) {
        domain = new URL(domain).hostname;
      }
    } catch(e) {
      showToastMessage('error', 'Invalid domain or URL format.');
      return;
    }

    if (!domain.startsWith('.')) {
      domain = '.' + domain;
    }

    // Check if domain is already protected
    const isDuplicate = services.some(s => s.domains.includes(domain));
    if (isDuplicate) {
      showToastMessage('error', 'This domain is already protected.');
      return;
    }

    // Security: Dynamically request minimum required host permissions
    try {
      const cleanDomain = domain.startsWith('.') ? domain.slice(1) : domain;
      const origins = [`*://*.${cleanDomain}/*`, `*://${cleanDomain}/*`];
      const granted = await chrome.permissions.request({ origins });
      if (!granted) {
        showToastMessage('error', 'Permission is required to protect this service.');
        return;
      }
    } catch (err) {
      console.warn('Could not request permissions:', err);
      showToastMessage('error', 'Browser blocked the permission request.');
      return;
    }

    const id = `custom_${Date.now()}`;

    services.push({
      id,
      name: serviceName,
      domains: [domain],
      sessionCookies: [],
      logoutUrl: null,
      enabled: true,
    });

    nameInputEl.value = '';
    domainInputEl.value = '';
    nameInputEl.style.borderColor = '#e8eaed';
    domainInputEl.style.borderColor = '#e8eaed';

    await chrome.storage.sync.set({ services });
    renderActiveList();
    showToastMessage('success', 'Custom service added successfully!');
  });
}

// ── Protection toggle ─────────────────────────────────────────────────────────
// (Called from setupEventListeners during init)

// ── Persist ───────────────────────────────────────────────────────────────────

async function save() {
  await chrome.storage.sync.set({ services });
  showToastMessage('success', 'Changes saved successfully.');
}

function showToastMessage(type, text) {
  const toast = document.getElementById('toastMessage');
  if (!toast) {
    console.error('Toast element not found in DOM');
    return;
  }

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>`;
    toast.className = 'toast-message success';
  } else {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    toast.className = 'toast-message error';
  }

  toast.innerHTML = `<div class="toast-icon">${iconSvg}</div><div>${text}</div>`;
  toast.style.display = 'flex';

  clearTimeout(showToastMessage._timer);
  showToastMessage._timer = setTimeout(() => {
    toast.style.display = 'none';
  }, 4000);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
