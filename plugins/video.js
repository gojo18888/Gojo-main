// darama.js – YouTube search & download with size-aware sending
// deps: yt-search, @distube/ytdl-core     ⇒  npm i yt-search @distube/ytdl-core
const config = require('../settings')
const { cmd } = require('../lib/command');
const yts     = require('yt-search');
const ytdl    = require('@distube/ytdl-core');
const axios = require('axios');// ← fork
const MB      = 1024 * 1024;

let conn;                         // current Baileys connection
const listCache = {};             // { msgId : [videos] }

cmd({
  pattern  : 'yt',
  alias    : ['video2'],
  desc     : 'Download YouTube videos (≤1000 MB)',
  react    : '🎥',
  category : 'download',
  filename : __filename
}, async (c, mek, m, { from, args, reply }) => {
  conn = c;
  const query = args.join(' ').trim();
  if (!query) return reply('Send a YouTube link **or** keywords.');

  // direct URL → download
  if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(query))
    return downloadVideo(query, mek, from, reply);

  // ── keyword search ──
  await conn.sendMessage(from, { react:{ text:'🔍', key:mek.key } });
  const { videos } = await yts({ query, pages: 1 });
  if (!videos.length) {
    await conn.sendMessage(from, { react:{ text:'❌', key:mek.key } });
    return reply('No results.');
  }

  // build list
  const listTxt = [
    `*🎥 Results for:* \`${query}\``,
    '────────────────',
    ...videos.slice(0,10).map((v,i)=>
       `${i+1}. ${v.title.slice(0,55)} | ${v.timestamp}`),
    '────────────────',
    'Reply with a *number* to download.'
  ].join('\n');

  const sent = await conn.sendMessage(
    from,
    { image:{ url: videos[0].thumbnail }, caption:listTxt },
    { quoted: mek }
  );
  listCache[sent.key.id] = videos.slice(0,10);      // keep top-10
  await conn.sendMessage(from, { react:{ text:'✅', key:sent.key } });
});

// ────────────────────────────────────────────────────────────
// size-aware downloader
async function downloadVideo(url, mek, jid, reply){
  try{
    await conn.sendMessage(jid,{ react:{ text:'⏬', key:mek.key }});

    const info   = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, {
      quality: '18', filter:'audioandvideo'   // mp4 360p
    });
    if (!format.url) throw 'No downloadable format';

    const bytes = +format.contentLength || 0;
    const mb    = bytes / MB;

    // >100 MB too big for WhatsApp
    if (mb && mb > 1000){
      return reply(
        `❌ *File too large* (${mb.toFixed(1)} MB > 1000 MB)\n` +
        'Download here:\n' + format.url
      );
    }

    const caption =
      `*🎥 ${info.videoDetails.title}*\n` +
      (mb?`📦 ${mb.toFixed(1)} MB • `:'') +
      `⏱ ${info.videoDetails.lengthSeconds}s`;

    if (mb && mb <= 16){            // inline playable
      await conn.sendMessage(jid,{
        video:{ url:format.url }, mimetype:'video/mp4', caption
      },{ quoted: mek });
    }else{                          // document attachment
      await conn.sendMessage(jid,{
        document:{ url:format.url },
        mimetype:'video/mp4',
        fileName: info.videoDetails.title + '.mp4',
        caption
      },{ quoted: mek });
    }

    await conn.sendMessage(jid,{ react:{ text:'✅', key:mek.key }});
  }catch(err){
    console.error(err);
    await conn.sendMessage(jid,{ react:{ text:'❌', key:mek.key }});
    reply('Download failed – pick another video or try later.');
  }
}

// ────────────────────────────────────────────────────────────
// one-time listener for numeric replies
if (!global.__daramaReply){
  global.__daramaReply = true;
  conn?.ev.on('messages.upsert', async ({ messages })=>{
    const msg = messages?.[0]; if(!msg?.message) return;
    const txt = msg.message.conversation || msg.message.extendedTextMessage?.text;
    const qid = msg.message.extendedTextMessage?.contextInfo?.stanzaId;
    if (!qid || !listCache[qid]) return;

    const n = parseInt(txt.trim(),10);
    if (isNaN(n) || n<1 || n>listCache[qid].length){
      return conn.sendMessage(msg.key.remoteJid,{ react:{ text:'❌', key:msg.key }});
    }
    downloadVideo(listCache[qid][n-1].url, msg, msg.key.remoteJid, ()=>{});
  });
}
