@echo off
cd /d "F:\RCRP\RC-Discord"  REM Chỉ định thư mục dự án của bạn

REM Chạy file đầu tiên naptien.js
start node src/jobs/naptien.js

REM Chạy file thứ hai ví dụ như bot.js
start node bot.js

