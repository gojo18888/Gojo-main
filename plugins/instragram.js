const { cmd } = require('../lib/command');
const instagramGetUrl = require('instagram-url-direct');

cmd({
  pattern: 'ig',
  alias: ['instagram', 'igdl'],
  react: '📸',
  category: 'download',
  desc: 'Download Instagram photos/videos/reels',
  use: '.ig <instagram url>',
  filename: __filename
}, async (conn, m, mek, { q, from }) => {
  if (!q) return await conn.sendMessage(from, { text: "👉 Link එක දෙන්න!\nUsage: .ig <url>" }, { quoted: m });

  try {
    const info = await instagramGetUrl(q);
    if (!info || !info.url_list || info.url_list.length === 0) throw new Error('Media not found or private account');

    for (const url of info.url_list) {
      const isVideo = url.endsWith('.mp4');
      const message = isVideo
        ? { video: { url }, mimetype: 'video/mp4', caption: 'Downloaded with Gojo MD' }
        : { image: { url }, caption: 'Downloaded with Gojo MD' };

      await conn.sendMessage(from, message, { quoted: m });
    }
  } catch (e) {
    console.error(e);
    await conn.sendMessage(from, { text: "😕 Download failed. Link එක හරිද බලන්න / private account එකක්ද කියලා check කරන්න." }, { quoted: m });
  }
});
