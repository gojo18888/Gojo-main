const { cmd, commands } = require('../lib/command');
const yts = require('yt-search');
const { fetchJson } = require('../lib/functions');
const { ytsearch } = require('@dark-yasiya/yt-dl.js');

// Function to extract the video ID from youtu.be or YouTube links
function extractYouTubeId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|playlist\?list=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Function to convert any YouTube URL to a full YouTube watch URL
function convertYouTubeLink(q) {
    const videoId = extractYouTubeId(q);
    if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return q;
}

cmd({
    pattern: "song2",
    alias: "play2",
    desc: "To download songs.",
    react: "🎵",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
 if (!q) return reply("*`Need Title`*");     
 
 q = convertYouTubeLink(q);
        if (!q) return reply("*`Need YT_URL or Title`*");
        const search = await yts(q);
        const data = search.videos[0];
        const url = data.url;
 
let downMsg =`
*Downloading ...📥*
> Lααɾα-ᴍᴅ ✻
`;
let upMsg =`
*Uploading ...📤*
> Lααɾα-ᴍᴅ ✻
`;
const sentMsg = await conn.sendMessage(from, {
            image: { url: data.thumbnail},
            caption: downMsg,
  contextInfo: {
                mentionedJid: ['94779062397@s.whatsapp.net'], // specify mentioned JID(s) if any
                groupMentions: [],
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363192254044294@newsletter',
                    newsletterName: "Lααɾα-ᴍᴅ ✻",
                    serverMessageId: 999
                }
            }
     }, {quoted: mek});
 const down =  await fetchJson(`https://apis-keith.vercel.app/download/dlmp3?url=${url}`);
 await conn.sendMessage(from, {
      text: upMsg,
      edit: sentMsg.key,
    });
                const laraDown = down.result.downloadUrl; 
                    await conn.sendMessage(from, { 
                        audio: { url: laraDown }, 
                        mimetype: "audio/mpeg",
                        contextInfo: {
                            externalAdReply: {
                                title: "Lααɾα-ᴍᴅ",
                                body: "© ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴇᴇꜱʜᴀ ᴄᴏᴅᴇʀ",
                                mediaType: 1,
                                sourceUrl: url,
                                thumbnailUrl: down.result.image, // This should match the image URL provided above
                                renderLargerThumbnail: true,
                                showAdAttribution: true
                            }
                        }
                    
                    }, { quoted: mek });
                    await conn.sendMessage(from, { delete: sentMsg.key });
        
 } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});
cmd({ 
    pattern: "song3", 
    alias: "play3", 
    react: "🎶", 
    desc: "Download YouTube song", 
    category: "main", 
    use: '.song <query>', 
    filename: __filename 
}, async (conn, mek, m, { from, sender, reply, q }) => { 
    try {  
        q = convertYouTubeLink(q);
        if (!q) return reply("*`Need YT_URL or Title`*");
        const search = await yts(q);
        const data = search.videos[0];
        const url = data.url;
        const apiUrl = `https://apis.davidcyriltech.my.id/youtube/mp3?url=${encodeURIComponent(url)}`;
        
        const res = await fetch(apiUrl);
        const sadiya = await res.json();
        
        if (!sadiya?.result?.downloadUrl) return reply("Download failed. Try again later.");

    await conn.sendMessage(from, {
    audio: { url: sadiya.result.downloadUrl },
    mimetype: "audio/mpeg",
    fileName: `${song.title}.mp3`,
    contextInfo: {
        externalAdReply: {
            title: song.title.length > 25 ? `${song.title.substring(0, 22)}...` : song.title,
            body: "ꜱᴀᴅᴇᴇꜱʜᴀ ᴛʜᴀʀᴜᴍɪɴ",
            mediaType: 1,
            thumbnailUrl: song.thumbnail.replace('default.jpg', 'hqdefault.jpg'),
            sourceUrl: "https://whatsapp.com/channel/0029VaD5t8S1nozDfDDjRj2J",
            mediaUrl: "https://whatsapp.com/channel/0029VaD5t8S1nozDfDDjRj2J",
            showAdAttribution: true,
            renderLargerThumbnail: true
        }
    }
}, { quoted: mek });

    } catch (error) {
        console.error(error);
        reply("An error occurred. Please try again.");
    }
});

