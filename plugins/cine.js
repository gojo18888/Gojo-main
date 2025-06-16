const config = require('../settings')
const { cmd } = require('../lib/command')
const { getBuffer, fetchJson } = require('../lib/functions')
const { sizeFormatter } = require('human-readable')
const GDriveDl = require('../lib/gdrive.js')
const N_FOUND = "*I couldn't find anything :(*"

const BASE = `https://my-api-amber-five.vercel.app/api/cine`
const APIKEY = `gojomd` // optional if needed

// 1. Search Movies/TV Shows
cmd({
    pattern: "cine",
    react: '🎬',
    category: "movie",
    desc: "Search CineSubz Movies",
    filename: __filename
}, async (conn, m, mek, { from, prefix, q, reply }) => {
    if (!q) return await reply("*Please enter a movie or TV show name!*")

    try {
        const data = await fetchJson(`${BASE}/search?q=${encodeURIComponent(q)}`)
        const results = data?.data

        if (!results || results.length === 0) return await reply(N_FOUND)

        const srh = results.map((item, i) => ({
            title: `${i + 1}`,
            description: item.title,
            rowId: `${prefix}cineselect ${item.link}`
        }))

        const sections = [{ title: "_🎬 CineSubz Search Results_", rows: srh }]

        const listMessage = {
            text: '',
            footer: config.FOOTER,
            title: "Search Results From CineSubz 🍿",
            buttonText: "*🔢 Choose your result*",
            sections
        }

        await conn.replyList(from, listMessage, { quoted: mek })

    } catch (e) {
        reply('*Error fetching results!*')
        console.error(e)
    }
})

// 2. Select Movie/TV Show → get seasons or episodes
cmd({
    pattern: "cineselect",
    react: '📺',
    filename: __filename,
    dontAddCommandList: true
}, async (conn, m, mek, { from, prefix, q, reply }) => {
    if (!q) return await reply("*No URL provided.*")

    try {
        const isMovie = q.includes("/movies/")
        const isTV = q.includes("/tvshow/")

        if (isMovie) {
            const res = await fetchJson(`${BASE}/movie?url=${q}`)
            const movie = res?.data

            if (!movie?.seasons?.length) return await reply(N_FOUND)

            const cap = `🎬 *${movie.title}*\n🗓️ ${movie.date}\n🎭 ${movie.genre.join(', ')}\n\n🔗 ${q}`

            const rows = movie.seasons.map((s, i) => ({
                title: `${i + 1}`,
                description: `${s.title} | ${s.number}`,
                rowId: `${prefix}cinedl ${s.link}|${s.title}`
            }))

            const listMessage = {
                caption: cap,
                image: { url: movie.image },
                footer: config.FOOTER,
                title: "🎞️ CineSubz Seasons",
                buttonText: "*🔢 Choose Season*",
                sections: [{ title: "_Available Seasons_", rows }]
            }

            return await conn.replyList(from, listMessage, { quoted: mek })
        }

        if (isTV) {
            const res = await fetchJson(`${BASE}/tvshow?url=${q}`)
            const tv = res?.data

            if (!tv?.episodes?.length) return await reply(N_FOUND)

            const rows = tv.episodes.map((ep, i) => ({
                title: `${i + 1}`,
                description: `${ep.title} | ${ep.date}`,
                rowId: `${prefix}cinedl ${ep.link}|${ep.title}`
            }))

            const listMessage = {
                text: '',
                footer: config.FOOTER,
                title: '📺 CineSubz Episodes',
                buttonText: '*🔢 Choose Episode*',
                sections: [{ title: "_Available Episodes_", rows }]
            }

            return await conn.replyList(from, listMessage, { quoted: mek })
        }

        return await reply("*Invalid CineSubz link provided.*")

    } catch (err) {
        reply("*Error processing request!*")
        console.error(err)
    }
})

// 3. Final Download
cmd({
    pattern: "cinedl",
    react: "📥",
    filename: __filename,
    dontAddCommandList: true
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return await reply("*Please provide episode/season URL!*")

    try {
        const [mediaUrl, title = 'CineSubz_Download'] = q.split("|")

        const res = await fetchJson(`${BASE}/download?url=${mediaUrl}`)
        const dl_link = res?.data?.link

        if (!dl_link) return await reply("*Unable to get download link.*")

        await reply(`📥 Downloading...\n📡 *Source:* ${mediaUrl}`)

        if (dl_link.includes("drive.google.com")) {
            const g = await GDriveDl(dl_link)
            if (!g?.downloadUrl) return await reply("*Failed to download GDrive file.*")

            await conn.sendMessage(from, {
                document: { url: g.downloadUrl },
                caption: `${g.fileName}\n\n${config.FOOTER}`,
                fileName: g.fileName,
                mimetype: g.mimetype
            }, { quoted: mek })
        } else {
            await conn.sendMessage(from, {
                document: await getBuffer(dl_link),
                caption: `${title}\n\n${config.FOOTER}`,
                mimetype: 'video/mp4',
                fileName: `${title.trim()}.mp4`
            }, { quoted: mek })
        }

    } catch (e) {
        reply("*Download failed.*")
        console.error(e)
    }
})