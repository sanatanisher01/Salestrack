const https = require('https');

const RECAPTCHA_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'room-4cf55';
const RECAPTCHA_API_KEY = process.env.RECAPTCHA_API_KEY;

/**
 * Verify reCAPTCHA Enterprise token.
 * Returns score (0.0 - 1.0) or null if verification fails/skipped.
 * Score >= 0.5 is generally considered human.
 */
async function verifyRecaptcha(token, expectedAction = 'LOGIN') {
  if (!RECAPTCHA_API_KEY || !token) return null; // Skip if not configured

  return new Promise((resolve) => {
    const body = JSON.stringify({
      event: { token, expectedAction, siteKey: '6LeSOwQtAAAAACYLUtitLUhlxKbSbUMTSyae-TNY' },
    });

    const options = {
      hostname: 'recaptchaenterprise.googleapis.com',
      path: `/v1/projects/${RECAPTCHA_PROJECT_ID}/assessments?key=${RECAPTCHA_API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const score = json.riskAnalysis?.score ?? null;
          const valid = json.tokenProperties?.valid ?? false;
          const action = json.tokenProperties?.action ?? '';

          if (!valid) { resolve(0); return; }
          if (expectedAction && action !== expectedAction) { resolve(0); return; }
          resolve(score);
        } catch { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

module.exports = { verifyRecaptcha };
