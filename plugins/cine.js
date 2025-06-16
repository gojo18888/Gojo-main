/**

plugins/subfilm.js

CineSubz search + download with auto-download fallback */


const { cmd } = require('../lib/command'); const axios = require('axios'); const NodeCache = require('node-cache'); const cheerio = require('cheerio'); const fs = require('fs'); const path = require('path');

function lkTime () { const now = new Date(Date.now() + 5.5 * 3600_000); const day = now.toLocaleDateString('en-US',{weekday:'long',timeZone:'UTC'}); return ${day}, ${now.toISOString().split('T')[0]}, ${now.toISOString().split('T')[1].split('.')[0]} +0530; }

const cache = new NodeCache({ stdTTL: 300 });

async function searchCineSubz(q) { const { data } = await axios.get(https://cinesubz-api-zazie.vercel.app/api/search?q=${encodeURIComponent(q)}, { timeout: 10000 }); const arr = data?.result?.data; if (!Array.isArray(arr) || !arr.length) throw Error('no results'); return arr.map((v, i) => ({ n: i + 1, title: v.title, year: v.year, link: v.link, img: v.image?.replace('-150x150','') || '' })); }

async function getInfo(url) { const { data } = await axios.get(https://cinesubz-api-zazie.vercel.app/api/movie?url=${encodeURIComponent(url)}, { timeout: 10000 }); const m = data?.result?.data; if (!m?.dl_links?.length) throw Error('missing data'); return { title: m.title, imdb: m.imdbRate, date: m.date, country: m.country, runtime: m.duration, img: m.image, links: m.dl_links.map((v,i)=>({ n: i+1, q: v.quality, size: v.size, url: v.link })) }; }

async function resolveDirect(url) { try { const { headers } = await axios.head(url, { timeout: 10000, maxRedirects: 5 }); if (/video|octet-stream/i.test(headers['content-type']||'')) return url; } catch {}

try { const { data } = await axios.get(https://darksadas-yt-baiscope-dl.vercel.app/?url=${encodeURIComponent(url)}&apikey=pramashi, { timeout: 10000 }); if (data?.data?.dl_link) return data.data.dl_link.trim(); } catch {}

try { const { data: html } = await axios.get(url, { timeout: 10000, maxRedirects: 0, validateStatus:s=>s<400 }); const $ = cheerio.load(html); const meta = $('meta[http-equiv="refresh"]').attr('content'); if (meta) { const m = meta.match(/URL=(.+)/i); if (m) return m[1].trim(); } const a = $('a[href*="http"]').first().attr('href'); if (a) return a; } catch {}

return ''; }

cmd({ pattern : 'sub', alias   : ['subfilm'], react   : '🎬', desc    : 'Search & download movies from CineSubz', category: 'movie', filename: __filename, }, async (conn, mek, m, { from, q }) => { if (!q) return await conn.sendMessage(from, { text:'Usage: .sub <movie name>' }, { quoted: mek });

try { const listKey = sub_${q.toLowerCase()}; let movies = cache.get(listKey) || await searchCineSubz(q); cache.set(listKey, movies);

let cap = `✨ *SOLO-LEVELING MOVIE DOWNLOADER* ✨\n\n🎥 *Results for* "${q}"\n📆 ${lkTime()}\n\n`;
movies.forEach(v=>cap+=`🎬 ${v.n}. *${v.title}* (${v.year})\n\n`);
cap += '🔢 Reply number • "done" to cancel';

const listMsg = await conn.sendMessage(from, { image:{url:movies[0].img||undefined}, caption: cap }, { quoted: mek });
const waiting = new Map();

const handler = async ({messages}) => {
  const msg = messages?.[0];
  if (!msg?.message?.extendedTextMessage) return;
  const body = msg.message.extendedTextMessage.text.trim();
  const replyId = msg.message.extendedTextMessage.contextInfo?.stanzaId;

  if (body.toLowerCase()==='done') {
    conn.ev.off('messages.upsert',handler); waiting.clear();
    return await conn.sendMessage(from,{text:'✅ Cancelled.'},{quoted:msg});
  }

  if (replyId===listMsg.key.id) {
    const mv = movies.find(v=>v.n===parseInt(body));
    if (!mv) return await conn.sendMessage(from,{text:'❌ Invalid.'},{quoted:msg});

    let info;
    try{info = await getInfo(mv.link);}catch(e){
      return await conn.sendMessage(from,{text:`❌ ${e.message}`},{quoted:msg});
    }

    let det = `*🎬 ${info.title}*\n⭐ IMDb: ${info.imdb}\n📅 Date: ${info.date}\n🌍 Country: ${info.country}\n⏱ Duration: ${info.runtime}\n\n📥 *Available qualities:*\n\n`;
    info.links.forEach(l=>det+=`${l.n}. *${l.q}* (${l.size})\n`);
    det+='\n🔢 Reply number • "done" to cancel';

    const qualMsg = await conn.sendMessage(from, { image:{url:info.img||mv.img||undefined}, caption: det }, { quoted: msg });
    waiting.set(qualMsg.key.id,{info});
    return;
  }

  if (waiting.has(replyId)) {
    const {info} = waiting.get(replyId);
    const pick = info.links.find(l=>l.n===parseInt(body));
    if (!pick) return await conn.sendMessage(from,{text:'❌ Wrong number.'},{quoted:msg});

    const sizeGb = (/gb/i.test(pick.size)) ? parseFloat(pick.size) : parseFloat(pick.size)/1024;
    if (sizeGb > 2)
      return await conn.sendMessage(from,{text:`⚠️ File >2 GB. Link:\n${pick.url}`},{quoted:msg});

    await conn.sendMessage(from,{react:{text:'🔄',key:msg.key}});
    const direct = await resolveDirect(pick.url);

    if (!direct)
      return await conn.sendMessage(from,{text:`❌ Couldn't resolve link.\n🔗 ${pick.url}`},{quoted:msg});

    const fname = `${info.title.replace(/[\\/:*?"<>|]/g,'')} • ${pick.q}.mp4`;

    try {
      await conn.sendMessage(from, {
        document: { url: direct },
        mimetype: 'video/mp4',
        fileName: fname,
        caption: `🎬 *${info.title}*\n📊 ${pick.q} • ${pick.size}\n\n🚀 *SOLO-LEVELING CINEMA*`,
      }, { quoted: msg });

      await conn.sendMessage(from, { react: { text: '✅', key: msg.key } });

    } catch (e) {
      const tempPath = path.join(__dirname, '..', 'tmp', `${Date.now()}-${fname}`);
      try {
        const writer = fs.createWriteStream(tempPath);
        const res = await axios.get(direct, { responseType: 'stream' });
        res.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        await conn.sendMessage(from, {
          document: fs.readFileSync(tempPath),
          mimetype: 'video/mp4',
          fileName: fname,
          caption: `🎬 *${info.title}*\n📊 ${pick.q} • ${pick.size}\n\n🚀 *SOLO-LEVELING CINEMA*`,
        }, { quoted: msg });

        await conn.sendMessage(from, { react: { text: '✅', key: msg.key } });
        fs.unlinkSync(tempPath);

      } catch (err) {
        await conn.sendMessage(from, { text: `❌ Download & Upload failed.\n🔗 ${direct}` }, { quoted: msg });
      }
    }
    conn.ev.off('messages.upsert',handler); waiting.clear();
  }
};
conn.ev.on('messages.upsert',handler);

} catch (e) { await conn.sendMessage(from, { text:❌ Error: ${e.message} }, { quoted: mek }); } });

