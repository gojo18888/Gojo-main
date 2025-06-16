/**
 * plugins/biscopmv.js
 * Single-command, reply-based Baiscopes.lk movie search & downloader
 * Requirements: axios, node-cache
 */

const { cmd }   = require('../lib/command');
const axios     = require('axios');
const NodeCache = require('node-cache');

const BRAND  = '✫☘𝐆𝐎𝐉𝐎 𝐌𝐎𝐕𝐈𝐄 𝐇𝐎𝐌𝐄☢️☘';
const cache  = new NodeCache({ stdTTL: 300 });   // 5 min in-memory cache

cmd(
  {
    pattern : 'baiscopes',
    react   : '🔎',
    desc    : 'Search & download from Baiscopes.lk (reply-based UI)',
    category: 'media',
    filename: __filename,
  },
  async (conn, mek, m, { from, q }) => {
    /* ── 0. USAGE ───────────────────────────────────────────────── */
    if (!q)
      return await conn.sendMessage(
        from,
        { text: '*Usage:* `.baiscopes <keyword>`' },
        { quoted: mek }
      );

    try {
      /* ── 1. SEARCH ───────────────────────────────────────────── */
      const key    = `bais_${q.toLowerCase()}`;
      let   movies = cache.get(key);

      if (!movies) {
        const r = await axios.get(
          `https://darksadas-yt-baiscope-search.vercel.app/?query=${encodeURIComponent(q)}`,
          { timeout: 10000 }
        );
        if (!r?.data?.data?.length) throw new Error('No results.');
        movies = r.data.data.map((v, i) => ({
          n:     i + 1,
          title: v.title,
          year:  v.year,
          link:  v.link,
          img:   v.link.replace('-150x150', ''),
        }));
        cache.set(key, movies);
      }

      let caption = '*🎬 BAISCOPES RESULTS*\n\n';
      movies.forEach((m) => (caption += `🎥 ${m.n}. *${m.title}* (${m.year})\n\n`));
      caption += '🔢 Reply number • "done" to cancel';

      const listMsg = await conn.sendMessage(
        from,
        { image: { url: movies[0].img }, caption },
        { quoted: mek }
      );

      /* ── 2. AWAIT USER REPLIES ───────────────────────────────── */
      const waiting = new Map();

      const handler = async ({ messages }) => {
        const msg = messages?.[0];
        if (!msg?.message?.extendedTextMessage) return;

        const body    = msg.message.extendedTextMessage.text.trim();
        const replyId = msg.message.extendedTextMessage.contextInfo?.stanzaId;

        /* —— Cancel —— */
        if (body.toLowerCase() === 'done') {
          conn.ev.off('messages.upsert', handler);
          waiting.clear();
          return await conn.sendMessage(
            from,
            { text: '✅ Cancelled.' },
            { quoted: msg }
          );
        }

        /* —— 2-A. MOVIE CHOSEN —— */
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
                { text: '❌ No download links found.' },
                { quoted: msg }
              );

            const picks = links.map((v, i) => ({
              n:    i + 1,
              q:    v.quality,
              size: v.size,
              link: v.link,
            }));

            let pickCap =
              `*🎬 ${det.data.title}*\n` +
              `🗓 ${det.data.date}\n` +
              `⭐ ${det.data.imdb}\n` +
              `⏱ ${det.data.runtime}\n` +
              `🎭 ${det.data.genres.join(', ')}\n\n` +
              '📥 Choose quality:\n\n';

            picks.forEach((p) => (pickCap += `${p.n}. *${p.q}* (${p.size})\n`));
            pickCap += '\n🔢 Reply number • "done" to cancel';

            const qualMsg = await conn.sendMessage(
              from,
              { image: { url: mv.img }, caption: pickCap },
              { quoted: msg }
            );

            waiting.set(qualMsg.key.id, { mv, picks });
          } catch {
            await conn.sendMessage(
              from,
              { text: '❌ Error fetching movie details.' },
              { quoted: msg }
            );
          }
          return;
        }

        /* —— 2-B. QUALITY CHOSEN —— */
        if (waiting.has(replyId)) {
          const { mv, picks } = waiting.get(replyId);
          const pick = picks.find((p) => p.n === parseInt(body));
          if (!pick)
            return await conn.sendMessage(
              from,
              { text: '❌ Wrong number.' },
              { quoted: msg }
            );

          /* —— 3. SIZE GUARD (>2 GB) —— */
          const sizeStr = pick.size.toLowerCase();
          const sizeGb  = sizeStr.includes('gb')
            ? parseFloat(sizeStr)
            : parseFloat(sizeStr) / 1024;
          if (sizeGb > 2)
            return await conn.sendMessage(
              from,
              {
                text:
                  `⚠️ File >2 GB. Direct link (use browser / IDM):\n` +
                  `${pick.link}`,
              },
              { quoted: msg }
            );

          /* —— 4. CONVERT TO DIRECT LINK —— */
          let direct = '';
          try {
            const { data: dl } = await axios.get(
              `https://darksadas-yt-baiscope-dl.vercel.app/?url=${encodeURIComponent(
                pick.link
              )}&apikey=pramashi`,
              { timeout: 10000 }
            );
            direct = dl?.data?.dl_link?.trim() || '';
          } catch {
            /* ignore – we'll fallback */
          }

          // validate
          if (
            !direct ||
            !/^https?:\/\/(drive|docs|drive\.google|drive\.baiscopeslk|baiscopeslk\.org)/i.test(
              direct
            )
          ) {
            return await conn.sendMessage(
              from,
              {
                text:
                  `❌ Couldn't fetch a direct download.\n` +
                  `📎 Try manually:\n${pick.link}`,
              },
              { quoted: msg }
            );
          }

          /* —— 5. SEND FILE —— */
          const fnameSafe = mv.title.replace(/[\\/:*?"<>|]/g, '');
          const fileName  = `${BRAND} • ${fnameSafe} • ${pick.q}.mp4`;

          try {
            await conn.sendMessage(
              from,
              {
                document: { url: direct },
                fileName,
                mimetype: 'video/mp4',
                caption:
                  `🎬 *${mv.title}*\n` +
                  `📊 Size: ${pick.size}\n\n🔥 ${BRAND}`,
                jpegThumbnail: await (
                  await axios.get(mv.img, { responseType: 'arraybuffer' })
                ).data,
              },
              { quoted: msg }
            );
            await conn.sendMessage(from, { react: { text: '✅', key: msg.key } });
          } catch {
            await conn.sendMessage(
              from,
              {
                text:
                  `❌ Failed to send file.\n` +
                  `🔗 Direct link:\n${direct}`,
              },
              { quoted: msg }
            );
          }

          /* —— cleanup —— */
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
