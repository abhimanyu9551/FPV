from telegram import Update
from telegram.ext import ContextTypes
from src.utils.decorators import require_auth
from src.services import api_client
from src.utils.formatters import debt_plan_message


@require_auth
async def debt_plan(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    /debt_plan [SNOWBALL|AVALANCHE|CUSTOM]
    Default: AVALANCHE
    """
    args = context.args or []
    strategy = args[0].upper() if args else "AVALANCHE"
    if strategy not in {"SNOWBALL", "AVALANCHE", "CUSTOM"}:
        await update.message.reply_text("Strategy must be SNOWBALL, AVALANCHE, or CUSTOM.")
        return
    try:
        plan = await api_client.get_debt_plan(strategy)
        await update.message.reply_text(debt_plan_message(plan), parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")
