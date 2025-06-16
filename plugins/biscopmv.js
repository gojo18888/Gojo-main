// plugins/biscopmv.js
// Single-command Baiscopes search + download (reply-based, no buttons)

const { cmd }   = require('../lib/command');
const axios     = require('axios');
const NodeCache = require('node-cache');

const BRAND  = '✫☘𝐆𝐎𝐉𝐎 𝐌𝐎𝐕𝐈𝐄 𝐇𝐎𝐌𝐄☢️☘';
const cache  = new NodeCache({ stdTTL: 300 });

cmd(
  {
    pattern : 'baiscopes',
    react   : '🔎',
    desc    : 'Search & download from Baiscopes.lk',
    category: 'media',
    filename: __filename,
  },
  async (conn, mek, m, { from, q }) => {
    if (!q)
      return await conn.sendMessage(
        from,
        { text: '*Usage:* `.baiscopes <keyword>`' },
        { quoted: mek }
      );

    try {
      /* ─── 1. SEARCH ───────────────────── */
      const key   = `bais_${q.toLowerCase()}`;
      let movies  = cache.get(key);

      if (!movies) {
        const r = await axios.get(
          `https://darksadas-yt-baiscope-search.vercel.app/?query=${encodeURIComponent(q)}`,
          { timeout: 10000 }
        );
        if (!r?.data?.data?.length) throw new Error('No results.');
        movies = r.data.data.map((v, i) => ({
          n: i + 1,
          title: v.title,
          year : v.year,
          link : v.link,
          img  : v.link.replace('-150x150', ''),
        }));
        cache.set(key, movies);
      }

      let txt = '*🎬 BAISCOPES RESULTS*\n\n';
      movies.forEach((m) => (txt += `🎥 ${m.n}. *${m.title}* (${m.year})\n\n`));
      txt += '🔢 Reply number • "done" to cancel';

      const listMsg = await conn.sendMessage(
        from,
        { image: { url: movies[0].img }, caption: txt },
        { quoted: mek }
      );

      /* ─── 2. WAIT FOR REPLIES ─────────── */
      const waiting = new Map();

      const handler = async ({ messages }) => {
        const msg = messages?.[0];
        if (!msg?.message?.extendedTextMessage) return;

        const body    = msg.message.extendedTextMessage.text.trim();
        const replyId = msg.message.extendedTextMessage.contextInfo?.stanzaId;

        if (body.toLowerCase() === 'done') {
          conn.ev.off('messages.upsert', handler);
          waiting.clear();
          return await conn.sendMessage(
            from,
            { text: '✅ Cancelled.' },
            { quoted: msg }
          );
        }

        /* ── 2-A. MOVIE PICK ─────────────── */
        if (replyId === listMsg.key.id) {
          const mv = movies.find((m) => m.n === parseInt(body));
          if (!mv)
            return await conn.sendMessage(
              from,
              { text: '❌ Invalid number.' },
              { quoted: msg }
            );

          try {
            const { data: det } = await axios.get(
              `https://darksadas-yt-baiscope-info.vercel.app/?url=${mv.link}&apikey=pramashi`,
              { timeout: 10000 }
            );
            const links = det.dl_links || [];
            if (!links.length)
              return await conn.sendMessage(
                from,
                { text: '❌ No links.' },
                { quoted: msg }
              );

            const picks = links.map((v, i) => ({
              n: i + 1,
              q: v.quality,
              size: v.size,
              link: v.link,
            }));

            let cap =
              `*🎬 ${det.data.title}*\n` +
              `🗓 ${det.data.date}\n` +
              `⭐ ${det.data.imdb}\n` +
              `⏱ ${det.data.runtime}\n` +
              `🎭 ${det.data.genres.join(', ')}\n\n` +
              '📥 Choose quality:\n\n';

            picks.forEach((p) => (cap += `${p.n}. *${p.q}* (${p.size})\n`));
            cap += '\n🔢 Reply number • "done" to cancel';

            const qualMsg = await conn.sendMessage(
              from,
              { image: { url: mv.img }, caption: cap },
              { quoted: msg }
            );

            waiting.set(qualMsg.key.id, { mv, picks });
          } catch {
            await conn.sendMessage(
              from,
              { text: '❌ Error fetching details.' },
              { quoted: msg }
            );
          }
          return;
        }

        /* ── 2-B. QUALITY PICK ───────────── */
        if (waiting.has(replyId)) {
          const { mv, picks } = waiting.get(replyId);
          const pick = picks.find((p) => p.n === parseInt(body));
          if (!pick)
            return await conn.sendMessage(
              from,
              { text: '❌ Wrong number.' },
              { quoted: msg }
            );

          try {
            const { data: dl } = await axios.get(
              `https://darksadas-yt-baiscope-dl.vercel.app/?url=${pick.link}&apikey=pramashi`,
              { timeout: 10000 }
            );
            const direct = dl?.data?.dl_link?.trim();
            if (!direct || !direct.includes('https://drive.baiscopeslk'))
              throw new Error('Dead link.');

            const sz  = pick.size.toLowerCase();
            const gb  = sz.includes('gb') ? parseFloat(sz) : parseFloat(sz) / 1024;
            if (gb > 2)
              return await conn.sendMessage(
                from,
                { text: `⚠️ Too large (>2 GB). Direct link:\n${direct}` },
                { quoted: msg }
              );

            const safe  = mv.title.replace(/[\\/:*?"<>|]/g, '');
            const fname = `${BRAND} • ${safe} • ${pick.q}.mp4`;

            await conn.sendMessage(
              from,
              {
                document: { url: direct },
                mimetype: 'video/mp4',
                fileName: fname,
                caption:
                  `🎬 *${mv.title}*\n📊 Size: ${pick.size}\n\n🔥 ${BRAND}`,
                jpegThumbnail: await (
                  await axios.get(mv.img, { responseType: 'arraybuffer' })
                ).data,
              },
              { quoted: msg }
            );
          } catch (e) {
            await conn.sendMessage(
              from,
              { text: `❌ Error: ${e.message}` },
              { quoted: msg }
            );
          }

          conn.ev.off('messages.upsert', handler);
          waiting.clear();
        }
      };

      conn.ev.on('messages.upsert', handler);
    } catch (e) {
      await conn.sendMessage(
        from,
        { text: `❌ Error: ${e.message}` },
        { quoted: mek }
      );
    }
  }
);
