const express = require('express');
const fs = require('fs');
const router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function XeonPair() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);

        try {
            let XeonBotInc = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({level: "fatal"}).child({level: "fatal"})),
                },
                printQRInTerminal: false,
                logger: pino({level: "fatal"}).child({level: "fatal"}),
                browser: ["Ubuntu", "Chrome", "20.0.04"],
            });

            if (!XeonBotInc.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await XeonBotInc.requestPairingCode(num);

                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            XeonBotInc.ev.on('creds.update', saveCreds);

            XeonBotInc.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(10000);
                    const sessionXeon = fs.readFileSync('./session/creds.json');
                    await XeonBotInc.sendMessage(XeonBotInc.user.id, { document: sessionXeon, mimetype: `application/json`, fileName: `creds.json` });

                    const welcomeMessage = `مرحبا بك أنت الان تستعد لكي تقوم باانشاء بوت جيطوسة يمكنك فقط نسخ هاذا الملف أو تقوم بتحميل في JitossaSession / creds.json وهنيئا لك\n\n*Rapid bot development powered by JITOSSA*\nwww.github.com/omarcharaf1/jitossa\n\n*Instagram*\nwww.instagram.com/ovmar_1\n\n*WhatsApp Channel*\nhttps://whatsapp.com/channel/0029Vae6G0o29752QfcvFl2B`;

                    await XeonBotInc.sendMessage(XeonBotInc.user.id, { text: welcomeMessage });

                    await delay(100);
                    await removeFile('./session');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    XeonPair();
                }
            });
        } catch (err) {
            console.log("service restarted");
            await removeFile('./session');
            if (!res.headersSent) {
                await res.send({ code: "Service Unavailable" });
            }
        }
    }

    return await XeonPair();
});

process.on('uncaughtException', function (err) {
    let e = String(err);
    if (e.includes("conflict") || e.includes("Socket connection timeout") || e.includes("not-authorized") || e.includes("rate-overlimit") || e.includes("Connection Closed") || e.includes("Timed Out") || e.includes("Value not found")) {
        return;
    }
    console.log('Caught exception: ', err);
});

module.exports = router;
