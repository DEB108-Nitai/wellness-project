/**
 * Per-page <title>, meta description, canonical URL and robots rule (slice S10, owner-approved titles
 * 2026-10-10). Applied by <PageMeta /> in the app layout whenever the path changes. Descriptions reuse
 * each page's own sub-line. Private pages (account, results, admin, sign-in) are marked noindex.
 */
export const SITE_ORIGIN = 'https://transenigma.com';

const DEFAULT_DESCRIPTION =
  'Transenigma Pvt Ltd: research (TERF), technology consultancy, free 60-Day Transformation Programs and a free, science-based 16 Personality Factors test.';

interface Meta {
  title: string;
  description: string;
  index: boolean;
}

const PUBLIC: Record<string, Omit<Meta, 'index'>> = {
  '/': { title: 'Transenigma — Research, Technology & Well-Being', description: DEFAULT_DESCRIPTION },
  '/research': {
    title: 'Research — Trans Enigma Research Foundation | Transenigma',
    description:
      'Publications across 15 fields from the Trans Enigma Research Foundation (TERF), from computational psychology and AI-led drug discovery to Vedic psychology, leadership and governance.',
  },
  '/consultancy': {
    title: 'Consultancy | Transenigma',
    description: 'We design products and build technology for enterprises, public-sector organisations and social-impact initiatives.',
  },
  '/team': {
    title: 'Our Team | Transenigma',
    description: 'Researchers, engineers and practitioners working across psychology, technology and health.',
  },
  '/contact': {
    title: 'Contact | Transenigma',
    description: 'Questions about our research, a consultancy project, the 16PF assessment or the 60-day programs? Write to us.',
  },
  '/test': {
    title: 'Free 16PF Personality Test | Transenigma',
    description: 'Take the free, science-based 16 Personality Factors test: 166 statements, scored against norms from 35,338 people.',
  },
  '/how-it-works': {
    title: 'How the 16PF Test Works | Transenigma',
    description:
      'A standardized, continuous psychometric measurement model built on decades of peer-reviewed personality research and the International Personality Item Pool (IPIP).',
  },
  '/factors': {
    title: 'The 16 Personality Factors | Transenigma',
    description: 'Explore the 16 primary personality factors derived from the scientific International Personality Item Pool (IPIP) construct.',
  },
  '/benefits': {
    title: 'Benefits of the 16PF Test | Transenigma',
    description: 'How objective 16-factor psychometrics empowers individuals, teams, and enterprises.',
  },
  '/faq': {
    title: 'FAQ | Transenigma',
    description: 'Answers regarding the 16 personality assessment, Sten scores, data policies, and 60-day transformation challenges.',
  },
  '/privacy': {
    title: 'Privacy Policy | Transenigma',
    description:
      'Information on how your assessment scores, demographics, and 60-day transformation challenge data are collected, utilized, and securely managed.',
  },
  '/terms': { title: 'Terms of Service | Transenigma', description: DEFAULT_DESCRIPTION },
};

const PRIVATE_TITLES: [RegExp, string][] = [
  [/^\/login/, 'Sign in | Transenigma'],
  [/^\/signup/, 'Create your account | Transenigma'],
  [/^\/(forgot-password|reset-password|verify-email)/, 'Your account | Transenigma'],
  [/^\/account/, 'Your account | Transenigma'],
  [/^\/my-results/, 'My results | Transenigma'],
  [/^\/(results|r)\//, 'Personality report | Transenigma'],
  [/^\/admin/, 'Admin | Transenigma'],
  [/^\/unsubscribe/, 'Newsletter | Transenigma'],
];

export function metaForPath(pathname: string): Meta {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (PUBLIC[path]) return { ...PUBLIC[path], index: true };
  // /factors/<code> pages share the factors page's text.
  if (/^\/factors\/[a-z0-9]+$/i.test(path)) return { ...PUBLIC['/factors'], index: true };
  const priv = PRIVATE_TITLES.find(([re]) => re.test(path));
  if (priv) return { title: priv[1], description: DEFAULT_DESCRIPTION, index: false };
  return { title: 'Page not found | Transenigma', description: DEFAULT_DESCRIPTION, index: false };
}

function element(tag: string, attrs: Record<string, string>): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/** Update (or create) a <meta> tag in <head>. */
function setMeta(key: 'name' | 'property', value: string, content: string) {
  const el = document.head.querySelector(`meta[${key}='${value}']`) ?? document.head.appendChild(element('meta', { [key]: value }));
  el.setAttribute('content', content);
}

export function applyPageMeta(pathname: string): void {
  const meta = metaForPath(pathname);
  document.title = meta.title;
  setMeta('name', 'description', meta.description);
  setMeta('name', 'robots', meta.index ? 'index, follow' : 'noindex, nofollow');
  setMeta('property', 'og:title', meta.title);
  setMeta('property', 'og:description', meta.description);
  const canonical = document.head.querySelector('link[rel="canonical"]');
  if (meta.index) {
    const href = SITE_ORIGIN + (pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/');
    (canonical ?? document.head.appendChild(element('link', { rel: 'canonical' }))).setAttribute('href', href);
  } else {
    canonical?.remove();
  }
}
