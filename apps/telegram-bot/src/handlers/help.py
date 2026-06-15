from telegram import Update
from telegram.ext import ContextTypes
from src.utils.decorators import require_auth

HELP_TEXT = (
    "<b>FPV Finance Bot — Commands</b>\n"
    "\n"
    "📊 <b>Monthly Flow</b>\n"
    "/status — Full monthly status: income, allocations, savings, debts\n"
    "/process — Run salary allocation for this month\n"
    "/process 2026 5 — Run allocation for a specific month\n"
    "\n"
    "💰 <b>Income</b>\n"
    "/add_income 3000 GBP — Record salary income\n"
    "/add_income 250000 INR 107.5 — Record INR income with exchange rate\n"
    "\n"
    "💳 <b>Debts</b>\n"
    "/debt_plan — Debt repayment plan (AVALANCHE strategy)\n"
    "/debt_plan SNOWBALL — Snowball strategy\n"
    "\n"
    "/help — This message\n"
    "\n"
    "<i>All commands require authorisation. Set allocation rules in the dashboard.</i>"
)


@require_auth
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(HELP_TEXT, parse_mode="HTML")
