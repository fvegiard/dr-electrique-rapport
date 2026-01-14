@echo off
REM Install Node.js dependencies
echo 📦 Installing Node.js dependencies...
call npm install

REM Install Python dependencies (if needed)
if exist requirements.txt (
    echo 🐍 Installing Python dependencies...
    python -m pip install -r requirements.txt
)

REM Create environment file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating .env file from .env.example...
    copy .env.example .env
    echo ⚠️  Please update .env with your actual credentials
)

echo ✅ Setup complete!
echo.
echo To start development:
echo   npm run dev
echo.
echo To deploy to Netlify:
echo   npm run deploy
pause
