// commands/baiscopes.js
// Requirements: axios, node-cache, fetchJson helper already in your lib

const { cmd } = require('../lib/command');
const axios      = require('axios');
const NodeCache  = require('node-cache');

const searchCache  = new NodeCache({ stdTTL: 300 });
const detailCache  = new NodeCache({ stdTTL: 300 });

cmd({
  pattern : 'baiscopes',
  react   : '🔎',
  category: 'movie',
  desc    : 'Search / get / download from Baiscopes.lk with replies only',
  use     : '.baiscopes <query | number>',
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
  if (!q) return reply('*Use*: `.baiscopes Avatar`');

  const SKEY = `${from}-search`;
  const DKEY = `${from}-detail`;

  // ===== 3rd STEP – user sent quality number, we have dl links cached ====
  if (/^\d+$/.test(q.trim()) && detailCache.has(DKEY)) {
    const idx   = +q.trim() - 1;
    const pack  = detailCache.get(DKEY);           // { image, title, links:[] }
    const link  = pack.links[idx];
    if (!link) return reply('*Wrong number. Try again.*');

    try {
      const { data } = await axios.get(
        `https://darksadas-yt-baiscope-dl.vercel.app/?url=${link.link}&apikey=pramashi`
      );
      if (!data?.data?.dl_link?.includes('https://drive.baiscopeslk'))
        return reply('*This link is dead - choose another quality.*');

      await reply('_Uploading, please wait…_');
      await conn.sendMessage(from, {
        document : { url: data.data.dl_link.trim() },
        mimetype : 'video/mp4',
        fileName : `${pack.title}.mp4`,
        caption  : `🎬 *${pack.title}*  –  ${link.quality} / ${link.size}`,
        jpegThumbnail: await (await axios.get(pack.image, { responseType: 'arraybuffer' })).data
      });
    } catch (e) {
      console.log(e);
      return reply('*❌ Download failed. Retry or pick another quality.*');
    }
    return;
  }

  // ===== 2nd STEP – user sent movie number, we have search results cached ====
  if (/^\d+$/.test(q.trim()) && searchCache.has(SKEY)) {
    const idx  = +q.trim() - 1;
    const res  = searchCache.get(SKEY)[idx];
    if (!res) return reply('*Wrong number. Try again.*');

    try {
      const { data } = await axios.get(
        `https://darksadas-yt-baiscope-info.vercel.app/?url=${res.link}&apikey=pramashi`
      );
      const info = data.data;
      const links = data.dl_links || [];

      if (!links.length) return reply('*No download links found.*');

      let msg = `*${info.title || 'N/A'}*\n` +
                `🗓 ${info.date    || '-'}\n`   +
                `⭐ ${info.imdb    || '-'}\n`   +
                `⏱ ${info.runtime || '-'}\n`   +
                `🎭 ${info.genres?.join(', ') || '-'}\n\n` +
                '*Reply with quality number to download:*\n';

      links.forEach((v,i)=> msg += `*${i+1}.* ${v.quality} – ${v.size}\n`);
      reply(msg);

      detailCache.set(DKEY, {
        title : info.title,
        image : res.link.replace('-150x150',''),
        links
      });
    } catch(e){ console.log(e); reply('*❌ Error fetching details.*'); }
    return;
  }

  // ===== 1st STEP – user sent search text ================================
  try {
    const { data } = await axios.get(
      `https://darksadas-yt-baiscope-search.vercel.app/?query=${encodeURIComponent(q)}`
    );
    if (!data?.data?.length) return reply('*No results.*');

    let msg = '*🔍 BAISCOPES RESULTS*\n\n';
    data.data.forEach((v,i)=> msg += `*${i+1}.* ${v.title} (${v.year})\n`);
    msg += '\n_Reply with movie number to see details_';
    reply(msg);

    searchCache.set(SKEY, data.data);
    detailCache.del(DKEY);           // clear any old detail cache
  } catch(e){ console.log(e); reply('*❌ Error searching.*'); }
});
