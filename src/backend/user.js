const db = require('./database');

function isLinkedDiscord(discordID) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM accounts WHERE DiscordID = ?';

    db.query(query, [discordID], (err, results) => {
      if (err) {
        reject('Lỗi khi truy vấn cơ sở dữ liệu');
        return;
      }

      if (results.length > 0 && results[0].DiscordID !== null) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

module.exports = { isLinkedDiscord };
