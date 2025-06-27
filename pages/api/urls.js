export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { XATA_API_KEY, XATA_URL } = process.env;

  try {
    const getRecord = async () => {
      const response = await fetch(`${XATA_URL}/tables/urls/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${XATA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: { uId: 'ohjx' },
          page: { size: 1 }
        }),
      });
      const data = await response.json();
      return data.records?.[0];
    };

    let record = await getRecord();
    if (!record) return res.status(404).json({ error: 'Record with uId "ohjx" not found' });

    const originalUrl = record.url;
    const recordId = record.id;

    // Step 1: Follow redirect
    const redirectCheck = await fetch(originalUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const finalUrl = redirectCheck.url;

    // Step 2: Update if changed
    if (finalUrl !== originalUrl) {
      await fetch(`${XATA_URL}/tables/urls/data/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${XATA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: finalUrl }),
      });
      record = await getRecord();
    }

    const updatedUrl = record.url;
    const searchUrl = `${updatedUrl.replace(/\/$/, '')}/site-1.html?to-search=raid`;

    // Step 3: Fetch search result page
    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const searchHtml = await searchRes.text();

    // Step 4: Extract blocks <div class="A2">...</div>
    const baseUrl = updatedUrl.replace(/\/$/, '');
    const resultBlocks = [...searchHtml.matchAll(/<div class="A2">([\s\S]*?)<\/div>/g)];

    const results = [];

    for (const match of resultBlocks) {
      const block = match[1];

      const linkMatch = block.match(/<a href="([^"]+)"/);
      const titleMatch = block.match(/<b>(.*?)<\/b>/);

      const relativeLink = linkMatch ? linkMatch[1] : null;
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '') : 'No title';

      if (!relativeLink) continue;

      const fullPostUrl = `${baseUrl}${relativeLink}`;

      try {
        const postRes = await fetch(fullPostUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const postHtml = await postRes.text();

        const thumbMatch = postHtml.match(/<div class="movie-thumb">.*?<img[^>]+src="([^"]+)"/s);
        const thumbnail = thumbMatch ? thumbMatch[1] : null;

        results.push({
          title,
          link: fullPostUrl,
          thumbnail
        });

      } catch (err) {
        results.push({
          title,
          link: fullPostUrl,
          thumbnail: null,
          error: 'Failed to fetch post'
        });
      }
    }

    // Step 5: Final JSON response
    return res.status(200).json({
      from: searchUrl,
      total: results.length,
      results
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch or update', details: err.message });
  }
}
