const https = require('https');

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    https.get(url, { headers: { 'User-Agent': 'JDM/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const a = json.address || {};
          const parts = [
            a.neighbourhood || a.suburb || a.quarter || a.hamlet,
            a.road || a.pedestrian || a.footway,
            a.village || a.town || a.city_district,
            a.city || a.county,
            a.state,
            a.postcode,
          ].filter(Boolean);
          resolve(parts.length ? parts.join(', ') : (json.display_name || `${lat},${lng}`));
        } catch { resolve(`${lat},${lng}`); }
      });
    }).on('error', () => resolve(`${lat},${lng}`));
  });
}

module.exports = { haversineDistance, reverseGeocode };
