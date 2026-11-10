// Cloudflare Pages Function: serves /epk/<slug>/ with proper link-preview tags.
// Link scrapers don't run JavaScript, so they used to hit 404.html. This returns the
// real EPK page (status 200) with the artist's name and image in the head.
// The key below is the same public key the EPK page already uses.

const SB = 'https://rtgqiblekgeriehyapnw.supabase.co';
const KEY = 'sb_publishable_Tm3TWwYt-M-GINjhWkdkqA_CM98dpzN';

const DEFAULT_IMAGE = '/images/ardito-share.jpg'; // add a 1200x630 Ardito image here
const SLUG_IMAGES = {
  india: '/images/india-button.jpg',
  omjine: '/images/omjine.jpg'
};

const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const slug = String(params.slug || '').toLowerCase();

  // Let real files through (epk-shared.js etc.)
  if (!slug || slug.includes('.')) return env.ASSETS.fetch(request);

  // The existing viewer page, unchanged. It reads the slug from the URL itself.
  const shell = await env.ASSETS.fetch(new URL('/epk/', url));

  let name = '', desc = '', content = {};
  try {
    const r = await fetch(
      `${SB}/rest/v1/published_epk_public?select=artist_name,content&public_slug=eq.${encodeURIComponent(slug)}&limit=1`,
      { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } }
    );
    if (r.ok) {
      const rows = await r.json();
      if (rows.length) {
        name = clean(rows[0].artist_name);
        content = rows[0].content || {};
      }
    }
  } catch (e) { /* fall back to generic tags */ }

  desc = clean(content.bio_short || content.short_bio || content.tagline || '').slice(0, 200);

  const title = name ? `${name} | Press Kit | Ardito` : 'Press Kit | Ardito';
  const description = desc || (name ? `Press kit for ${name}, managed by Ardito.` : 'Artist press kit, managed by Ardito.');
  const imgPath = SLUG_IMAGES[slug] || DEFAULT_IMAGE;
  const image = url.origin + imgPath;
  const canonical = `${url.origin}/epk/${encodeURIComponent(slug)}/`;

  const meta = (attr, key, val) =>
    `<meta ${attr}="${key}" content="${String(val).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`;

  const tags = [
    meta('name', 'description', description),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    meta('property', 'og:url', canonical),
    meta('property', 'og:image', image),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:image', image)
  ].join('\n');

  const rewritten = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(title); } })
    .on('head', { element(el) { el.append(tags, { html: true }); } })
    .transform(new Response(shell.body, { status: 200, headers: shell.headers }));

  const headers = new Headers(rewritten.headers);
  headers.set('Cache-Control', 'public, max-age=300');
  return new Response(rewritten.body, { status: 200, headers });
}
