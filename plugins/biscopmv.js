// commands/baiscopes.js
// Single-command, reply-based Baiscopes downloader
// Requirements: axios, node-cache

const { cmd }   = require('../lib/command');
const axios     = require('axios');
const NodeCache = require('node-cache');

const l = console.log;
const BRAND = '✫☘𝐆𝐎𝐉𝐎 𝐌𝐎𝐕𝐈𝐄 𝐇𝐎𝐌𝐄☢️☘';
const searchCache = new NodeCache({ stdTTL: 300 });

cmd(
  {
    pattern : 'baiscopes',
    react   : '🔎',
    desc    : 'Search & download from Baiscopes.lk (reply-based, no buttons)',
    category: 'media',
    filename: __filename,
  },
  async (conn, mek, m, { from, q }) => {
    if (!q) {
      await conn.sendMessage(
        from,
        { text: '*Usage:* `.baiscopes <keyword>`' },
        { quoted: mek }
      );
      return;
    }

    try {
      /* ─── 1️⃣  SEARCH ───────────────────────────────────────────── */
      const key  = `bais_${q.toLowerCase()}`;
      let result = searchCache.get(key);

      if (!result) {
        const r = await axios.get(
          `https://darksadas-yt-baiscope-search.vercel.app/?query=${encodeURIComponent(q)}`,
          { timeout: 10000 }
        );
        if (!r?.data?.data?.length) throw new Error('No results.');
        result = r.data.data;
        searchCache.set(key, result);
      }

      const movies = result.map((v, i) => ({
        n: i + 1,
        title: v.title,
        year:  v.year,
        link:  v.link,
        img:   v.link.replace('-150x150', ''),
      }));

      let cap = '*🎬 BAISCOPES RESULTS*\n\n';
      movies.forEach((m) => (cap += `🎥 ${m.n}. *${m.title}* (${m.year})\n\n`));
      cap += '🔢 Reply number  •  "done" to cancel';

      const listMsg = await conn.sendMessage(
        from,
        { image: { url: movies[0].img }, caption: cap },
        { quoted: mek }
      );

      /* ───  WAIT FOR REPLIES ─────────────────────────────────────── */
      const waiting = new Map();

      const handler = async ({ messages }) => {
        const msg = messages?.[0];
        if (!msg?.message?.extendedTextMessage) return;
        const body     = msg.message.extendedTextMessage.text.trim();
        const replyTo  = msg.message.extendedTextMessage.contextInfo?.stanzaId;

        if (body.toLowerCase() === 'done') {
          conn.ev.off('messages.upsert', handler);
          waiting.clear();
          await conn.sendMessage(from, { text: '✅ Cancelled.' }, { quoted: msg });
          return;
        }

        /* ─── 2️⃣  MOVIE PICK ─────────────────────────────────────── */
        if (replyTo === listMsg.key.id) {
          const mv = movies.find((m) => m.n === parseInt(body));
          if (!mv) {
            await conn.sendMessage(from, { text: '❌ Invalid number.' }, { quoted: msg });
            return;
          }

          try {
            const { data: det } = await axios.get(
              `https://darksadas-yt-baiscope-info.vercel.app/?url=${mv.link}&apikey=pramashi`,
              { timeout: 10000 }
            );
            const info  = det.data;
            const links = det.dl_links || [];
            if (!links.length) {
              await conn.sendMessage(from, { text: '❌ No links.' }, { quoted: msg });
              return;
            }

            const picks = links.map((v, i) => ({
              n: i + 1,
              q: v.quality,
              size: v.size,
              link: v.link,
            }));

            let detCap =
              `*🎬 ${info.title}*\n` +
              `🗓 ${info.date}\n` +
              `⭐ ${info.imdb}\n` +
              `⏱ ${info.runtime}\n` +
              `🎭 ${info.genres.join(', ')}\n\n` +
              '📥 Choose quality:\n\n';

            picks.forEach((p) => (detCap += `${p.n}. *${p.q}* (${p.size})\n`));
            detCap += '\n🔢 Reply number  •  "done" to cancel';

            const qualMsg = await conn.sendMessage(
              from,
              { image: { url: mv.img }, caption: detCap },
              { quoted: msg }
            );

            waiting.set(qualMsg.key.id, { mv, picks });
          } catch (e) {
            l(e);
            await conn.sendMessage(from, { text: '❌ Error fetching details.' }, { quoted: msg });
          }
          return;
        }

        /* ─── 3️⃣  QUALITY PICK & DOWNLOAD ───────────────────────── */
        if (waiting.has(replyTo)) {
          const { mv, picks } = waiting.get(replyTo);
          const pick = picks.find((p) => p.n === parseInt(body));
          if (!pick) {
            await conn.sendMessage(from, { text: '❌ Wrong number.' }, { quoted: msg });
            return;
          }

          try {
            const { data: dl } = await axios.get(
              `https://darksadas-yt-baiscope-dl.vercel.app/?url=${pick.link}&apikey=pramashi`,
              { timeout: 10000 }
            );
            const direct = dl?.data?.dl_link?.trim();
            if (!direct || !direct.includes('https://drive.baiscopeslk')) {
              await conn.sendMessage(from, { text: '❌ Dead link.' }, { quoted: msg });
              return;
            }

            /* size >2 GB ⇒ share link instead of file */
            const sz   = pick.size.toLowerCase();
            const gb   = sz.includes('gb') ? parseFloat(sz) : parseFloat(sz) / 1024;
            if (gb > 2) {
              await conn.sendMessage(
                from,
                { text: `⚠️ Too large (>2 GB). Direct link:\n${direct}` },
                { quoted: msg }
              );
              return;
            }

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
                jpegThumbnail: await (await axios.get(mv.img, { responseType: 'arraybuffer' })).data,
              },
              { quoted: msg }
            );
            await conn.sendMessage(from, { react: { text: '✅', key: msg.key } });
          } catch (e) {
            l(e);
            await conn.sendMessage(
              from,
              { text: `❌ Failed. Direct link:\n${pick.link}` },
              { quoted: msg }
            );
          }

          conn.ev.off('messages.upsert', handler);
          waiting.clear();
        }
      };

      conn.ev.on('messages.upsert', handler);
    } catch (e) {
      l(e);
      await conn.sendMessage.from, { text: `❌ Error: ${e.message}` }, { quoted: mek });
    }
  }
);
