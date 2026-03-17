
export const STATIC_PAGES = [
  'about-us',
  'contact-us',
  'help-support',
  'terms-condition',
  'privacy-policy',
];


export interface IStaticPage {
  slug: string; // about-us, contact-us, etc.
  title: string;
  content: string;
}