// plugins/instragram.js
const { cmd } = require('../lib/command');
const { instagramGetUrl } = require('instagram-url-direct');

const BRAND = 'GOJO-MD';

cmd({
  pattern: 'ig',
  alias: ['instagram', 'igdl'],
  react: '📸',
  category: 'download',
  desc: 'Download Instagram photos / videos / reels',
  use: '.ig <instagram url>',
  filename: __filename
},
async (conn, m, mek, { q, from }) => {
  // --- helpers -------------------------------------------------------------
  const reply = (txt, opts = {}) =>
    conn.sendMessage(from, { text: txt, ...opts }, { quoted: m });

  const sendDoc = async (url, filename, mimetype, caption = '') =>
    conn.sendMessage(
      from,
      { document: { url }, fileName: filename, mimetype, caption },
      { quoted: m }
    );
  // -------------------------------------------------------------------------

  if (!q) return reply('👉 Link එක දෙන්න!\nUsage: .ig <url>');

  try {
    const info = await instagramGetUrl(q);
    if (!info?.url_list?.length) throw '⛔️ Media not found';

    for (const url of info.url_list) {
      const isVideo  = url.endsWith('.mp4');
      const ext      = isVideo ? 'mp4' : 'jpg';
      const mime     = isVideo ? 'video/mp4' : 'image/jpeg';
      const filename = `instagram_${BRAND}.${ext}`;
      const caption  = `Downloaded via *${BRAND}*`;

      await sendDoc(url, filename, mime, caption);
    }
  } catch (e) {
    console.error(e);
    reply('😕 Download failed. Link එක හරිද බලන්න / private account එකක්ද check කරන්න.');
  }
});
