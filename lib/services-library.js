/**
 * Pre-built library of popular services.
 *
 * sessionCookies: The specific cookie names that indicate an active login session.
 *                 Used for login detection (popup status dots).
 * domains:        All domains whose cookies must be cleared on logout.
 * logoutUrl:      If set, the extension navigates here on startup to perform
 *                 a proper server-side session invalidation before clearing cookies.
 *                 Services without a logoutUrl use cookie-clear only.
 */
export const SERVICE_LIBRARY = [
  {
    id: 'google',
    name: 'Google / Gmail',
    domains: ['.google.com', 'accounts.google.com', 'mail.google.com'],
    sessionCookies: ['SID', 'HSID', 'SSID'],
    logoutUrl: 'https://accounts.google.com/logout',
    icon: 'G',
    color: '#4285F4',
  },
  {
    id: 'github',
    name: 'GitHub',
    domains: ['.github.com', 'github.com'],
    sessionCookies: ['user_session', '__Host-user_session_same_site'],
    logoutUrl: null, // GitHub logout requires a CSRF-protected POST; cookie clear is sufficient
    icon: 'GH',
    color: '#24292F',
  },
  {
    id: 'microsoft',
    name: 'Microsoft / Outlook',
    domains: ['.microsoft.com', '.live.com', '.outlook.com', '.microsoftonline.com'],
    sessionCookies: ['ESTSAUTH', 'ESTSAUTHPERSISTENT', 'MS0'],
    logoutUrl: 'https://login.microsoftonline.com/logout.srf',
    icon: 'M',
    color: '#0078D4',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    domains: ['.facebook.com'],
    sessionCookies: ['c_user', 'xs'],
    logoutUrl: null,
    icon: 'f',
    color: '#1877F2',
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    domains: ['.twitter.com', '.x.com'],
    sessionCookies: ['auth_token'],
    logoutUrl: null,
    icon: 'X',
    color: '#000000',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    domains: ['.linkedin.com'],
    sessionCookies: ['li_at'],
    logoutUrl: null,
    icon: 'in',
    color: '#0A66C2',
  },
  {
    id: 'slack',
    name: 'Slack',
    domains: ['.slack.com'],
    sessionCookies: ['d'],
    logoutUrl: null,
    icon: 'S',
    color: '#4A154B',
  },
  {
    id: 'notion',
    name: 'Notion',
    domains: ['.notion.so'],
    sessionCookies: ['token_v2'],
    logoutUrl: null,
    icon: 'N',
    color: '#000000',
  },
  {
    id: 'figma',
    name: 'Figma',
    domains: ['.figma.com'],
    sessionCookies: ['figma.user'],
    logoutUrl: null,
    icon: 'Fi',
    color: '#F24E1E',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    domains: ['.dropbox.com'],
    sessionCookies: ['gvc'],
    logoutUrl: null,
    icon: 'D',
    color: '#0061FF',
  },
];

export const DEFAULT_ENABLED_IDS = ['google', 'github'];

export function getServiceById(id) {
  return SERVICE_LIBRARY.find((s) => s.id === id) ?? null;
}
