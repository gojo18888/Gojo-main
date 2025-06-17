const l = console.log;
const config = require('../settings');
const { cmd } = require('../lib/command');
const axios = require('axios');
const NodeCache = require('node-cache');

const searchCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
const activeSessions = new Map();

cmd({
  pattern: "cine",
  react: "🎬",
  desc: "Search and download Movies/TV Series",
  category: "media",
  filename: __filename,
}, async (conn, mek, m, { from, q }) => {
  const sender = mek.key.participant || mek.key.remoteJid;
  const userSessionKey = from + ":" + sender;

  if (activeSessions.has(userSessionKey)) {
    await conn.sendMessage(from, {
      text: "⚠️ You already have an active movie session.\nReply 'done' to cancel it."
    }, { quoted: mek });
    return;
  }

  if (!q) {
    await conn.sendMessage(from, {
      text: `*🎬 Movie / TV Series Search*\n\n📋 Usage: .movie <name>\n📝 Example: .movie Breaking Bad\n\n💡 Reply 'done' to stop the process`
    }, { quoted: mek });
    return;
  }

  activeSessions.set(userSessionKey, true);

  try {
    const cacheKey = `film_search_${q.toLowerCase()}`;
    let searchData = searchCache.get(cacheKey);

    if (!searchData) {
      const searchUrl = `https://apis.davidcyriltech.my.id/movies/search?query=${encodeURIComponent(q)}`;
      const response = await axios.get(searchUrl);
      searchData = response.data;

      if (!searchData.status || !searchData.results || searchData.results.length === 0) {
        throw new Error("No results found.");
      }

      searchCache.set(cacheKey, searchData);
    }

    const films = searchData.results.map((film, index) => ({
      number: index + 1,
      title: film.title,
      imdb: film.imdb,
      year: film.year,
      link: film.link,
      image: film.image
    }));

    let filmList = `*🎬 SEARCH RESULTS*\n\n`;
    films.forEach(f => {
      filmList += `🎥 ${f.number}. *${f.title}*\n   ⭐ IMDB: ${f.imdb}\n   📅 Year: ${f.year}\n\n`;
    });
    filmList += `🔢 Reply a number to download\n❌ Reply 'done' to cancel`;

    const movieListMessage = await conn.sendMessage(from, {
      image: { url: films[0].image },
      caption: filmList
    }, { quoted: mek });

    const movieListMessageKey = movieListMessage.key;
    const downloadOptionsMap = new Map();

    const selectionHandler = async (update) => {
      const msg = update.messages[0];
      if (!msg.message || !msg.key || msg.key.remoteJid !== from) return;

      const text = msg.message?.extendedTextMessage?.text?.trim();
      const repliedToId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
      const msgSender = msg.key.participant;

      if (msgSender !== sender || !text) return;

      if (text.toLowerCase() === "done") {
        conn.ev.off("messages.upsert", selectionHandler);
        activeSessions.delete(userSessionKey);
        await conn.sendMessage(from, {
          text: "✅ Movie session ended."
        }, { quoted: msg });
        return;
      }

      // First reply - movie selection
      if (repliedToId === movieListMessageKey.id) {
        const selectedNumber = parseInt(text);
        const selectedFilm = films.find(f => f.number === selectedNumber);

        if (!selectedFilm) {
          await conn.sendMessage(from, {
            text: `❌ Invalid number. Try again.`
          }, { quoted: msg });
          return;
        }

        const downloadUrl = `https://apis.davidcyriltech.my.id/movies/download?url=${encodeURIComponent(selectedFilm.link)}`;
        const response = await axios.get(downloadUrl);
        const downloadData = response.data;

        if (!downloadData.status || !downloadData.movie || !downloadData.movie.download_links) {
          throw new Error("Download info error.");
        }

        const allLinks = downloadData.movie.download_links;
        const downloadLinks = [];

        const sd = allLinks.find(l => l.quality === "SD 480p" && l.direct_download);
        if (sd) downloadLinks.push({ number: 1, quality: "SD", size: sd.size, url: sd.direct_download });

        let hd = allLinks.find(l => l.quality === "HD 720p" && l.direct_download);
        if (!hd) hd = allLinks.find(l => l.quality === "FHD 1080p" && l.direct_download);
        if (hd) downloadLinks.push({ number: 2, quality: "HD", size: hd.size, url: hd.direct_download });

        if (downloadLinks.length === 0) {
          await conn.sendMessage(from, {
            text: `❌ No valid download links found.`
          }, { quoted: msg });
          return;
        }

        let qualityList = `*🎬 ${selectedFilm.title}*\n\n📥 Choose Quality:\n\n`;
        downloadLinks.forEach(dl => {
          qualityList += `${dl.number}. *${dl.quality}* (${dl.size})\n`;
        });
        qualityList += `\n🔢 Reply with number\n❌ Reply 'done' to stop`;

        const qualityMsg = await conn.sendMessage(from, {
          image: { url: downloadData.movie.thumbnail || selectedFilm.image },
          caption: qualityList
        }, { quoted: msg });

        downloadOptionsMap.set(qualityMsg.key.id, { film: selectedFilm, downloadLinks });
      }

      else if (downloadOptionsMap.has(repliedToId)) {
        const { film, downloadLinks } = downloadOptionsMap.get(repliedToId);
        const selectedQuality = parseInt(text);
        const selected = downloadLinks.find(dl => dl.number === selectedQuality);

        if (!selected) {
          await conn.sendMessage(from, {
            text: `❌ Invalid quality selection.`
          }, { quoted: msg });
          return;
        }

        const size = selected.size.toLowerCase();
        let sizeInGB = 0;
        if (size.includes("gb")) sizeInGB = parseFloat(size.replace("gb", ""));
        else if (size.includes("mb")) sizeInGB = parseFloat(size.replace("mb", "")) / 1024;

        conn.ev.off("messages.upsert", selectionHandler);
        activeSessions.delete(userSessionKey);

        if (sizeInGB > 2) {
          await conn.sendMessage(from, {
            text: `⚠️ File too large.\n*Direct Link:*\n${selected.url}`
          }, { quoted: msg });
          return;
        }

        try {
          await conn.sendMessage(from, {
            document: { url: selected.url },
            mimetype: "video/mp4",
            fileName: `${film.title} - ${selected.quality}.mp4`,
            caption: `🎬 *${film.title}*\n📊 Size: ${selected.size}\n✅ Download Complete`
          }, { quoted: msg });

          await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
        } catch (err) {
          await conn.sendMessage(from, {
            text: `❌ Error sending file. Try again.\n*Direct Link:*\n${selected.url}`
          }, { quoted: msg });
        }
      }
    };

    conn.ev.on("messages.upsert", selectionHandler);

  } catch (e) {
    await conn.sendMessage(from, {
      text: `❌ Error: ${e.message || "Unknown error"}`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    activeSessions.delete(userSessionKey);
  }
});
