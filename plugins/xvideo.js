const {cmd , commands} = require('../command');
const { fetchJson } = require('../functions');

cmd({
    pattern: "xvdl",
    alias: ["xdl"],
    react: "🔞",
    filename: __filename

},

async(conn, mek, m,{from, l, quoted, body, isCmd, umarmd, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try {
if (!q) return reply('*Please give me a link*');

const info =  await fetchJson(`https://apis-keith.vercel.app/download/porn?url=${q}`);
const xDowninfo = info.result.videoInfo;
let cap =`
✾━┫ *⚬Lααɾα-xᴠɪᴅᴇᴏ⚬* ┣━✾
              *ᴸ  ͣ  ͣ  ͬ  ͣ  ✻  ᴸ  ͣ  ͣ  ͬ  ͣ*

> ❍ *ᴛɪᴛʟᴇ :* ${xDowninfo.title}
> ❍ *ᴅᴜʀᴀᴛɪᴏɴ :* ${xDowninfo.duration}
> ❍ *ᴅᴇꜱᴄʀɪᴘᴛɪᴏɴ :* ${xDowninfo.description}

🔢 *ʀᴇᴘʟʏ ʙᴇʟᴏᴡ ᴛʜᴇ ɴᴜᴍʙᴇʀ ᴛᴏ*
*ᴅᴏᴡɴʟᴏᴀᴅ ᴠᴇᴅɪᴏ Qᴜᴀʟɪᴛʏ*

*1* | _ᴅᴏᴡɴʟᴏᴀᴅ ʟᴏᴡ_
*2* | _ᴅᴏᴡɴʟᴏᴀᴅ ʜɪɢʜ_
*3* | _ᴅᴏᴡɴʟᴏᴀᴅ ʜʟꜱ_

> Lααɾα-ᴍᴅ ✻
`;
let sadee = `*© ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴇᴇꜱʜᴀ ᴄᴏᴅᴇʀ · · ·*`;
const sentMsg = await conn.sendMessage(from, {
            image: { url: xDowninfo.thumbnail},
            caption: cap,
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
                const xDown = info.result.downloads;
                  await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
                    await conn.sendMessage(from, {
                        document: { url: xDown.lowQuality},
                        mimetype: "video/mp4",
                        fileName: `${xDowninfo.title}.mp4`, // Ensure `img.allmenu` is a valid image URL or base64 encoded image
                        caption: sadee
                                            
                      }, { quoted: mek });
                      await conn.sendMessage(from, { delete: sentMsg.key });
                
                } else if (messageType === '2') {
                const xDown = info.result.downloads;
                   await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
                    await conn.sendMessage(from, {
                        document: { url: xDown.highQuality},
                        mimetype: "video/mp4",
                        fileName: `${xDowninfo.title}.mp4`, // Ensure `img.allmenu` is a valid image URL or base64 encoded image
                        caption: sadee
                                            
                      }, { quoted: mek });
                     } else if (messageType === '3') {
                     const xDown = info.result.downloads;
                    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
                    await conn.sendMessage(from, {
                        document: { url: xDown.hlsStream},
                        mimetype: "video/mp4",
                        fileName: `${xDowninfo.title}.mp4`, // Ensure `img.allmenu` is a valid image URL or base64 encoded image
                        caption: sadee
                                            
                      }, { quoted: mek }); 
                }
            }
        });

} catch (e) {
        console.log(e);
        reply(`${e}`);
        }
    });  