export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { XATA_API_KEY, XATA_URL } = process.env;
  const headers = {
    'Authorization': `Bearer ${XATA_API_KEY}`,
    'Content-Type': 'application/json'
  };
  const uaHeaders = { 'User-Agent': 'Mozilla/5.0' };

  const getRecord = async () => {
    const res = await fetch(`${XATA_URL}/tables/urls/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ filter: { uId: 'ohjx' }, page: { size: 1 } })
    });
    const data = await res.json();
    return data.records?.[0];
  };

  const fetchHtml = async url => (await fetch(url, { headers: uaHeaders })).text();

  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query param ?q=' });

    let record = await getRecord();
    if (!record) return res.status(404).json({ error: 'uId "ohjx" not found' });

    const { id, url: originalUrl } = record;
    const finalUrl = (await fetch(originalUrl, { headers: uaHeaders, redirect: 'follow' })).url;

    if (finalUrl !== originalUrl) {
      await fetch(`${XATA_URL}/tables/urls/data/${id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ url: finalUrl })
      });
      record = await getRecord(); // Refresh after update
    }

    const baseUrl = record.url.replace(/\/$/, '');
    const searchUrl = `${baseUrl}/site-1.html?to-search=${encodeURIComponent(q)}`;
    const html = await fetchHtml(searchUrl);

    const blocks = [...html.matchAll(/<div class="A2">([\s\S]*?)<\/div>/g)];
    const results = [];

    for (const block of blocks) {
      const link = block[1].match(/<a href="([^"]+)"/)?.[1];
      const title = block[1].match(/<b>(.*?)<\/b>/)?.[1]?.replace(/<[^>]+>/g, '');
      if (!link) continue;

      const postHtml = await fetchHtml(`${baseUrl}${link}`);
      const thumb = postHtml.match(/<div class="movie-thumb">.*?<img[^>]+src="([^"]+)"/s)?.[1];
      const download = postHtml.match(/<div class="dlbtn">.*?<a[^>]+href="([^"]+)"[^>]*class="dl"/s)?.[1];

      if (download) results.push({ title, link: `${baseUrl}${link}`, thumbnail: thumb, download });
    }

    res.status(200).json({ source: searchUrl, total: results.length, results });

  } catch (err) {
    res.status(500).json({ error: 'Something went wrong', details: err.message });
  }
}
