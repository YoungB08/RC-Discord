require('dotenv').config();
const axios = require('axios');
const db = require('../backend/database');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js'); // Sử dụng GatewayIntentBits từ discord.js

// Khởi tạo client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,  // Dùng GatewayIntentBits để khởi tạo các intents đúng
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
// Hàm kiểm tra hàng trong bảng
const checkRow = (table, column, value) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM ${table} WHERE ${column} = ?`;
        db.execute(query, [value], (err, results) => {
            if (err) return reject(err);
            resolve(results.length > 0);
        });
    });
};

// Hàm thêm giao dịch vào bảng trans_bank
const insertTransaction = (user, amount, content, uid, mgd) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO trans_bank (user, sotien, noidung, uid, status, mgd, createdtime) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const createdtime = new Date().toISOString(); // Lấy thời gian hiện tại


        db.execute(query, [user, amount, content, uid, 1, mgd, createdtime], (err, results) => {
            if (err) {
                console.error('Error executing query:', err);  // Log lỗi nếu có
                return reject(err);
            }
            resolve(results);
        });

    });
};

const getUserId = (UID) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT ID FROM accounts WHERE ID = ?`;
        db.execute(query, [UID], (err, results) => {
            if (err) return reject(err);
            if (results.length > 0) {
                resolve(results[0].ID);  // Trả về ID của người dùng
            } else {
                resolve(null); // Nếu không tìm thấy người dùng, trả về null
            }
        });
    });
};
const getUserName = (UID) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT Username FROM accounts WHERE ID = ?`;
        db.execute(query, [UID], (err, results) => {
            if (err) return reject(err);
            if (results.length > 0) {
                resolve(results[0].Username);  // Trả về Username của người dùng
            } else {
                resolve(null); // Nếu không tìm thấy người dùng, trả về null
            }
        });
    });
};


// Hàm cộng tiền cho người dùng
const addFunds = (uid, amount) => {
    return new Promise((resolve, reject) => {
        const query = `UPDATE accounts SET RCRPCoin = RCRPCoin + ? WHERE ID = ?`;
        db.execute(query, [amount, uid], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// Hàm xử lý các giao dịch nạp tiền
// Hàm xử lý giao dịch
const handleTransaction = async (transaction) => {
    const description = transaction.description;

    const uidRegex = /RCR\s*P(\d{4,5})/;  // Kiểm tra lại biểu thức chính quy để lấy đúng UID
    const match = description.match(uidRegex);


    if (match) {
        const uid = match[1];  // UID là nhóm thứ nhất trong biểu thức chính quy


        // Lấy số tiền từ giao dịch
        const amount = transaction.amount;

        // Kiểm tra nếu amount là một giá trị hợp lệ
        if (isNaN(amount) || amount <= 0) {
            console.error('Invalid transaction amount:', amount);
            return;  // Nếu amount không hợp lệ, không xử lý giao dịch
        }

        const formattedAmount = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);

        console.log(`Transaction ID: ${transaction.transactionID}, Transaction amount: ${formattedAmount}, UID found: ${uid}`);

        try {

            const transactionExists = await checkRow('trans_bank', 'mgd', transaction.transactionID);
            if (transactionExists) {
                return;  // Nếu giao dịch đã tồn tại, bỏ qua
            }

            // Lấy userId từ UID
            console.log('UID:', uid);
            const userId = await getUserId(uid);
            const Username = await getUserName(uid);
            if (!userId) {
                return;
            }

            if (!transaction.transactionID || !uid || !formattedAmount || !userId) {
                return;
            }

            await insertTransaction(Username, amount, description, userId, transaction.transactionID);

            await addFunds(userId, amount / 1000);

            const channel = await client.channels.fetch(process.env.LOG_NAPTIEN); // Lấy channel
            const embed = new EmbedBuilder()
                .setColor('#28a745') // Màu xanh lá
                .setTitle('🎮 **Thanh toán thành công**')
                .setDescription(`Giao dịch nạp tiền đã được xử lý thành công!\n**UID**: ${uid}\n**Số tiền**: ${formattedAmount}`)
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            console.log(`Transaction processed successfully for UID ${uid}`);
        } catch (err) {
            console.error('Error processing transaction:', err);
        }
    }
};



// Hàm lấy giao dịch từ API và xử lý chúng
const processTransactions = async () => {
    try {
        const url_bank = `https://api.sieuthicode.net/historyapimbbankv2/${process.env.BANK_TOKEN}`;
        console.log(url_bank);
        const response = await axios.get(url_bank);

        // Kiểm tra dữ liệu trả về từ API
        if (!response.data || !Array.isArray(response.data.transactions)) {
            console.error('Dữ liệu trả về không hợp lệ hoặc không chứa transactions.');
            return;
        }

        const transactions = response.data.transactions;

        if (transactions.length === 0) {
            console.log('Không có giao dịch nào để xử lý.');
            return;
        }

        // Xử lý các giao dịch hợp lệ
        for (let transaction of transactions) {
            if (transaction.type === 'IN') {
                await handleTransaction(transaction);
            }
        }
    } catch (error) {
        console.error('Error occurred while fetching transaction data:', error);
    }
};
client.login(process.env.DISCORD_TOKEN);
processTransactions();

setInterval(() => {
    processTransactions();
}, 5000); // 5000 milliseconds = 5 seconds
