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
      const cookies = await chrome.cookies.getAll({ domain });

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
    }
  }

  await Promise.all(removalPromises);
  return totalDeleted;
}
