import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN: str = os.environ["TELEGRAM_BOT_TOKEN"]
FINANCE_API_BASE_URL: str = os.environ.get("FINANCE_API_BASE_URL", "http://localhost:3000")
BOT_API_SECRET: str = os.environ["BOT_API_SECRET"]

# Authorized Telegram user IDs — only these can use the bot
_raw_ids = os.environ.get("AUTHORIZED_USER_IDS", "")
AUTHORIZED_USER_IDS: set[int] = {
    int(uid.strip()) for uid in _raw_ids.split(",") if uid.strip()
}

LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
