import { SERVICE_LIBRARY } from '../lib/services-library.js';

const grid       = document.getElementById('serviceGrid');
const finishBtn  = document.getElementById('finishBtn');
const skipLink   = document.getElementById('skipLink');

const selected = new Set(['google', 'github']); // pre-select the most common pair

// ── Render service selection grid ─────────────────────────────────────────────

for (const svc of SERVICE_LIBRARY) {
  const label = document.createElement('label');
  label.className = `service-check${selected.has(svc.id) ? ' selected' : ''}`;
  label.innerHTML = `
    <input type="checkbox" value="${svc.id}" ${selected.has(svc.id) ? 'checked' : ''} />
    <div class="svc-av" style="background:${svc.color}">${svc.icon}</div>
    <span class="svc-label">${svc.name}</span>
    <div class="checkmark">${selected.has(svc.id) ? '✓' : ''}</div>
  `;

  label.addEventListener('click', () => {
    const id = svc.id;
    if (selected.has(id)) {
      selected.delete(id);
      label.classList.remove('selected');
      label.querySelector('.checkmark').textContent = '';
    } else {
      selected.add(id);
      label.classList.add('selected');
      label.querySelector('.checkmark').textContent = '✓';
    }
    finishBtn.disabled = selected.size === 0;
  });

  grid.appendChild(label);
}

updateFinishBtn();

function updateFinishBtn() {
  finishBtn.disabled = selected.size === 0;
}

// ── Finish setup ──────────────────────────────────────────────────────────────

finishBtn.addEventListener('click', async () => {
  finishBtn.disabled = true;
  finishBtn.textContent = 'Saving…';

  const services = SERVICE_LIBRARY.map((svc) => ({
    ...svc,
    enabled: selected.has(svc.id),
  }));

  await chrome.storage.sync.set({ services, guardEnabled: true });
  chrome.runtime.openOptionsPage();
  window.close();
});

skipLink.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
