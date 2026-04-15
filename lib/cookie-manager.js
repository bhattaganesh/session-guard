/**
 * Helpers for reading and deleting cookies for configured services.
 */

/**
 * Returns all services from the provided list that currently have an active
 * login session, detected by the presence of their known session cookies.
 *
 * @param {Array} services
 * @returns {Promise<Array>} subset of services that are signed in
 */
export async function detectActiveSessions(services) {
  const active = [];

  for (const service of services) {
    if (!service.enabled) continue;

    // Custom services are fully untrusted. Even if isSessionActive
    // cannot find cookies (e.g., localStorage SPAs like MeroShare), 
    // we strictly include them in the cleanup array so their modern browser 
    // storage is relentlessly scrubbed on every Chrome closure.
    if (service.id.startsWith('custom_')) {
      active.push(service);
      continue;
    }

    const isActive = await isSessionActive(service);
    if (isActive) active.push(service);
  }

  return active;
}

/**
 * Checks whether a specific service has an active session by looking for
 * any of its known session cookies.
 *
 * @param {Object} service
 * @returns {Promise<boolean>}
 */
export async function isSessionActive(service) {
  // For custom domains that don't declare specific session cookies,
  // we assume the session is active if there is ANY cookie present for the domain.
  if (!service.sessionCookies || service.sessionCookies.length === 0) {
    for (const domain of service.domains) {
      try {
        const cleanDomain = domain.startsWith('.') ? domain.slice(1) : domain;
        const cookies = await chrome.cookies.getAll({ url: `https://${cleanDomain}` });
        if (cookies.length > 0) return true;
      } catch {
        // ignore invalid domains
      }
    }
    
    // SPAs like MeroShare use zero cookies, meaning we cannot reliably detect their
    // background session state via cookies. We return false here so the UI 
    // accurately shows "Signed out" when no cookies exist.
    // NOTE: detectActiveSessions explicitly overrides this to guarantee cleanup!
    return false;
  }

  for (const domain of service.domains) {
    const cleanDomain = domain.startsWith('.') ? domain.slice(1) : domain;
    const url = `https://${cleanDomain}`;

    for (const cookieName of service.sessionCookies) {
      try {
        const cookie = await chrome.cookies.get({ url, name: cookieName });
        if (cookie) return true;
      } catch {
        // Cookie API may throw if url is invalid — continue checking
      }
    }
  }
  return false;
}

/**
 * Deletes ALL cookies (not just session cookies) for every domain belonging
 * to the provided services. This is the full logout from Chrome's perspective.
 *
 * @param {Array} services
 * @returns {Promise<number>} total number of cookies deleted
 */
export async function clearCookiesFor(services) {
  let totalDeleted = 0;
  const removalPromises = [];

  for (const service of services) {
    if (!service.enabled) continue;

    for (const domain of service.domains) {
      const cleanDomain = domain.startsWith('.') ? domain.slice(1) : domain;
      const cookies = await chrome.cookies.getAll({ domain: cleanDomain });

      for (const cookie of cookies) {
        const scheme = cookie.secure ? 'https' : 'http';
        const host = cookie.domain.startsWith('.')
          ? cookie.domain.slice(1)
          : cookie.domain;

        removalPromises.push(
          chrome.cookies
            .remove({ url: `${scheme}://${host}${cookie.path}`, name: cookie.name })
            .then(() => { totalDeleted++; })
            .catch(() => { /* ignore removal errors for individual cookies */ })
        );
      }

      // Crucial for SPA and React/Angular apps (like MeroShare)
      // Clears localStorage, sessionStorage, and IndexedDB
      if (chrome.browsingData && chrome.browsingData.remove) {
        removalPromises.push(
          new Promise((resolve) => {
            chrome.browsingData.remove({
              origins: [`https://${cleanDomain}`]
            }, {
              localStorage: true,
              indexedDB: true,
              cacheStorage: true
            }, () => resolve());
          })
        );
      }
    }
  }

  await Promise.all(removalPromises);
  return totalDeleted;
}
