const { Readable } = require('stream');

const APK_URL = 'https://github.com/digitalkaushal123-ship-it/kalyan567/raw/refs/heads/main/50matka%20(19).apk';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method Not Allowed');
  }

  let upstream;
  try {
    upstream = await fetch(APK_URL, { method: req.method });
  } catch (error) {
    console.error('APK upstream request failed:', error.message);
    return res.status(502).send('APK download is temporarily unavailable. Please try again later.');
  }

  if (!upstream.ok) {
    console.error('APK upstream returned:', upstream.status);
    return res.status(502).send('APK download is temporarily unavailable. Please try again later.');
  }

  // This endpoint only serves the APK. Meta tracking is handled by the browser Pixel.
  res.statusCode = 200;
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="50matka.apk"');
  res.setHeader('Cache-Control', 'no-store');
  const length = upstream.headers.get('content-length');
  if (length) res.setHeader('Content-Length', length);

  if (req.method === 'HEAD' || !upstream.body) return res.end();
  Readable.fromWeb(upstream.body).pipe(res);
};
