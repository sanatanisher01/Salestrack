const RECAPTCHA_SITE_KEY = '6LeSOwQtAAAAACYLUtitLUhlxKbSbUMTSyae-TNY';

export async function getRecaptchaToken(action = 'LOGIN') {
  return new Promise((resolve) => {
    if (!window.grecaptcha?.enterprise) {
      resolve(null);
      return;
    }
    window.grecaptcha.enterprise.ready(async () => {
      try {
        const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action });
        resolve(token);
      } catch {
        resolve(null);
      }
    });
  });
}
