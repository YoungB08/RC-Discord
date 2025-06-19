require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const naptienCommand = require('./src/commands/naptien');  // Import các lệnh Slash

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Cấu hình các lệnh
const commands = [naptienCommand.data];  // Đảm bảo data chứa đúng thông tin lệnh Slash

// Đăng ký lệnh Slash với Discord API
const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    const applicationId = process.env.APPLICATION_ID;  // Đảm bảo bạn lấy đúng application_id từ .env
    await rest.put(
      Routes.applicationCommands(applicationId),
      { body: commands },  // Đảm bảo body chứa đúng data
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
})();

client.once('ready', () => {
  console.log('Bot is online!');
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {  // Kiểm tra xem có phải lệnh Slash không
    console.log(`Received command: ${interaction.commandName}`);

    if (interaction.commandName === 'charge') {
      try {
        // Thêm log để kiểm tra khi lệnh được thực thi
        console.log('Executing charge command...');
        await naptienCommand.execute(interaction);  // Xử lý lệnh Slash
      } catch (error) {
        console.error('Error executing charge command:', error);
        interaction.reply('❌ **Đã xảy ra lỗi khi thực hiện lệnh!**');
      }
    }
  } else if (interaction.isButton()) {  // Nếu là button interaction
    console.log('Button clicked, handling...');
    await naptienCommand.handleButtonInteraction(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);  // Đăng nhập bot
