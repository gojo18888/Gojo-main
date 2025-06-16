const axios = require('axios');
const { cmd } = require('../lib/command');

const BRAND = '✫☘𝐆𝐎𝐉𝐎 𝐌𝐎𝐕𝐈𝐄 𝐇𝐎𝐌𝐄☢️☘';

cmd(
  {
    pattern: 'cine',
    react: '🎬',
    desc: 'Search and download Movies/TV Series via CineSubz API',
    category: 'media',
    filename: __filename,
  },
  async (conn, mek, m, { from, q }) => {
    if (!q) {
      await conn.sendMessage(
        from,
        {
          text:
            '*🎬 CineSubz Movie Search*\n\n' +
            'Usage: .cine <movie name>\n' +
            'Example: .cine deadpool\n\n' +
            'Reply "done" to cancel at any step.',
        },
        { quoted: mek }
      );
      return;
    }

    const apiBase = 'https://my-api-amber-five.vercel.app';

    try {
      // 1) Search movies
      const searchRes = await axios.get(`${apiBase}/api/cine/search?q=${encodeURIComponent(q)}`, {
        timeout: 10000,
      });
      if (!searchRes.data.status || !searchRes.data.results || !searchRes.data.results.length) {
        await conn.sendMessage(from, { text: '❌ No results found.' }, { quoted: mek });
        return;
      }

      const movies = searchRes.data.results;

      let text = '*🎬 Search Results:*\n\n';
      movies.forEach((f, i) => {
        text += `${i + 1}. ${f.title}\n`;
      });
      text += '\nReply with the number of the movie you want.\nReply "done" to cancel.';

      // Send first movie thumbnail with results text
      const listMsg = await conn.sendMessage(
        from,
        {
          image: { url: movies[0].image || '' },
          caption: text,
        },
        { quoted: mek }
      );

      // Map to store waiting states per user/message
      const waiting = new Map();

      const handler = async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message?.extendedTextMessage) return;
        const body = msg.message.extendedTextMessage.text.trim();
        const replyTo = msg.message.extendedTextMessage.contextInfo?.stanzaId;

        if (body.toLowerCase() === 'done') {
          waiting.clear();
          conn.ev.off('messages.upsert', handler);
          await conn.sendMessage(from, { text: '✅ Cancelled.' }, { quoted: msg });
          return;
        }

        // Step 1: user selects movie number
        if (replyTo === listMsg.key.id) {
          const num = parseInt(body);
          if (isNaN(num) || num < 1 || num > movies.length) {
            await conn.sendMessage(from, { text: '❌ Invalid number.' }, { quoted: msg });
            return;
          }

          const selectedMovie = movies[num - 1];

          // 2) Get movie details from movie endpoint
          const movieUrl = selectedMovie.link;
          let movieDetails;
          try {
            const movieRes = await axios.get(`${apiBase}/api/cine/movie?url=${encodeURIComponent(movieUrl)}`, {
              timeout: 10000,
            });
            if (!movieRes.data.status) throw new Error('Movie details not found');
            movieDetails = movieRes.data.movie;
          } catch (e) {
            await conn.sendMessage(from, { text: '❌ Failed to fetch movie details.' }, { quoted: msg });
            return;
          }

          // Prepare quality options from download links
          const links = movieDetails.download_links || [];
          if (!links.length) {
            await conn.sendMessage(from, { text: '❌ No download links found.' }, { quoted: msg });
            return;
          }

          // Prepare qualities list
          let qualityText = `*🎬 ${movieDetails.title}*\n\nChoose quality:\n`;
          const qualities = [];
          links.forEach((lnk, idx) => {
            qualities.push(lnk);
            qualityText += `${idx + 1}. ${lnk.quality} (${lnk.size || 'N/A'})\n`;
          });
          qualityText += '\nReply with quality number or "done" to cancel.';

          const qualMsg = await conn.sendMessage(
            from,
            {
              image: { url: movieDetails.thumbnail || selectedMovie.image || '' },
              caption: qualityText,
            },
            { quoted: msg }
          );

          waiting.set(qualMsg.key.id, { movie: movieDetails, qualities, from });

          return;
        }

        // Step 2: user selects quality number
        if (waiting.has(replyTo)) {
          const { movie, qualities } = waiting.get(replyTo);
          const num = parseInt(body);
          if (isNaN(num) || num < 1 || num > qualities.length) {
            await conn.sendMessage(from, { text: '❌ Invalid quality number.' }, { quoted: msg });
            return;
          }

          const selectedQuality = qualities[num - 1];
          const downloadUrl = selectedQuality.direct_download;

          if (!downloadUrl) {
            await conn.sendMessage(from, { text: '❌ Download link not available.' }, { quoted: msg });
            return;
          }

          // File name safe
          const safeTitle = movie.title.replace(/[\\/:*?"<>|]/g, '');
          const filename = `${BRAND} • ${safeTitle} • ${selectedQuality.quality}.mp4`;

          // Check file size if available (skip for simplicity here)
          // Send as document mp4
          try {
            await conn.sendMessage(
              from,
              {
                document: { url: downloadUrl },
                mimetype: 'video/mp4',
                fileName: filename,
                caption: `🎬 *${movie.title}*\n📊 Size: ${selectedQuality.size || 'N/A'}\n\n🔥 ${BRAND}`,
              },
              { quoted: msg }
            );
            await conn.sendMessage(from, { react: { text: '✅', key: msg.key } });
          } catch (e) {
            await conn.sendMessage(from, { text: `❌ Failed to send video. Direct link:\n${downloadUrl}` }, { quoted: msg });
          }

          waiting.clear();
          conn.ev.off('messages.upsert', handler);
          return;
        }
      };

      conn.ev.on('messages.upsert', handler);
    } catch (e) {
      await conn.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: mek });
    }
  }
);
