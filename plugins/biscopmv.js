/**
 * plugins/biscopmv.js
 * Baiscopes.lk search + download (reply UI, with fallback link-scraper)
 * Requires: axios, node-cache, cheerio      (npm i axios node-cache cheerio)
 */

const { cmd }   = require('../lib/command');
const axios     = require('axios');
const NodeCache = require('node-cache');
const cheerio   = require('cheerio');

const BRAND = '✫☘𝐆𝐎𝐉𝐎 𝐌𝐎𝐕𝐈𝐄 𝐇𝐎𝐌𝐄☢️☘';
const cache = new NodeCache({ stdTTL: 300 });

/* ─── helpers ─────────────────────────────────────────────────────── */

async function searchBais(query) {
  const { data } = await axios.get(
    `https://darksadas-yt-baiscope-search.vercel.app/?query=${encodeURIComponent(query)}`,
    { timeout: 10000 }
  );
  const arr = data?.data;
  if (!Array.isArray(arr) || !arr.length) throw Error('no results');
  return arr.map((v, i) => ({
    n: i + 1,
    title: v.title,
    year : v.year,
    link : v.link,
    img  : v.link.replace('-150x150', ''),
  }));
}

async function infoBais(url) {
  const { data } = await axios.get(
    `https://darksadas-yt-baiscope-info.vercel.app/?url=${encodeURIComponent(url)}&apikey=pramashi`,
    { timeout: 10000 }
  );
  const m = data?.data;
  const links = data?.dl_links || [];
  if (!m || !links.length) throw Error('missing data');
  return {
    title : m.title,
    date  : m.date,
    imdb  : m.imdb,
    runtime: m.runtime,
    genres : m.genres.join(', '),
    img   : url.replace('-150x150', ''),
    links : links.map((v,i)=>({ n:i+1, q:v.quality, size:v.size, url:v.link })),
  };
}

/* scrape baiscopes.lk/links/xxxx page for final href / meta refresh */
async function scrapeRedirect(pageUrl) {
  try {
    const { data } = await axios.get(pageUrl, { timeout: 10000, maxRedirects: 0, validateStatus: s => s<400 });
    const $ = cheerio.load(data);

    const meta = $('meta[http-equiv="refresh"]').attr('content');
    if (meta) {
      const m = meta.match(/URL=(.+)/i);
      if (m) return m[1].trim();
    }
    const a = $('a[href*="http"]').first().attr('href');
    return a || '';
  } catch { return ''; }
}

/* ─── main command ──────────────────────────────────────────────── */

cmd(
  {
    pattern : 'baiscopes',
    react   : '🔎',
    desc    : 'Search & download from Baiscopes.lk',
    category: 'media',
    filename: __filename,
  },
  async (conn, mek, m, { from, q }) => {
    if (!q) return await conn.sendMessage(from,{text:'*Usage:* `.baiscopes <keyword>`'},{quoted:mek});

    try {
      /* 1️⃣ search */
      const key = `bais_${q.toLowerCase()}`;
      let movies = cache.get(key) || await searchBais(q);
      cache.set(key, movies);

      let cap='*🎬 BAISCOPES RESULTS*\n\n';
      movies.forEach(v=>cap+=`🎥 ${v.n}. *${v.title}* (${v.year})\n\n`);
      cap+='🔢 Reply number • "done" to cancel';

      const listMsg = await conn.sendMessage(from,{image:{url:movies[0].img},caption:cap},{quoted:mek});

      const waiting = new Map();

      const handler = async ({messages})=>{
        const msg=messages?.[0];
        if(!msg?.message?.extendedTextMessage) return;
        const body=msg.message.extendedTextMessage.text.trim();
        const replyId=msg.message.extendedTextMessage.contextInfo?.stanzaId;

        if(body.toLowerCase()==='done'){
          conn.ev.off('messages.upsert',handler); waiting.clear();
          return await conn.sendMessage(from,{text:'✅ Cancelled.'},{quoted:msg});
        }

        /* movie pick */
        if(replyId===listMsg.key.id){
          const mv=movies.find(v=>v.n===parseInt(body));
          if(!mv) return await conn.sendMessage(from,{text:'❌ Invalid number.'},{quoted:msg});

          let info; try{info=await infoBais(mv.link);}catch(e){
            return await conn.sendMessage(from,{text:`❌ ${e.message}`},{quoted:msg});
          }

          let detCap=`*🎬 ${info.title}*\n🗓 ${info.date}\n⭐ ${info.imdb}\n⏱ ${info.runtime}\n🎭 ${info.genres}\n\n📥 Choose quality:\n\n`;
          info.links.forEach(l=>detCap+=`${l.n}. *${l.q}* (${l.size})\n`);
          detCap+='\n🔢 Reply number • "done" to cancel';

          const qualMsg=await conn.sendMessage(from,{image:{url:info.img},caption:detCap},{quoted:msg});
          waiting.set(qualMsg.key.id,{info});
          return;
        }

        /* quality pick */
        if(waiting.has(replyId)){
          const {info}=waiting.get(replyId);
          const pick=info.links.find(l=>l.n===parseInt(body));
          if(!pick) return await conn.sendMessage(from,{text:'❌ Wrong number.'},{quoted:msg});

          const size=parseFloat(pick.size)*(/gb/i.test(pick.size)?1:1/1024);
          if(size>2) return await conn.sendMessage(from,{text:`⚠️ File >2 GB. Link:\n${pick.url}`},{quoted:msg});

          let direct='';
          /* try API first */
          try{
            const {data}=await axios.get(`https://darksadas-yt-baiscope-dl.vercel.app/?url=${encodeURIComponent(pick.url)}&apikey=pramashi`,{timeout:10000});
            direct=data?.data?.dl_link?.trim()||'';
          }catch{}

          /* fallback scrape */
          if(!direct) direct=await scrapeRedirect(pick.url);

          if(!direct){
            return await conn.sendMessage(from,{text:`❌ Couldn't get direct link.\n🔗 ${pick.url}`},{quoted:msg});
          }

          const fname=`${info.title.replace(/[\\/:*?"<>|]/g,'')} • ${pick.q}.mp4`;

          try{
            await conn.sendMessage(from,{react:{text:'⬇️',key:msg.key}});
            await conn.sendMessage(from,{
              document:{url:direct},
              mimetype:'video/mp4',
              fileName:fname,
              caption:`🎬 *${info.title}*\n📊 ${pick.q} • ${pick.size}\n\n🔥 ${BRAND}`,
            },{quoted:msg});
            await conn.sendMessage(from,{react:{text:'✅',key:msg.key}});
          }catch{
            await conn.sendMessage(from,{text:`❌ Failed to send.\n🔗 ${direct}`},{quoted:msg});
          }

          conn.ev.off('messages.upsert',handler); waiting.clear();
        }
      };

      conn.ev.on('messages.upsert',handler);
    }catch(e){
      await conn.sendMessage(from,{text:`❌ Error: ${e.message}`},{quoted:mek});
    }
  }
);