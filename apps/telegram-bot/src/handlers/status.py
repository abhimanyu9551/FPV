from telegram import Update
from telegram.ext import ContextTypes
from src.utils.decorators import require_auth
from src.services import api_client
from src.utils.formatters import status_message


@require_auth
async def status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        dashboard = await api_client.get_dashboard()
        await update.message.reply_text(status_message(dashboard), parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"❌ Error fetching status: {e}")
