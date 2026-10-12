import { api } from './client';

/** Transenigma company content (api/src/Services/ContentService.php). */

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  credentials: string[];
  photo: string | null;
}

export interface Publication {
  id: number;
  citation: string;
  year: number | null;
  url: string | null;
}

export interface ResearchCategory {
  /** Anchor on the Research page: /research#<slug> */
  slug: string;
  name: string;
  /** One-line summary for the homepage research cards. */
  tagline: string | null;
  count: number;
  publications: Publication[];
}

export interface Research {
  totals: { categories: number; publications: number };
  categories: ResearchCategory[];
}

export interface ConsultancyProject {
  id: number;
  slug: string;
  name: string;
  /** Shown in "Clients and partners" on /consultancy; null for upcoming products. */
  clientName: string | null;
  description: string;
  image: string | null;
  /** Null when the project has no live website. */
  url: string | null;
}

export interface ConsultancyGroup {
  slug: string;
  name: string;
  tagline: string;
  /** clients = client work; products = our own products in development ("In development" label, not counted). */
  kind: 'clients' | 'products';
  projects: ConsultancyProject[];
}

export interface Consultancy {
  totals: { projects: number };
  groups: ConsultancyGroup[];
}

export interface Venture {
  id: number;
  slug: string;
  name: string;
  shortName: string | null;
  kind: 'product' | 'social';
  description: string | null;
  /** Null when the venture has no live website. */
  url: string | null;
}

/** Live site-wide counts (home page). */
export interface ContentStats {
  publications: number;
  researchFields: number;
  clientProjects: number;
  clients: string[];
}

export const contentApi = {
  stats: () => api.get<ContentStats>('/content/stats'),
  ventures: () => api.get<Venture[]>('/content/ventures'),
  team: () => api.get<TeamMember[]>('/content/team'),
  research: () => api.get<Research>('/content/research'),
  consultancy: () => api.get<Consultancy>('/content/consultancy'),
};
