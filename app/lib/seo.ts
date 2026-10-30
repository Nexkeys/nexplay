/** NexKeys Agency, who made NexPlay. Used for credits and contact links. */
export const AGENCY_URL = 'https://nexkeysagency.com.ng';

/** The public address of the site. Set VITE_SITE_URL in Vercel if you use a different domain. */
export const SITE = (import.meta.env.VITE_SITE_URL ?? 'https://nexplay.vercel.app').replace(/\/$/, '');

export function seo({ title, description, path, image = '/og.png', jsonLd }: { title: string; description: string; path: string; image?: string; jsonLd?: object }) {
  const url = `${SITE}${path}`;
  const tags: Record<string, unknown>[] = [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'NexPlay' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: `${SITE}${image}` },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: `${SITE}${image}` }
  ];
  if (jsonLd) tags.push({ 'script:ld+json': jsonLd });
  return tags;
}
