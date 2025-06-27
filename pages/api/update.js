export default async function handler(req, res) {
  const { XATA_API_KEY, XATA_URL } = process.env;

  try {
    // 1. Get first record from "urls" table
    const xataResponse = await fetch(`${XATA_URL}/tables/urls/query`, {
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
      return res.status(404).json({ error: 'No URL found in table `urls`' });
    }

    const storedUrl = record.url;

    // 2. Fetch and follow redirect
    const response = await fetch(storedUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    const redirectedUrl = response.url;

    // 3. If changed, update in Xata
    if (redirectedUrl !== storedUrl) {
      const updateResponse = await fetch(`${XATA_URL}/tables/urls/data/${record.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${XATA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: redirectedUrl }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update URL in Xata');
      }

      return res.status(200).json({
        message: 'URL updated',
        old: storedUrl,
        new: redirectedUrl,
      });
    }

    // 4. No update needed
    return res.status(200).json({
      message: 'No update needed',
      url: storedUrl,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong', details: err.message });
  }
}
