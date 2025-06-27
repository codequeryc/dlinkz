export default async function handler(req, res) {
  const target = req.query.url;

  if (!target) {
    return res.status(400).json({ error: 'Missing url param' });
  }

  try {
    // Follow redirect manually using fetch
    const response = await fetch(target, {
      method: 'GET',
      redirect: 'follow', // follow redirects
    });

    // Final redirected URL
    const finalUrl = response.url;

    res.status(200).json({ original: target, redirected: finalUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve URL', details: err.message });
  }
}
