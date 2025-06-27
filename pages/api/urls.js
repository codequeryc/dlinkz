export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { XATA_API_KEY, XATA_URL } = process.env;

  try {
    // Step 1: Fetch record with uId: 'ohjx'
    const fetchResponse = await fetch(`${XATA_URL}/tables/urls/query`, {
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

    const data = await fetchResponse.json();
    const record = data.records?.[0];

    if (!record) {
      return res.status(404).json({ error: 'Record with uId "ohjx" not found' });
    }

    const originalUrl = record.url;
    const recordId = record.id;

    // Step 2: Follow redirects to get final URL
    const redirectCheck = await fetch(originalUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0' // prevent bot blocks
      }
    });

    const finalUrl = redirectCheck.url;

    // Step 3: If redirected, update Xata
    if (finalUrl !== originalUrl) {
      await fetch(`${XATA_URL}/tables/urls/data/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${XATA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: finalUrl }),
      });
    }

    // Step 4: Get the content of the final URL
    const contentType = redirectCheck.headers.get('content-type');

    if (contentType.includes('application/json')) {
      const json = await redirectCheck.json();
      return res.status(200).json({ url: finalUrl, contentType, content: json });
    } else if (contentType.includes('text') || contentType.includes('html')) {
      const text = await redirectCheck.text();
      return res.status(200).json({ url: finalUrl, contentType, content: text });
    } else {
      return res.status(200).json({
        url: finalUrl,
        contentType,
        content: '[Non-textual content — not displayed]',
      });
    }

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch or update', details: err.message });
  }
}
