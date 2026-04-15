import { SERVICE_LIBRARY } from '../lib/services-library.js';

const grid       = document.getElementById('serviceGrid');
const finishBtn  = document.getElementById('finishBtn');
const skipLink   = document.getElementById('skipLink');

const selected = new Set(['google', 'github']); // pre-select the most common pair

// ── Render service selection grid ─────────────────────────────────────────────

for (const svc of SERVICE_LIBRARY) {
  const cleanDomain = svc.domains[0].startsWith('.') ? svc.domains[0].slice(1) : svc.domains[0];
  const faviconUrl = `https://s2.googleusercontent.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=64`;

  const label = document.createElement('label');
  label.className = `service-check${selected.has(svc.id) ? ' selected' : ''}`;
  label.innerHTML = `
    <input type="checkbox" value="${svc.id}" ${selected.has(svc.id) ? 'checked' : ''} />
    <div class="svc-av" style="background:#ffffff; border: 1px solid #f0f0f0;">
       <img src="${faviconUrl}" style="width:100%;height:100%;object-fit:contain;border-radius:inherit;" />
    </div>
    <span class="svc-label"></span>
    <div class="checkmark">${selected.has(svc.id) ? '✓' : ''}</div>
  `;

  label.querySelector('.svc-label').textContent = svc.name;

  const checkbox = label.querySelector('input');
  checkbox.addEventListener('change', () => {
    const id = svc.id;
    if (checkbox.checked) {
      selected.add(id);
      label.classList.add('selected');
      label.querySelector('.checkmark').textContent = '✓';
    } else {
      selected.delete(id);
      label.classList.remove('selected');
      label.querySelector('.checkmark').textContent = '';
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