cmd({
    pattern: "song4",
    alias: "play4",
    desc: "To download songs.",
    react: "🎵",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        q = convertYouTubeLink(q);
        if (!q) return reply("*`Need YT_URL or Title`*");
        const search = await yts(q);
        const data = search.videos[0];
        const url = data.url;

        let desc = `
✾━┫ *⚬Lααɾα-ꜱᴏɴɢ⚬* ┣━✾
              *ᴸ  ͣ  ͣ  ͬ  ͣ  ✻  ᴸ  ͣ  ͣ  ͬ  ͣ*

> ❍ *ᴛɪᴛʟᴇ :* ${data.title}
> ❍ *ᴅᴜʀᴀᴛɪᴏɴ :* ${data.timestamp}
> ❍ *ᴠɪᴇᴡꜱ :* ${data.views}
> ❍ *ᴜᴘʟᴏᴀᴅ ᴏɴ :* ${data.ago}


🔢 *ʀᴇᴘʟʏ ʙᴇʟᴏᴡ ᴛʜᴇ ɴᴜᴍʙᴇʀ ᴛᴏ*
*ᴅᴏᴡɴʟᴏᴀᴅ ꜰʀᴏᴍᴀᴛ*

*1* | _ᴅᴏᴡɴʟᴏᴀᴅ ᴀᴜᴅɪᴏ 🎧_
*2* | _ᴅᴏᴡɴʟᴏᴀᴅ ᴅᴏᴄᴜᴍᴇɴᴛ  📁_
*3* | _ᴅᴏᴡɴʟᴏᴀᴅ ᴠᴏɪᴄᴇ 🎤_

> Lααɾα-ᴍᴅ ✻
`;
let info = `
*© ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴇᴇꜱʜᴀ ᴄᴏᴅᴇʀ · · ·*
 `;   
const sentMsg = await conn.sendMessage(from, {
            image: { url: data.thumbnail},
            caption: desc,
  contextInfo: {
                mentionedJid: ['94779062397@s.whatsapp.net'], // specify mentioned JID(s) if any
                groupMentions: [],
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363192254044294@newsletter',
                    newsletterName: "Lααɾα-ᴍᴅ ✻",
                    serverMessageId: 999
                }            
            }
     }, {quoted: mek});
     
     const messageID = sentMsg.key.id; // Save the message ID for later reference


        // Listen for the user's response
        conn.ev.on('messages.upsert', async (messageUpdate) => {
            const mek = messageUpdate.messages[0];
            if (!mek.message) return;
            const messageType = mek.message.conversation || mek.message.extendedTextMessage?.text;
            const from = mek.key.remoteJid;
            const sender = mek.key.participant || mek.key.remoteJid;

            // Check if the message is a reply to the previously sent message
            const isReplyToSentMsg = mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo.stanzaId === messageID;

            if (isReplyToSentMsg) {
                // React to the user's reply (the "1" or "2" message)

                // React to the upload (sending the file)
                

                if (messageType === '1') {
                    // Handle option 1 (Audio File)
                    await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key } });
                    const sadee =  await fetchJson(`https://dark-shan-yt.koyeb.app/download/ytmp3?url=${url}`);
                const downSadee = sadee.data.download;
                await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });  
                    await conn.sendMessage(from, { 
                        audio: { url: downSadee }, 
                        mimetype: "audio/mpeg" ,
                        contextInfo: {
                            externalAdReply: {
                                title: data.title,
                                body: data.videoId,
                                mediaType: 1,
                                sourceUrl: data.url,
                                thumbnailUrl: data.thumbnail, // This should match the image URL provided above
                                renderLargerThumbnail: true,
                                showAdAttribution: true
                            }
                        }
                    
                    }, { quoted: mek });
                    await conn.sendMessage(from, { delete: sentMsg.key });
                
                } else if (messageType === '2') {
                    // Handle option 2 (Document File)
                    await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key } });
                    const sadee =  await fetchJson(`https://dark-shan-yt.koyeb.app/download/ytmp3?url=${url}`);
                const downSadee = sadee.data.download;
                await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
                    await conn.sendMessage(from, {
                        document: { url: downSadee },
                        mimetype: "audio/mp3",
                        fileName: `${data.title}.mp3`, // Ensure `img.allmenu` is a valid image URL or base64 encoded image
                        caption: info,
                        contextInfo: {
                            externalAdReply: {
                                title: data.title,
                                body: "ꜱᴀᴅᴇᴇꜱʜᴀ ᴛʜᴀʀᴜᴍɪɴ",
                                mediaType: 1,
                                sourceUrl: data.url,
                                thumbnailUrl: data.thumbnail, // This should match the image URL provided above
                                renderLargerThumbnail: false,
                                showAdAttribution: true
                            }
                        }
                                            
                      }, { quoted: mek });
                      await conn.sendMessage(from, { delete: sentMsg.key });
                     } else if (messageType === '3') {
                     await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key } });
                    const sadee =  await fetchJson(`https://dark-shan-yt.koyeb.app/download/ytmp3?url=${url}`);
                const downSadee = sadee.data.download;
                await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });  
                    await conn.sendMessage(from, { 
                        audio: { url: downSadee }, 
                        mimetype: "audio/mpeg" ,
                        ptt: "true" ,
                        contextInfo: {
                            externalAdReply: {
                                title: data.title,
                                body: data.videoId,
                                mediaType: 1,
                                sourceUrl: data.url,
                                thumbnailUrl: data.thumbnail, // This should match the image URL provided above
                                renderLargerThumbnail: true,
                                showAdAttribution: true
                            }
                        }
                    
                    }, { quoted: mek });
                    await conn.sendMessage(from, { delete: sentMsg.key }); 
                }
            }
        });
        
 } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});  
