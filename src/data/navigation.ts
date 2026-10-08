export interface NavLink {
  label: string;
  href: string;
}
export interface NavFolder {
  label: string;
  /** slug used for the folder (mobile menu panel id) */
  slug: string;
  items: NavLink[];
}
export type NavItem = NavLink | NavFolder;

export const isFolder = (item: NavItem): item is NavFolder => 'items' in item;

export const navigation: NavItem[] = [
  {
    label: 'Work With Us',
    slug: 'work-with-us',
    items: [
      { label: 'SEO Power Hour', href: '/seo-power-hour' },
      { label: 'Done-For-You SEO & AEO', href: '/done-for-you-seo-aeo' },
      { label: 'Digital PR', href: '/digital-pr' },
      { label: 'Paid Google Ads', href: '/paid-google-ads' },
      { label: 'Content Hub', href: '/content-hub' },
    ],
  },
  { label: 'Results', href: '/results' },
  {
    label: 'About',
    slug: 'about',
    items: [
      { label: 'Meet The Team', href: '/meet-the-team' },
      { label: 'Meet The Founder', href: '/meet-the-founder' },
    ],
  },
  { label: 'Contact', href: '/contact' },
];

export const headerCta: NavLink = { label: 'Free SEO Report Card', href: '/seo-report-card' };
