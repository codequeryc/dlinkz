export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { XATA_API_KEY, XATA_URL } = process.env;

  try {
    // Step 1: Get record with uId: 'ohjx'
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
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const finalUrl = redirectCheck.url;

    // Step 3: Update Xata if final URL changed
    if (finalUrl !== originalUrl) {
      await fetch(`${XATA_URL}/tables/urls/data/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${XATA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: finalUrl }),
      });

      // Step 4: Re-fetch updated record from Xata
      record = await getRecord();
    }

    const updatedUrl = record.url;

    // Step 5: Append custom path
    const fullUrl = `${updatedUrl.replace(/\/$/, '')}/site-1.html?to-search=raid`;

    // Step 6: Fetch content from that full URL
    const finalFetch = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const contentType = finalFetch.headers.get('content-type');

    if (contentType.includes('application/json')) {
      const json = await finalFetch.json();
      return res.status(200).json({ url: fullUrl, contentType, content: json });
    } else if (contentType.includes('text') || contentType.includes('html')) {
      const text = await finalFetch.text();
      return res.status(200).json({ url: fullUrl, contentType, content: text });
    } else {
      return res.status(200).json({
        url: fullUrl,
        contentType,
        content: '[Non-textual content — not displayed]',
      });
    }

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch or update', details: err.message });
  }
}
