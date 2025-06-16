// darama.js  – reply-based YouTube video downloader
// deps: axios, ytsr, ytdl-core   ⇒   npm i axios ytsr ytdl-core

const { cmd } = require('../lib/command');
const axios   = require('axios');
const ytsr    = require('ytsr');
const ytdl    = require('ytdl-core');
const fs      = require('fs');
const { tmpdir } = require('os');
const path    = require('path');

let connRef = null;
const cache  = {};            // { searchMsgId: [ video objects ] }

cmd({
    pattern  : 'yt',
    alias    : ['video2'],
    desc     : 'Download YouTube videos',
    react    : '🎥',
    category : 'download',
    filename : __filename,
}, async (conn, mek, m, { from, args, reply }) => {
    connRef = conn;
    const q = args.join(' ').trim();
    if (!q) return reply('Send me a YouTube URL or keywords.');

    // direct URL?
    if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(q)) {
        return handleDownload(conn, mek, from, q, reply);
    }

    // keyword search
    await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });
    try {
        const filters = await ytsr.getFilters(q);
        const filter  = filters.get('Type').get('Video');
        const res     = await ytsr(filter.url, { pages: 1 });
        const vids    = res.items.slice(0, 10);

        if (!vids.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply('No videos found.');
        }

        let txt = `*🎥 Results for:* \`${q}\`\n━━━━━━━━━━━━━━━━━━\n`;
        vids.forEach((v, i) => {
            const title = v.title.length > 55 ? v.title.slice(0, 52) + '…' : v.title;
            txt += `${i + 1}. ${title}  |  ${v.duration}\n`;
        });
        txt += '━━━━━━━━━━━━━━━━━━\n↩️ _Reply with a number to download_';

        const sent = await conn.sendMessage(from, {
            image  : { url: vids[0].bestThumbnail.url },
            caption: txt,
            footer : '© GOJO MD',
            headerType: 4,
        }, { quoted: mek });

        if (sent?.key?.id) cache[sent.key.id] = vids;
        await conn.sendMessage(from, { react: { text: '✅', key: sent.key } });
    } catch (e) {
        console.error(e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('Error. Try later.');
    }
});

async function handleDownload(conn, mek, jid, url, reply) {
    try {
        await conn.sendMessage(jid, { react: { text: '⏬', key: mek.key } });

        const info = await ytdl.getInfo(url);
        const fmt  = ytdl.chooseFormat(info.formats, {
            quality: '18',        // 360p mp4 (usually < 30 MB)
            filter : 'audioandvideo'
        });
        if (!fmt.url) throw 'No downloadable format';

        const caption = `*🎥 ${info.videoDetails.title}*\n⏱ ${info.videoDetails.lengthSeconds}s  •  ${info.videoDetails.viewCount} views`;

        // if file is small enough, send directly
        const size = Number(fmt.contentLength || 0);
        if (size && size < 55 * 1024 * 1024) {
            await conn.sendMessage(jid, {
                video   : { url: fmt.url },
                mimetype: 'video/mp4',
                caption,
            }, { quoted: mek });
            await conn.sendMessage(jid, { react: { text: '✅', key: mek.key } });
            return;
        }

        // else stream-to-file then send as document (safer for big files)
        const file = path.join(tmpdir(), `${Date.now()}.mp4`);
        await new Promise((ok, bad) => {
            ytdl(url, { quality: '18' })
                .pipe(fs.createWriteStream(file))
                .on('finish', ok)
                .on('error', bad);
        });

        await conn.sendMessage(jid, {
            document: fs.readFileSync(file),
            mimetype: 'video/mp4',
            fileName: info.videoDetails.title + '.mp4',
            caption,
        }, { quoted: mek });
        fs.unlink(file, () => {});
        await conn.sendMessage(jid, { react: { text: '✅', key: mek.key } });
    } catch (err) {
        console.error(err);
        await conn.sendMessage(jid, { react: { text: '❌', key: mek.key } });
        reply('Failed. The video may be too large or unavailable.');
    }
}

// reply listener (once)
if (!global.__daramaListener) {
    global.__daramaListener = true;
    const { setTimeout } = require('timers');
    (function wait() {
        if (!connRef) return setTimeout(wait, 500);
        connRef.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg?.message) return;

            const txt = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const qid = msg.message.extendedTextMessage?.contextInfo?.stanzaId;
            if (!qid || !(qid in cache)) return;

            const n = parseInt(txt.trim(), 10);
            if (isNaN(n) || n < 1 || n > cache[qid].length) {
                await connRef.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
                return;
            }
            const vid = cache[qid][n - 1];
            handleDownload(connRef, msg, msg.key.remoteJid, vid.url, () => {});
        });
    })();
}
