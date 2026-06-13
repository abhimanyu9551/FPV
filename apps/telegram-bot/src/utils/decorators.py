import logging
from functools import wraps
from telegram import Update
from telegram.ext import ContextTypes
from src.services.auth_service import is_authorized

logger = logging.getLogger(__name__)


def require_auth(func):
    """Decorator: blocks any user not in AUTHORIZED_USER_IDS."""
    @wraps(func)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user = update.effective_user
        if not user or not is_authorized(user.id):
            uid = user.id if user else "unknown"
            logger.warning(f"Unauthorized access attempt from user_id={uid}")
            await update.message.reply_text("⛔ You are not authorized to use this bot.")
            return
        return await func(update, context)
    return wrapper
