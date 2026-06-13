"""
FPV Telegram Bot — Entry point
"""
import time
import logging
from telegram.ext import Application, CommandHandler

from src.config import TELEGRAM_BOT_TOKEN, LOG_LEVEL
from src.handlers.start import start
from src.handlers.status import status
from src.handlers.debt import debt_plan
from src.handlers.income import add_income
from src.handlers.help import help_command
from src.handlers.errors import error_handler

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=getattr(logging, LOG_LEVEL, logging.INFO),
)
logger = logging.getLogger(__name__)


def build_app() -> Application:
    app = (
        Application.builder()
        .token(TELEGRAM_BOT_TOKEN)
        .connect_timeout(30)
        .read_timeout(30)
        .write_timeout(30)
        .pool_timeout(30)
        .build()
    )
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CommandHandler("debt_plan", debt_plan))
    app.add_handler(CommandHandler("add_income", add_income))
    app.add_handler(CommandHandler("help", help_command))
    app.add_error_handler(error_handler)
    return app


if __name__ == "__main__":
    MAX_RETRIES = 5
    RETRY_DELAY = 10

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info(f"Starting FPV Telegram Bot (attempt {attempt}/{MAX_RETRIES})...")
            app = build_app()
            app.run_polling(drop_pending_updates=True)
            break
        except Exception as e:
            logger.error(f"Bot crashed: {e}")
            if attempt < MAX_RETRIES:
                logger.info(f"Retrying in {RETRY_DELAY}s...")
                time.sleep(RETRY_DELAY)
            else:
                logger.error("Max retries reached. Exiting.")
