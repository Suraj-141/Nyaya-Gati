export interface DemoUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'judge' | 'lawyer' | 'litigant';
  title: string;
  avatarBg: string;
  badgeText: string;
}

export const DEMO_USERS: DemoUser[] = [
  // ── Judges ───────────────────────────────────────────────────
  {
    id: 'j1',
    email: 'justice.kumar@nyaya.in',
    password: 'judge123',
    name: 'Hon. Justice A. Kumar',
    role: 'judge',
    title: 'Senior Presiding Judge - Civil Bench',
    avatarBg: 'bg-judicial-600 text-white',
    badgeText: 'Civil & Urgent Matters Bench'
  },
  {
    id: 'j2',
    email: 'justice.sharma@nyaya.in',
    password: 'judge123',
    name: 'Hon. Justice P. Sharma',
    role: 'judge',
    title: 'Presiding Judge - Commercial Court',
    avatarBg: 'bg-amber-600 text-white',
    badgeText: 'Commercial & Environmental Bench'
  },
  {
    id: 'j3',
    email: 'justice.singh@nyaya.in',
    password: 'judge123',
    name: 'Hon. Justice R. Singh',
    role: 'judge',
    title: 'Presiding Judge - Family & Property Bench',
    avatarBg: 'bg-purple-600 text-white',
    badgeText: 'Family Court & Property Disputes'
  },

  // ── Lawyers ──────────────────────────────────────────────────
  {
    id: 'l1',
    email: 'adv.priya@nyaya.in',
    password: 'lawyer123',
    name: 'Adv. Priya Menon',
    role: 'lawyer',
    title: 'Senior Legal Counsel - High Court Bar',
    avatarBg: 'bg-emerald-600 text-white',
    badgeText: 'Civil & Constitutional Specialist'
  },
  {
    id: 'l2',
    email: 'adv.vikram@nyaya.in',
    password: 'lawyer123',
    name: 'Adv. Vikramaditya Rao',
    role: 'lawyer',
    title: 'Corporate & Commercial Advocate',
    avatarBg: 'bg-teal-600 text-white',
    badgeText: 'Property & Contract Dispute Law'
  },
  {
    id: 'l3',
    email: 'adv.ananya@nyaya.in',
    password: 'lawyer123',
    name: 'Adv. Ananya Roy',
    role: 'lawyer',
    title: 'Senior Advocate - Labour & Human Rights',
    avatarBg: 'bg-cyan-600 text-white',
    badgeText: 'Labour & Employment Law'
  },

  // ── Litigants ────────────────────────────────────────────────
  {
    id: 'u1',
    email: 'rajesh.sharma@gmail.com',
    password: 'litigant123',
    name: 'Rajesh Sharma',
    role: 'litigant',
    title: 'Petitioner - Labour & Property Suits',
    avatarBg: 'bg-indigo-600 text-white',
    badgeText: '3 Active Cases Filed'
  },
  {
    id: 'u2',
    email: 'meena.desai@gmail.com',
    password: 'litigant123',
    name: 'Meena Desai',
    role: 'litigant',
    title: 'Respondent - Commercial Dispute',
    avatarBg: 'bg-rose-600 text-white',
    badgeText: '2 Pending Court Proceedings'
  },
  {
    id: 'u3',
    email: 'vikram.verma@gmail.com',
    password: 'litigant123',
    name: 'Vikram Verma',
    role: 'litigant',
    title: 'Petitioner - Land & Contract Matter',
    avatarBg: 'bg-blue-600 text-white',
    badgeText: '1 Judgment Reserved'
  }
];
