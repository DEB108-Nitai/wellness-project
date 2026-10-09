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
  description: string;
  image: string | null;
  /** Null when the project has no live website. */
  url: string | null;
}

export interface ConsultancyGroup {
  slug: string;
  name: string;
  tagline: string;
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

export const contentApi = {
  ventures: () => api.get<Venture[]>('/content/ventures'),
  team: () => api.get<TeamMember[]>('/content/team'),
  research: () => api.get<Research>('/content/research'),
  consultancy: () => api.get<Consultancy>('/content/consultancy'),
};
