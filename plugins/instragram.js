// plugins/instragram.js
const { cmd } = require('../lib/command');
const { instagramGetUrl } = require('instagram-url-direct');

const BRAND = 'GOJO-MD';              // ⬅️ watermark / brand tag

cmd({
  pattern: "ig",
  alias: ["instagram", "igdl"],
  react: "📸",
  category: "download",
  desc: "Download Instagram photos / videos / reels",
  use: ".ig <instagram url>",
  filename: __filename
},
async (conn, m, mek, { q, from }) => {
  if (!q) return await conn.reply(from,
    `👉 Link එක දෙන්න!\n\nUsage: .ig <url>`, m);

  try {
    const info = await instagramGetUrl(q);
    if (!info?.url_list?.length) throw "⛔️ Media not found";

    for (const url of info.url_list) {
      const isVideo   = url.includes('.mp4');
      const ext       = isVideo ? 'mp4' : 'jpg';
      const filename  = `instagram_${BRAND}.${ext}`;   // ← filename watermark
      const caption   = `Downloaded via *${BRAND}*`;   // ← caption watermark

      await conn.sendFile(from, url, filename, caption, m, { asDocument: true });
    }
  } catch (err) {
    console.error(err);
    await conn.reply(from,
      "😕 Download failed. Link එක හරිද බලන්න / private account එකක්ද කියලා check කරන්න.",
      m);
  }
});
