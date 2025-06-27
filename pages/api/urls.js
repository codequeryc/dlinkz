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

    const redirectCheck = await fetch(originalUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const finalUrl = redirectCheck.url;

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
    const baseUrl = updatedUrl.replace(/\/$/, '');
    const searchUrl = `${baseUrl}/site-1.html?to-search=raid`;

    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const searchHtml = await searchRes.text();

    const resultBlocks = [...searchHtml.matchAll(/<div class="A2">([\s\S]*?)<\/div>/g)];
    const results = [];

    for (const match of resultBlocks) {
      const block = match[1];

      const linkMatch = block.match(/<a href="([^"]+)"/);
      const relativeLink = linkMatch ? linkMatch[1] : null;

      const titleMatch = block.match(/<b>(.*?)<\/b>/);
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

        const downloadMatch = postHtml.match(/<div class="dlbtn">.*?<a[^>]+href="([^"]+)"[^>]*class="dl"[^>]*>/s);
        const download = downloadMatch ? downloadMatch[1] : null;

        results.push({
          title,
          link: fullPostUrl,
          thumbnail,
          download
        });

      } catch (err) {
        // Skip broken post pages
      }
    }

    // ✅ Remove items without download
    const filteredResults = results.filter(item => item.download);

    return res.status(200).json({
      source: searchUrl,
      total: filteredResults.length,
      results: filteredResults
    });

  } catch (err) {
    res.status(500).json({ error: 'Something went wrong', details: err.message });
  }
}
