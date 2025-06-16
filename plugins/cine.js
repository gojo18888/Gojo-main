// commands/cine.js
const axios = require('axios');
const { cmd } = require('../lib/command');
const NodeCache = require('node-cache');

const BRAND = '✫☘𝐆𝐎𝐉𝐎 𝐌𝐎𝐕𝐈𝐄 𝐇𝐎𝐌𝐄☢️☘';
const searchCache = new NodeCache({ stdTTL: 120 });

cmd({
  pattern: "cine",
  react: "🎬",
  desc: "Search CineSubz movies/shows",
  category: "movie",
  filename: __filename
}, async (conn, m, mek, { q, from }) => {
  if (!q) return m.reply("🔎 Use: `.cine <movie or series>`");

  try {
    // 1. Check cache
    const cacheKey = `cine_${q.toLowerCase()}`;
    let data = searchCache.get(cacheKey);

    if (!data) {
      const url = `https://my-api-amber-five.vercel.app/api/cine/search?q=${encodeURIComponent(q)}`;
      const res = await axios.get(url);
      if (!res.data.status || !res.data.results?.length) return m.reply("❌ No results found.");
      data = res.data.results;
      searchCache.set(cacheKey, data);
    }

    // 2. Show results
    let text = '*🎬 CineSubz Results*\n\n';
    data.slice(0, 5).forEach((r, i) => {
      text += `🍿 ${i + 1}. *${r.title}*\n📅 Year: ${r.release_date || 'N/A'}\n🔗 ID: ${r.url}\n\n`;
    });
    text += '📩 Reply number to continue (type `done` to cancel)';

    const listMsg = await conn.sendMessage(from, {
      image: { url: data[0].thumbnail },
      caption: text
    }, { quoted: mek });

    const waiting = new Map();

    // 3. Handle replies
    const handler = async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg?.message?.extendedTextMessage) return;

      const replyText = msg.message.extendedTextMessage.text.trim();
      const replyTo = msg.message.extendedTextMessage.contextInfo?.stanzaId;

      if (replyText.toLowerCase() === 'done') {
        conn.ev.off('messages.upsert', handler);
        return conn.sendMessage(from, { text: '❎ Cancelled.' }, { quoted: msg });
      }

      // First Reply: Pick Movie
      if (replyTo === listMsg.key.id) {
        const picked = data[parseInt(replyText) - 1];
        if (!picked) return conn.sendMessage(from, { text: '❌ Invalid selection.' }, { quoted: msg });

        const epRes = await axios.get(`https://my-api-amber-five.vercel.app/api/cine/movie?url=${encodeURIComponent(picked.url)}`);
        const eps = epRes.data?.episodes;
        if (!eps?.length) return conn.sendMessage(from, { text: '❌ No episodes found.' }, { quoted: msg });

        let epText = `🎬 *${picked.title}*\n\n📺 Episodes:\n\n`;
        eps.slice(0, 10).forEach((e, i) => {
          epText += `🎞️ ${i + 1}. ${e.title}\n`;
        });
        epText += '\nReply number to download (type `done` to cancel)';

        const epMsg = await conn.sendMessage(from, {
          image: { url: picked.thumbnail },
          caption: epText
        }, { quoted: msg });

        waiting.set(epMsg.key.id, { picked, eps });
        return;
      }

      // Second Reply: Pick Episode
      if (waiting.has(replyTo)) {
        const { picked, eps } = waiting.get(replyTo);
        const ep = eps[parseInt(replyText) - 1];
        if (!ep) return conn.sendMessage(from, { text: '❌ Invalid episode.' }, { quoted: msg });

        const dlRes = await axios.get(`https://my-api-amber-five.vercel.app/api/cine/download?url=${encodeURIComponent(ep.url)}`);
        const sources = dlRes.data?.sources;
        if (!sources?.length) return conn.sendMessage(from, { text: '❌ No video sources.' }, { quoted: msg });

        const mp4 = sources.find(v => v.url && parseFloat(v.size) <= 100) || sources[0];
        if (!mp4.url) return conn.sendMessage(from, { text: '❌ No valid video.' }, { quoted: msg });

        const fileName = `${BRAND} • ${picked.title.replace(/[\\/:*?"<>|]/g, '')}.mp4`;
        const buffer = await axios.get(mp4.url, {
          responseType: 'arraybuffer',
          headers: { 'User-Agent': 'okhttp/4.5.0' }
        });

        await conn.sendMessage(from, {
          document: Buffer.from(buffer.data),
          mimetype: 'video/mp4',
          fileName,
          caption: `🎬 *${picked.title}*\n📺 ${ep.title}\n💾 Size: ${mp4.size}\n\n🔥 ${BRAND}`
        }, { quoted: msg });
      }
    };

    conn.ev.on('messages.upsert', handler);
  } catch (e) {
    console.error(e);
    m.reply(`❌ Error: ${e.message}`);
  }
});