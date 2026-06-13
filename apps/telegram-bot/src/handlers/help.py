from telegram import Update
from telegram.ext import ContextTypes
from src.utils.decorators import require_auth

HELP_TEXT = (
    "<b>FPV Finance Bot — Commands</b>\n"
    "\n"
    "/start — Welcome + status overview\n"
    "/status — Current financial snapshot\n"
    "/debt_plan — Debt repayment plan (AVALANCHE)\n"
    "/debt_plan SNOWBALL — Snowball strategy\n"
    "/add_income 3000 GBP — Record salary income\n"
    "/add_income 250000 INR 107.5 — Record INR income with rate\n"
    "/help — This message\n"
    "\n"
    "<i>All commands require authorisation. Data is read/written via the FPV Dashboard API.</i>"
)


@require_auth
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(HELP_TEXT, parse_mode="HTML")
