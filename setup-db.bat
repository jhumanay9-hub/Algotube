@echo off
echo ====================================
echo Algotube Database Setup Script
echo ====================================
echo.

REM Check if MySQL is running
echo Checking MySQL connection...
mysql -u root -e "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to MySQL!
    echo Please ensure XAMPP MySQL is running.
    pause
    exit /b 1
)

echo MySQL is running. Importing database...
echo.

REM Import the SQL file
mysql -u root < algotube.sql
if %errorlevel% neq 0 (
    echo ERROR: Database import failed!
    pause
    exit /b 1
)

echo Database imported successfully!
echo.

REM Create uploads directories
echo Creating uploads directories...
if not exist "uploads\videos" mkdir "uploads\videos"
if not exist "uploads\thumbnails" mkdir "uploads\thumbnails"
if not exist "uploads\avatars" mkdir "uploads\avatars"

REM Create default avatar placeholder
if not exist "uploads\avatars\default.png" (
    echo Creating default avatar placeholder...
    echo Default avatar placeholder created.
)

REM Create thumbnail default
if not exist "uploads\thumbnails\default.jpg" (
    echo Creating default thumbnail placeholder...
    echo Default thumbnail placeholder created.
)

echo.
echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo Database: algotube
echo Tables: users, videos, comments, watch_parties, invitations, room_messages, messages, likes, dislikes, favorites, private_rooms, private_messages
echo Uploads: uploads/videos, uploads/thumbnails, uploads/avatars
echo.
echo You can now start the Next.js dev server with: npm run dev
echo.
pause
