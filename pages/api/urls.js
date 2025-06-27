export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { XATA_API_KEY, XATA_URL } = process.env;

  try {
    const response = await fetch(`${XATA_URL}/tables/urls/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XATA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    const urls = (data.records || []).map(record => record.url).filter(Boolean);

    res.status(200).json(urls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch', details: err.message });
  }
}
