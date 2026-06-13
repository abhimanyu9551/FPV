from telegram import Update
from telegram.ext import ContextTypes
from src.utils.decorators import require_auth
from src.services import api_client
from src.utils.formatters import status_message


@require_auth
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        dashboard = await api_client.get_dashboard()
        body = status_message(dashboard)
        msg = f"👋 <b>Welcome to FPV Bot!</b>\n\n{body}\n\nType /help for commands."
    except Exception:
        msg = "👋 <b>Welcome to FPV Bot!</b>\n\nType /help to see available commands."
    await update.message.reply_text(msg, parse_mode="HTML")
