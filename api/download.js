const https = require('https');
const { Readable } = require('stream');

const PIXEL_ID = '2241743359726852';
const APK_URL = 'https://github.com/digitalkaushal123-ship-it/kalyan567/raw/refs/heads/main/50matka%20(19).apk';

function sendMetaEvent(req, eventId) {
  const accessToken = process.env.META_PIXEL_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('META_PIXEL_ACCESS_TOKEN is not configured; download will work but Conversions API event cannot be sent.');
    return Promise.resolve();
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : req.socket.remoteAddress;
  const event = {
      event_name: 'APKDownload',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      event_source_url: 'https://kalyan567.vercel.app/',
      user_data: {
        client_ip_address: clientIp,
        client_user_agent: req.headers['user-agent'] || ''
      },
      custom_data: {
        content_name: 'APK download response started'
      }
  };
  // Meta expects test_event_code at the top level of the Conversions API payload,
  // not inside the individual event object. Remove this variable after testing.
  const payloadData = { data: [event] };
  if (process.env.META_TEST_EVENT_CODE) {
    payloadData.test_event_code = process.env.META_TEST_EVENT_CODE;
  }
  const payload = JSON.stringify(payloadData);

  return new Promise((resolve) => {
    const url = new URL(`https://graph.facebook.com/v22.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(accessToken)}`);
    const request = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 4000
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          console.error('Meta Conversions API error:', response.statusCode, body);
        } else {
          console.log('Meta APKDownload event accepted:', body);
        }
        resolve();
      });
    });
    request.on('error', (error) => {
      console.error('Meta Conversions API request failed:', error.message);
      resolve();
    });
    request.on('timeout', () => request.destroy(new Error('Meta request timeout')));
    request.write(payload);
    request.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method Not Allowed');
  }

  const upstream = await fetch(APK_URL, { method: req.method });
  if (!upstream.ok) {
    console.error('APK upstream returned:', upstream.status);
    return res.status(502).send('APK download is temporarily unavailable. Please try again later.');
  }

  const eventId = `apk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // Send the server-side event only after the APK host has accepted the request
  // and returned a successful response. This records a successful response start,
  // not proof that the user's device saved the complete file.
  await sendMetaEvent(req, eventId);

  res.statusCode = 200;
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="50matka.apk"');
  res.setHeader('Cache-Control', 'no-store');
  const length = upstream.headers.get('content-length');
  if (length) res.setHeader('Content-Length', length);

  if (req.method === 'HEAD' || !upstream.body) return res.end();
  Readable.fromWeb(upstream.body).pipe(res);
};