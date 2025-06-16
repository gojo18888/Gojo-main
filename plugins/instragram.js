const { cmd } = require("../lib/command");
const axios = require("axios");

cmd({
    pattern: 'ig',
    react: '🪂',
    alias: 'insta',
    desc: 'Download instagram videos/image.',
    type: 'downloader',
}, async (message, match, client) => {
    try {
        const url = match || message.reply_message?.text;
        if (!url) return await message.reply("Please provide a valid Instagram URL.");

        const api = `https://api.eypz.ct.ws/api/dl/instagram?url=${url}`;
        const res = await axios.get(api);

        const mediaList = res.data?.result?.data;
        if (!mediaList || mediaList.length === 0) {
            return await message.reply("No media found.");
        }

        for (const media of mediaList) {
            if (media.url) {

                await message.sendFile(media.url, {}, { quoted: message.data });
            }
        }

    } catch (err) {
        console.error(err);
        await client.sendMessage(client.user.id, { text: "Error: " + err.message });
    }
});
cmd({
    pattern: 'facebook',
    desc: 'Download facebook videos.',
    type: 'downloader',
}, async (message, match, client) => {
    try {
        const url = match || message.reply_message.text;
        if (!url) {
            return await message.reply("Please provide a valid facebook URL.");
        }

        const fbApi = `https://api.siputzx.my.id/api/d/igdl?url=${url}`;
        const res = await fetch(fbApi);
        if (!res.ok) {
            return await message.reply("Please try again.");
        }

        const data = await res.json();
        const igmedia = data.data;

        if (igmedia && igmedia.length > 0) {
            let counter = 0;
            for (const media of igmedia) {
                if (counter >= 10) break;
                const mediaurl = media.url;
                await message.sendFile(mediaurl);
                counter++;
            }
        } else {
            await message.reply("No media found for the provided URL.");
        }
    } catch (error) {
        console.error(error);
        await message.reply(" 'error' ");
    }
});
