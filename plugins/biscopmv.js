// commands/baiscopes.js

const axios = require('axios'); const { cmd } = require('../lib/command'); const NodeCache = require('node-cache');

const searchCache = new NodeCache({ stdTTL: 120, checkperiod: 150 }); const BRAND = '✫☘𝐆𝐎𝐉𝐎 𝐌𝐎𝐕𝐈𝐄 𝐇𝐎𝐌𝐄☢️☘';

cmd({ pattern: 'baiscopes', react: '🔎', desc: 'Search Sinhala dubbed movies from Baiscopes.lk', category: 'movie', filename: __filename, }, async (conn, mek, m, { from, q }) => { if (!q) { await conn.sendMessage(from, { text: '🔎 Usage: .baiscopes <year or title>' }, { quoted: mek }); return; }

try { const cacheKey = bais_${q.toLowerCase()}; let data = searchCache.get(cacheKey);

if (!data) {
  const res = await axios.get(`https://api.davidcyriltech.my.id/movies/baiscopes?query=${encodeURIComponent(q)}`);
  if (!res.data.status || !res.data.results.length) throw new Error('No results.');
  data = res.data.results;
  searchCache.set(cacheKey, data);
}

const films = data.map((f, i) => ({
  n: i + 1,
  title: f.title,
  link: f.link,
  image: f.image || null
}));

let txt = `*_📽️ BAISCOPES MOVIE SEARCH RESULT 🎬_*\n\n*🔍 සෙවුම:* ${q}\n\n`;
for (const f of films) txt += `${f.n}. ${f.title}\n`;
txt += '\n👉 *කරුණාකර* `.bdl <number>` *ලෙස යොමු කරන්න*';

const listMsg = await conn.sendMessage(
  from,
  { image: { url: films[0].image }, caption: txt },
  { quoted: mek }
);

const waiting = new Map();

const handler = async ({ messages }) => {
  const msg = messages?.[0];
  if (!msg?.message?.extendedTextMessage) return;
  const body = msg.message.extendedTextMessage.text.trim();
  const replyTo = msg.message.extendedTextMessage.contextInfo?.stanzaId;

  if (body.toLowerCase() === 'done') {
    conn.ev.off('messages.upsert', handler);
    waiting.clear();
    await conn.sendMessage(from, { text: '✅ Cancelled.' }, { quoted: msg });
    return;
  }

  if (replyTo === listMsg.key.id) {
    const film = films.find(f => f.n === parseInt(body));
    if (!film) {
      await conn.sendMessage(from, { text: '❌ Invalid number.' }, { quoted: msg });
      return;
    }

    const res = await axios.get(`https://api.davidcyriltech.my.id/movies/baiscopes/download?url=${encodeURIComponent(film.link)}`);
    if (!res.data.status) {
      await conn.sendMessage(from, { text: '❌ Download data not found.' }, { quoted: msg });
      return;
    }

    const links = res.data.movie.download_links || [];
    const picks = [];
    const sd = links.find(x => x.quality === 'SD 480p' && x.direct_download);
    const hd = links.find(x => x.quality === 'HD 720p' && x.direct_download);

    if (sd) picks.push({ n: 1, q: 'SD', ...sd });
    if (hd) picks.push({ n: 2, q: 'HD', ...hd });

    if (!picks.length) {
      await conn.sendMessage(from, { text: '❌ No quality options.' }, { quoted: msg });
      return;
    }

    let qTxt = `*🎬 ${film.title}*\n\n📥 Choose Quality:\n\n`;
    for (const p of picks) qTxt += `${p.n}. *${p.q}* (${p.size})\n`;
    qTxt += '\n🔢 Reply number • "done" to cancel';

    const qMsg = await conn.sendMessage(
      from,
      { image: { url: res.data.movie.thumbnail || film.image }, caption: qTxt },
      { quoted: msg }
    );

    waiting.set(qMsg.key.id, { film, picks });
    return;
  }

  if (waiting.has(replyTo)) {
    const { film, picks } = waiting.get(replyTo);
    const pick = picks.find(p => p.n === parseInt(body));
    if (!pick) {
      await conn.sendMessage(from, { text: '❌ Invalid quality.' }, { quoted: msg });
      return;
    }

    const sz = pick.size.toLowerCase();
    const gb = sz.includes('gb') ? parseFloat(sz) : parseFloat(sz) / 1024;

    if (gb > 2) {
      await conn.sendMessage(
        from,
        { text: `⚠️ Too large. Direct link:\n${pick.direct_download}` },
        { quoted: msg }
      );
      return;
    }

    const safe = film.title.replace(/[\\/:*?"<>|]/g, '');
    const fname = `${BRAND} • ${safe} • ${pick.q}.mp4`;

    try {
      await conn.sendMessage(
        from,
        {
          document: { url: pick.direct_download },
          mimetype: 'video/mp4',
          fileName: fname,
          caption: `🎬 *${film.title}*\n📊 Size: ${pick.size}\n\n🔥 ${BRAND}`,
        },
        { quoted: msg }
      );
      await conn.sendMessage(from, { react: { text: '✅', key: msg.key } });
    } catch {
      await conn.sendMessage(
        from,
        { text: `❌ Failed. Direct link:\n${pick.direct_download}` },
        { quoted: msg }
      );
    }
  }
};

conn.ev.on('messages.upsert', handler);

} catch (e) { await conn.sendMessage(from, { text: ❌ Error: ${e.message} }, { quoted: mek }); } });

