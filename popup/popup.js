const serviceList = document.getElementById('serviceList');
const logoutBtn   = document.getElementById('logoutBtn');
const settingsBtn = document.getElementById('settingsBtn');
const guardToggle = document.getElementById('guardToggle');
const feedback    = document.getElementById('feedback');

// ── Load settings and render service status on open ──────────────────────────

async function init() {
  const { guardEnabled } = await chrome.storage.sync.get({ guardEnabled: true });
  guardToggle.checked = guardEnabled;

  await renderServices();
}

async function renderServices() {
  serviceList.innerHTML = '<div class="loading">Checking sessions…</div>';

  let statuses;
  try {
    statuses = await chrome.runtime.sendMessage({ action: 'getStatus' });
  } catch {
    serviceList.innerHTML = '<div class="empty-state">Unable to load status.<br>Reload the extension.</div>';
    return;
  }

  const entries = Object.entries(statuses).filter(([, s]) => s.enabled);

  if (entries.length === 0) {
    serviceList.innerHTML = '<div class="empty-state">No services configured.<br>Click "Manage Services" to add some.</div>';
    logoutBtn.disabled = true;
    return;
  }

  serviceList.innerHTML = '';

  let anySignedIn = false;

  for (const [id, status] of entries) {
    const row = document.createElement('div');
    row.className = 'service-row';

    const stateClass = status.signedIn ? 'signed-in' : 'signed-out';
    const stateLabel = status.signedIn ? 'Signed in' : 'Signed out';
    if (status.signedIn) anySignedIn = true;

    row.innerHTML = `
      <div class="service-avatar" style="background:${status.color}">${status.icon}</div>
      <div class="service-info">
        <div class="service-name"></div>
        <div class="service-state ${stateClass}">${stateLabel}</div>
      </div>
      <div class="status-dot ${stateClass}"></div>
    `;

    row.querySelector('.service-name').textContent = status.name;

    serviceList.appendChild(row);
  }

  logoutBtn.disabled = !anySignedIn;
}

// ── Toggle protection on/off ──────────────────────────────────────────────────

guardToggle.addEventListener('change', () => {
  chrome.storage.sync.set({ guardEnabled: guardToggle.checked });
});

// ── Manual sign-out ───────────────────────────────────────────────────────────

logoutBtn.addEventListener('click', async () => {
  logoutBtn.disabled = true;
  logoutBtn.innerHTML = '<span class="spinner"></span>Signing out…';

  await chrome.runtime.sendMessage({ action: 'manualLogout' });

  logoutBtn.textContent = 'Sign Out Now';
  feedback.style.display = 'block';

  // Re-render status after logout
  await renderServices();

  setTimeout(() => { feedback.style.display = 'none'; }, 3000);
});

// ── Open options page ─────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// ── Boot ──────────────────────────────────────────────────────────────────────

init();
