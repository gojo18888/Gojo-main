/**
 * plugins/subfilm.js
 * CineSubz search + download (single-command, reply-based UI)
 * Requirements: axios, node-cache
 */

const { cmd }   = require('../lib/command');
const axios     = require('axios');
const NodeCache = require('node-cache');

/* ─── helpers ─────────────────────────────────────────────────────────── */

function lkTime () {
  const now    = new Date(Date.now() + 5.5 * 3600_000);
  const day    = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  return `${day}, ${now.toISOString().split('T')[0]}, ${now.toISOString().split('T')[1].split('.')[0]} +0530`;
}

const cache = new NodeCache({ stdTTL: 300 });            // 5 min

/* ─── cineSubz API wrappers ───────────────────────────────────────────── */

async function searchCineSubz (query) {
  const url = `https://cinesubz-api-zazie.vercel.app/api/search?q=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, { timeout: 10000 });
  const arr = data?.result?.data;
  if (!Array.isArray(arr) || !arr.length) throw Error('no results');
  return arr.map((v,i) => ({
    n     : i + 1,
    title : v.title  || 'Unknown',
    year  : v.year   || 'N/A',
    link  : v.link   || '',
    img   : v.image?.replace('-150x150','') || '',
  }));
}

async function getMovieInfo (url) {
  const api = `https://cinesubz-api-zazie.vercel.app/api/movie?url=${encodeURIComponent(url)}`;
  const { data } = await axios.get(api, { timeout: 10000 });
  const m = data?.result?.data;
  if (!m || !m.dl_links?.length) throw Error('missing data');
  return {
    title   : m.title    || 'Unknown',
    imdb    : m.imdbRate || 'N/A',
    date    : m.date     || 'N/A',
    country : m.country  || 'N/A',
    runtime : m.duration || 'N/A',
    img     : m.image    || '',
    links   : m.dl_links.map((v,i)=>({
      n: i + 1,
      q: v.quality || '???',
      size: v.size || '?',
      url: v.link  || '',
    })),
  };
}

/* ─── main command ────────────────────────────────────────────────────── */

cmd(
  {
    pattern : 'sub',
    alias   : ['subfilm'],
    react   : '🎬',
    desc    : 'Search & download movies from CineSubz',
    category: 'movie',
    filename: __filename,
  },
  async (conn, mek, m, { from, q }) => {
    if (!q)
      return await conn.sendMessage(
        from,
        { text: '*Usage:* `.sub <movie name>`' },
        { quoted: mek }
      );

    try {
      /* 1️⃣  search */
      const key    = `sub_${q.toLowerCase()}`;
      let   movies = cache.get(key) || await searchCineSubz(q);
      cache.set(key, movies);

      let cap  = `✨ *SOLO-LEVELING MOVIE DOWNLOADER* ✨\n\n`;
      cap     += `🎥 *Results for* "${q}"\n📆 ${lkTime()}\n\n`;
      movies.forEach(mv => cap += `🎬 ${mv.n}. *${mv.title}* (${mv.year})\n\n`);
      cap     += '🔢 Reply number • "done" to cancel';

      const listMsg = await conn.sendMessage(
        from,
        { image: { url: movies[0].img || undefined }, caption: cap },
        { quoted: mek }
      );

      /* listener state */
      const waiting = new Map();

      const handler = async ({ messages }) => {
        const msg = messages?.[0];
        if (!msg?.message?.extendedTextMessage) return;

        const body    = msg.message.extendedTextMessage.text.trim();
        const replyId = msg.message.extendedTextMessage.contextInfo?.stanzaId;

        /* Cancel */
        if (body.toLowerCase() === 'done') {
          conn.ev.off('messages.upsert', handler);
          waiting.clear();
          return await conn.sendMessage(from, { text: '✅ Cancelled.' }, { quoted: msg });
        }

        /* 2️⃣  movie picked */
        if (replyId === listMsg.key.id) {
          const mv = movies.find(mv => mv.n === parseInt(body));
          if (!mv)
            return await conn.sendMessage(from, { text:'❌ Invalid number.' }, { quoted: msg });

          let info;
          try { info = await getMovieInfo(mv.link); }
          catch (e) {
            return await conn.sendMessage(
              from,
              { text: `❌ Error fetching details: ${e.message}` },
              { quoted: msg }
            );
          }

          let detCap =
            `*🎬 ${info.title}*\n` +
            `⭐ IMDb: ${info.imdb}\n` +
            `📅 Date: ${info.date}\n` +
            `🌍 Country: ${info.country}\n` +
            `⏱ Duration: ${info.runtime}\n\n` +
            '📥 *Available qualities:*\n\n';

          info.links.forEach(l => detCap += `${l.n}. *${l.q}* (${l.size})\n`);
          detCap += '\n🔢 Reply number • "done" to cancel';

          const qualMsg = await conn.sendMessage(
            from,
            { image: { url: info.img || mv.img || undefined }, caption: detCap },
            { quoted: msg }
          );

          waiting.set(qualMsg.key.id, { mv, info });
          return;
        }

        /* 3️⃣  quality picked */
        if (waiting.has(replyId)) {
          const { mv, info } = waiting.get(replyId);
          const pick = info.links.find(l => l.n === parseInt(body));
          if (!pick)
            return await conn.sendMessage(from, { text:'❌ Wrong number.' }, { quoted: msg });

          /* size guard >2 GB */
          const sz = pick.size.toLowerCase();
          const gb = sz.includes('gb') ? parseFloat(sz) : parseFloat(sz) / 1024;
          if (gb > 2)
            return await conn.sendMessage(
              from,
              { text:`⚠️ File >2 GB. Link:\n${pick.url}` },
              { quoted: msg }
            );

          /* send document or fallback */
          const fnameSafe = mv.title.replace(/[\\/:*?"<>|]/g,'');
          const fileName  = `${fnameSafe} • ${pick.q}.mp4`;

          try {
            await conn.sendMessage(from, { react:{text:'⬇️',key:msg.key} });
            await conn.sendMessage(
              from,
              {
                document: { url: pick.url },
                mimetype: 'video/mp4',
                fileName,
                caption:
                  `🎬 *${info.title}*\n` +
                  `📊 ${pick.q} • ${pick.size}\n\n` +
                  '🚀 *SOLO-LEVELING CINEMA*',
              },
              { quoted: msg }
            );
            await conn.sendMessage(from, { react:{text:'✅',key:msg.key} });
          } catch (e) {
            await conn.sendMessage(
              from,
              { text:`❌ Failed to send file.\n🔗 Link:\n${pick.url}` },
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