export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { XATA_API_KEY, XATA_URL } = process.env;
  const { uId } = req.query;

  if (!uId) return res.status(400).json({ error: 'Missing uId' });

  try {
    const response = await fetch(`${XATA_URL}/tables/urls/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XATA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          uId: uId, // match exact uId
        },
        page: { size: 1 } // we only need one match
      }),
    });

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ error: 'No match found' });
    }

    const record = data.records[0];
    res.status(200).json({ url: record.url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch', details: err.message });
  }
}
