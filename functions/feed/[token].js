// Cloudflare Pages Function: serves the Ardito calendar as an .ics feed.
// URL: https://ardito.co.uk/feed/<token>.ics
// The token is checked inside Supabase, this file holds no secrets (the key below is the public dashboard key).

const SB = 'https://rtgqiblekgeriehyapnw.supabase.co';
const KEY = 'sb_publishable_Tm3TWwYt-M-GINjhWkdkqA_CM98dpzN';

const esc = s => String(s == null ? '' : s)
  .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// ICS lines must be folded at 75 bytes
function fold(line) {
  const enc = new TextEncoder();
  const parts = [];
  let cur = '', len = 0, limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (len + n > limit) { parts.push(cur); cur = ''; len = 0; limit = 74; }
    cur += ch; len += n;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

const compact = d => d.replace(/-/g, '');
function nextDay(d) {
  const t = new Date(d + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + 1);
  return compact(t.toISOString().slice(0, 10));
}
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

function titleFor(r) {
  let t = r.title || '';
  const first = r.artist ? r.artist.split(' ')[0] : '';
  if (r.type === 'release') t = 'RELEASE: ' + (first ? first + ': ' : '') + t;
  else if (r.type === 'deadline') t = 'DEADLINE: ' + t;
  if (r.status === 'posted' && r.type !== 'release') t = '(done) ' + t;
  return t;
}

function build(rows, all) {
  const now = stamp();
  const out = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ardito//Dashboard//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Ardito',
    'X-WR-CALDESC:Release dates, deadlines and pitch days from the Ardito dashboard',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H'
  ];
  for (const r of rows) {
    const date = String(r.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!all && r.type === 'post' && !r.artist) continue; // skip Ardito's own social posts by default
    const desc = [r.artist ? 'Artist: ' + r.artist : '', r.type ? 'Type: ' + r.type : '', r.details || '']
      .filter(Boolean).join('\n');
    out.push('BEGIN:VEVENT');
    out.push('UID:' + r.uid + '@ardito.co.uk');
    out.push('DTSTAMP:' + now);
    out.push('DTSTART;VALUE=DATE:' + compact(date));
    out.push('DTEND;VALUE=DATE:' + nextDay(date));
    out.push('SUMMARY:' + esc(titleFor(r)));
    if (desc) out.push('DESCRIPTION:' + esc(desc));
    out.push('TRANSP:TRANSPARENT');
    out.push('END:VEVENT');
  }
  out.push('END:VCALENDAR');
  return out.map(fold).join('\r\n') + '\r\n';
}

export async function onRequest({ params, request }) {
  const notFound = () => new Response('Not found', { status: 404 });
  try {
    const token = String(params.token || '').replace(/\.ics$/i, '');
    if (!/^[a-f0-9]{32,128}$/.test(token)) return notFound();
    const all = new URL(request.url).searchParams.get('all') === '1';

    const res = await fetch(SB + '/rest/v1/rpc/calendar_feed_data', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token })
    });
    if (!res.ok) return notFound();
    const rows = await res.json();
    if (!Array.isArray(rows)) return notFound();

    return new Response(build(rows, all), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="ardito.ics"',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex'
      }
    });
  } catch (e) {
    return notFound();
  }
}
