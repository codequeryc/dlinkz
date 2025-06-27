export default async function handler(req, res) {
  const { XATA_API_KEY, XATA_URL } = process.env;

  try {
    // 1. Get first record from Xata
    const xataResponse = await fetch(`${XATA_URL}/host/urls/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${XATA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pagination: { size: 1 },
      }),
    });

    const data = await xataResponse.json();
    const record = data.records?.[0];

    if (!record?.url) {
      return res.status(404).json({ error: 'No URL found in database' });
    }

    // 2. Fetch URL and follow redirect
    const response = await fetch(record.url, {
      method: 'GET',
      redirect: 'follow',
    });

    const finalUrl = response.url;

    // 3. Return result
    res.status(200).json({
      stored: record.url,
      redirected: finalUrl,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process', details: err.message });
  }
}
