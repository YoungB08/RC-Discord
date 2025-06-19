const mysql = require('mysql2');
require('dotenv').config(); // Đảm bảo rằng biến môi trường được nạp đúng

// Kết nối tới cơ sở dữ liệu
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE, // Đảm bảo rằng có thông tin tên cơ sở dữ liệu
});

module.exports = db;
