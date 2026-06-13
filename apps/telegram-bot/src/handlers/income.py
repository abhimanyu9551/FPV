from telegram import Update
from telegram.ext import ContextTypes
from src.utils.decorators import require_auth
from src.services import api_client


@require_auth
async def add_income(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    /add_income <amount> <currency> [exchange_rate]
    Example: /add_income 3000 GBP
    Example: /add_income 250000 INR 107.5
    """
    args = context.args or []
    if len(args) < 2:
        await update.message.reply_text(
            "Usage: /add_income <amount> <currency> [exchange_rate]\n"
            "Example: /add_income 3000 GBP"
        )
        return

    try:
        amount = float(args[0])
        currency = args[1].upper()
        exchange_rate = float(args[2]) if len(args) > 2 else None
    except ValueError:
        await update.message.reply_text("❌ Invalid amount or exchange rate.")
        return

    if currency not in {"GBP", "INR"}:
        await update.message.reply_text("❌ Currency must be GBP or INR.")
        return

    if currency != "GBP" and exchange_rate is None:
        await update.message.reply_text(
            f"❌ Exchange rate required for {currency}.\n"
            f"Example: /add_income {amount} {currency} 107.5"
        )
        return

    try:
        # Use the first active income source (bot keeps it simple)
        sources = await api_client.list_income_sources()
        if not sources:
            await update.message.reply_text("❌ No income sources configured. Set them up in the dashboard first.")
            return

        source_id = sources[0]["id"]
        entry = await api_client.add_income(source_id, amount, currency, exchange_rate)
        await update.message.reply_text(
            f"✅ Income recorded!\n"
            f"Amount: {currency} {amount:,.2f}\n"
            f"ID: {entry['id']}\n\n"
            f"Run /salary_process {entry['id']} to allocate."
        )
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")
