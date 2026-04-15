/**
 * Session Guard — Service Worker (MV3)
 *
 * Two-phase logout strategy:
 *
 *   Phase 1 (on browser close): Best-effort, local-only cookie clear.
 *            Fast but NOT guaranteed to complete before Chrome kills this worker.
 *
 *   Phase 2 (on next browser open): Authoritative, reliable cleanup.
 *            Detects any sessions that survived Phase 1, navigates to their
 *            logout endpoints in background tabs (server-side invalidation),
 *            then clears remaining cookies. Always runs. Handles crashes,
 *            force-quits, battery death, etc.
 *
 * ALL event listeners are registered synchronously at the top level — this is
 * required by MV3 so Chrome can wake a dormant service worker for these events.
 */

import { SERVICE_LIBRARY, DEFAULT_ENABLED_IDS } from './lib/services-library.js';
import { detectActiveSessions, clearCookiesFor, isSessionActive } from './lib/cookie-manager.js';

// ─────────────────────────────────────────────────────────────────────────────
// Event listeners — MUST be registered before any await
// ─────────────────────────────────────────────────────────────────────────────

/** Phase 2: runs every time Chrome (re)starts */
chrome.runtime.onStartup.addListener(() => {
  setExtensionIcon();
  runStartupLogout();
});

/** First install: open onboarding + write default settings */
chrome.runtime.onInstalled.addListener(({ reason }) => {
  setExtensionIcon();
  if (reason === 'install') {
    const defaultServices = SERVICE_LIBRARY.map((s) => ({
      ...s,
      enabled: DEFAULT_ENABLED_IDS.includes(s.id),
    }));
    chrome.storage.sync.set({ services: defaultServices, guardEnabled: true });
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
  }
});

/** Phase 1: best-effort cookie clear when the last Chrome window is closed */
chrome.windows.onRemoved.addListener(async () => {
  const remainingWindows = await chrome.windows.getAll();
  if (remainingWindows.length === 0) {
    await runBrowserCloseLogout();
  }
});

/** Messages from popup and options page */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'manualLogout') {
    runManualLogout().then(() => sendResponse({ ok: true }));
    return true; // keep channel open for async response
  }

  if (message.action === 'getStatus') {
    getServiceStatuses().then(sendResponse);
    return true;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — Browser close (best-effort)
// ─────────────────────────────────────────────────────────────────────────────

async function runBrowserCloseLogout() {
  const { services, guardEnabled } = await getSettings();
  if (!guardEnabled) return;

  const enabledServices = services.filter((s) => s.enabled);
  const activeSessions = await detectActiveSessions(enabledServices);
  if (activeSessions.length === 0) return;

  // Record which services had active sessions so Phase 2 knows what to check
  // (This write may not persist if Chrome kills the worker first — Phase 2
  // handles that by re-detecting sessions independently on startup.)
  await chrome.storage.local.set({
    phase1Attempted: true,
    phase1ActiveIds: activeSessions.map((s) => s.id),
    phase1Timestamp: Date.now(),
  });

  // Delete cookies — fast, local, best-effort
  await clearCookiesFor(activeSessions);
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — Startup (authoritative, always runs)
// ─────────────────────────────────────────────────────────────────────────────

async function runStartupLogout() {
  const { services, guardEnabled } = await getSettings();
  if (!guardEnabled) return;

  const enabledServices = services.filter((s) => s.enabled);

  // Re-check which sessions are still alive (Phase 1 may not have completed)
  const stillActive = await detectActiveSessions(enabledServices);
  if (stillActive.length === 0) {
    await chrome.storage.local.remove(['phase1Attempted', 'phase1ActiveIds', 'phase1Timestamp']);
    return;
  }

  // Perform full logout: server-side (logout URL) + local (cookie clear)
  await performFullLogout(stillActive);

  const names = stillActive.map((s) => s.name).join(', ');
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
    title: 'Session Guard',
    message: `Signed out of: ${names}`,
  });

  await chrome.storage.local.remove(['phase1Attempted', 'phase1ActiveIds', 'phase1Timestamp']);
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual logout (triggered from popup)
// ─────────────────────────────────────────────────────────────────────────────

async function runManualLogout() {
  const { services, guardEnabled } = await getSettings();
  if (!guardEnabled) return;

  const enabledServices = services.filter((s) => s.enabled);
  const activeSessions = await detectActiveSessions(enabledServices);
  if (activeSessions.length === 0) return;

  await performFullLogout(activeSessions);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full logout: navigate to each service's logout URL (server-side invalidation)
 * then clear all local cookies for those services.
 */
async function performFullLogout(services) {
  // Server-side logout first (for services that support a GET logout URL)
  for (const service of services) {
    if (service.logoutUrl) {
      await logoutViaUrl(service.logoutUrl);
    }
  }

  // Clear all local cookies for these services
  await clearCookiesFor(services);
}

/**
 * Opens a URL in a background tab, waits for it to load, then closes it.
 * Used to hit server-side logout endpoints invisibly.
 */
function logoutViaUrl(url) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      // Wait 3 seconds for the logout endpoint to process, then close the tab
      setTimeout(() => {
        chrome.tabs.remove(tab.id, () => resolve());
      }, 3000);
    });
  });
}

/**
 * Returns the live login status for every configured service.
 * Called by the popup to show green/grey status dots.
 */
async function getServiceStatuses() {
  const { services } = await getSettings();
  const statuses = {};

  for (const service of services) {
    statuses[service.id] = {
      name: service.name,
      enabled: service.enabled,
      signedIn: service.enabled ? await isSessionActive(service) : false,
      icon: service.icon,
      color: service.color,
    };
  }

  return statuses;
}

/** Reads settings from chrome.storage.sync with safe defaults. */
async function getSettings() {
  const defaultServices = SERVICE_LIBRARY.map((s) => ({
    ...s,
    enabled: DEFAULT_ENABLED_IDS.includes(s.id),
  }));

  return chrome.storage.sync.get({
    services: defaultServices,
    guardEnabled: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Toolbar icon — rendered via OffscreenCanvas so "SG" text appears properly
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws the "SG" icon at every required size using OffscreenCanvas and
 * applies it to the toolbar button. Called on install and every startup so
 * the icon is always correct even after the service worker restarts.
 */
async function setExtensionIcon() {
  try {
    const imageData = {};

    for (const size of [16, 32, 48, 128]) {
      const canvas = new OffscreenCanvas(size, size);
      const ctx    = canvas.getContext('2d');

      // Rounded-square background
      const radius = size * 0.22;
      ctx.fillStyle = '#1a73e8';
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(size - radius, 0);
      ctx.arcTo(size, 0,    size, radius,      radius);
      ctx.lineTo(size, size - radius);
      ctx.arcTo(size, size, size - radius, size, radius);
      ctx.lineTo(radius, size);
      ctx.arcTo(0, size, 0, size - radius,   radius);
      ctx.lineTo(0, radius);
      ctx.arcTo(0, 0,   radius, 0,            radius);
      ctx.closePath();
      ctx.fill();

      // "SG" text — scale font relative to icon size
      ctx.fillStyle    = '#ffffff';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.font         = `bold ${Math.round(size * 0.38)}px Arial, sans-serif`;
      ctx.fillText('SG', size / 2, size / 2 + size * 0.02);

      imageData[size] = ctx.getImageData(0, 0, size, size);
    }

    await chrome.action.setIcon({ imageData });
  } catch (err) {
    // OffscreenCanvas may not be available in very old Chrome builds — silently ignore
    console.warn('[SessionGuard] setExtensionIcon failed:', err);
  }
}
