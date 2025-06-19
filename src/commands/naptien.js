const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { isLinkedDiscord } = require('../backend/user');
const axios = require('axios');
const fs = require('fs');
const db = require('../backend/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('charge')
    .setDescription('Nạp tiền vào tài khoản game của bạn')
    .addIntegerOption(option =>
      option.setName('sotien')
        .setDescription('Số tiền bạn muốn nạp')
        .setRequired(true)),

  async execute(interaction) {
    const discordID = interaction.user.id;
    const amount = interaction.options.getInteger('sotien');



    if (!amount || amount <= 0 || amount < 5000) {
      return interaction.reply('❌ **Số tiền bạn nhập không hợp lệ!**');
    }

    const linked = await isLinkedDiscord(discordID);

    if (!linked) {
      return interaction.reply('🔗 **Tài khoản của bạn chưa liên kết với Discord. Vui lòng liên kết trước khi thực hiện giao dịch.**');
    }

    try {

      let embed = new EmbedBuilder()
        .setColor('#FF6347')
        .setTitle('🎮 **Nạp tiền vào tài khoản game**')
        .setDescription(`**<@${discordID}>** đã yêu cầu nạp **${amount} VND** vào tài khoản game.`)
        .setThumbnail('https://i.imgur.com/YkGSQAd.jpeg')
        .setFooter({ text: 'Nạp tiền từ bot', iconURL: 'https://i.imgur.com/YkGSQAd.jpeg' })
        .setTimestamp();

      try {
        const channel = await interaction.client.channels.fetch(process.env.Log_NapTien);
        if (!channel) {
          console.log('Không thể tìm thấy kênh!');
        } else {
          // Gửi tin nhắn đến kênh
          await channel.send({ embeds: [embed] });
          console.log('Tin nhắn đã được gửi thành công');
        }
      } catch (error) {
        console.error('Lỗi khi gửi tin nhắn:', error);
      }

      // Lấy UID từ bảng accounts dựa trên DiscordID
      const [accountResults] = await db.promise().query(
        'SELECT ID FROM accounts WHERE DiscordID = ?',
        [discordID]
      );

      if (accountResults.length === 0) {
        console.log('Account not found for DiscordID:', discordID);
        return interaction.reply({
          content: '❌ **Không tìm thấy tài khoản cho DiscordID này!**',
          ephemeral: true,
        });
      }

      const uid = accountResults[0].ID;
      embed = new EmbedBuilder()
        .setColor('#FF6347')
        .setTitle('🎮 **Nạp tiền vào tài khoản game**')
        .setDescription(`Bạn đã yêu cầu nạp **${amount}** vào tài khoản game.\nDưới đây là mã QR để thực hiện chuyển khoản.\n\n👉 **Quét mã QR để nạp tiền!**`)
        .setThumbnail('https://i.imgur.com/YkGSQAd.jpeg')
        .addFields({
          name: '💡 Hướng dẫn', value: '1. Quét mã QR.\n\
            2. Đợi máy chủ xử lí trong 5-15p (hoặc có thể nhanh hơn).', inline: false
        })
        .setFooter({ text: 'Powered by RCRP', iconURL: 'https://i.imgur.com/YkGSQAd.jpeg' })
        .setTimestamp();

      // Thay đổi `addInfo` trong URL thành `RCRP+[UID]`
      const qrUrl = `https://api.vietqr.io/image/970422-151108100927-saeowhL.jpg?accountName=TRAN%20KHOI%20NGUYEN&amount=${amount}&addInfo=RCRP%5B${uid}%5D`;

      // Tạo QR code và gửi Embed cùng nút
      const response = await axios({
        url: qrUrl,
        method: 'GET',
        responseType: 'stream',
      });

      const writer = fs.createWriteStream('qr-code.jpg');
      response.data.pipe(writer);

      writer.on('finish', () => {

        interaction.reply({
          embeds: [embed],
          files: [{ attachment: 'qr-code.jpg', name: 'payment-qr.jpg' }],
        });
      });

      writer.on('error', (err) => {
        console.error('Error while downloading QR code:', err);
        interaction.reply('❌ **Đã xảy ra lỗi khi tạo mã QR!**');
      });
    } catch (error) {
      console.error('Error occurred while generating QR code or inserting into DB:', error);
      interaction.reply('❌ **Đã xảy ra lỗi khi tạo mã QR hoặc lưu thông tin vào cơ sở dữ liệu!**');
    }
  },


};
