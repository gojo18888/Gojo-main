const { cmd } = require('../lib/command');
const puppeteer = require('puppeteer');

cmd({
  pattern: "ig",
  alias: ["instagram", "igdl"],
  react: "📸",
  category: "download",
  desc: "Download Instagram photos / videos / reels with Gojo MD watermark",
  use: ".ig <instagram url>",
  filename: __filename,
},
async (conn, m, mek, { q, from }) => {
  if (!q) return await conn.reply(from, "👉 Link එක දෙන්න!\n\nUsage: .ig <url>", m);

  try {
    const videoUrl = await getInstagramVideoUrl(q);
    if (!videoUrl) throw "⛔️ Video/Media not found or private account";

    const caption = `Downloaded with Gojo MD\nLink: ${q}`;

    // Send video as document with caption (watermark style)
    await conn.sendFile(from, videoUrl, "instagram.mp4", caption, m, { asDocument: true });
  } catch (err) {
    console.error(err);
    await conn.reply(from, "😕 Download failed. Link එක හරිද බලන්න / private account එකක්ද කියලා check කරන්න.", m);
  }
});

async function getInstagramVideoUrl(url) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Evaluate page to get video URL or image URL fallback
    const mediaUrl = await page.evaluate(() => {
      // Video src tag
      const video = document.querySelector('video[src]');
      if (video) return video.src;

      // Meta og:video property
      const metaVideo = document.querySelector('meta[property="og:video"]');
      if (metaVideo) return metaVideo.content;

      // If no video, try image (photo post)
      const metaImage = document.querySelector('meta[property="og:image"]');
      if (metaImage) return metaImage.content;

      return null;
    });

    await browser.close();
    return mediaUrl;
  } catch (e) {
    await browser.close();
    throw e;
  }
}