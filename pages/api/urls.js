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
      body: JSON.stringify({
        filter: {
          uId: 'ohjx', // Fixed uId
        },
        page: { size: 1 }
      }),
    });

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ error: 'No record found for uId: ohjx' });
    }

    const record = data.records[0];
    res.status(200).json({ url: record.url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch', details: err.message });
  }
}
