from datetime import date
from telegram import Update
from telegram.ext import ContextTypes
from src.utils.decorators import require_auth
from src.services import api_client
from src.utils.formatters import bold, fmt_gbp, _h

CATEGORY_ICONS = {
    "CREDIT_CARD_PAYMENT": "💳",
    "EMI": "🏦",
    "RENT": "🏠",
    "GROCERIES": "🛒",
    "LEISURE": "🎭",
    "INVESTMENT": "📈",
    "SAVINGS": "💰",
    "GENERAL_EXPENSE": "📋",
    "OTHER": "•",
}


def _fmt_process_result(data: dict) -> str:
    period = data.get("period", {})
    year, month = period.get("year"), period.get("month")
    month_label = date(year, month, 1).strftime("%B %Y") if year and month else "—"

    lines = [bold(f"📊 Salary Process — {month_label}"), ""]

    # Pending salaries
    pending = data.get("pendingSources", [])
    if pending:
        lines.append("⏳ <b>Salary not yet received:</b>")
        for s in pending:
            day = f" (expected {s['salaryDay']}th)" if s.get("salaryDay") else ""
            exp = f" ~{fmt_gbp(s['expectedAmount'])}" if s.get("expectedAmount") else ""
            lines.append(f"  • {_h(s['name'])}{day}{exp}")
        lines.append("")

    # Income received
    entries = data.get("entries", [])
    if entries:
        lines.append("<b>Income received:</b>")
        for e in entries:
            lines.append(f"  {_h(e['sourceName'])}: {bold(fmt_gbp(e['amount']))}")

    allocation = data.get("allocation")
    if not allocation:
        if not entries:
            lines.append("No income entries found for this month.")
            lines.append("Add salary entries in the dashboard first.")
        return "\n".join(lines)

    lines.append(f"  Combined: {bold(fmt_gbp(allocation['combinedIncome']))}")
    lines.append("")

    # Warnings
    if allocation.get("hasWarnings"):
        lines.append("⚠️ <b>Shortfall warnings:</b>")
        for w in allocation.get("warnings", []):
            lines.append(f"  • {_h(w['message'])}")
        lines.append("")

    # Allocation breakdown
    lines.append("<b>Allocation breakdown:</b>")
    for item in allocation.get("items", []):
        icon = CATEGORY_ICONS.get(item.get("category", "OTHER"), "•")
        label = _h(item["label"])
        total = fmt_gbp(item["totalAllocated"])
        lines.append(f"  {icon} {label}: {bold(total)}")
        breakdown = item.get("sourceBreakdown", [])
        if len(breakdown) > 1:
            parts = [f"{_h(sb['sourceName'])} {fmt_gbp(sb['amount'])}" for sb in breakdown]
            lines.append(f"       ↳ {' | '.join(parts)}")

    lines.append("")
    lines.append(f"💰 {bold('Monthly Savings')}: {bold(fmt_gbp(allocation['totalSavings']))}")

    return "\n".join(lines)


@require_auth
async def process_month(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    /process [year] [month]
    Run the shared salary allocation for this month (or a specified month).
    Example: /process
    Example: /process 2026 5
    """
    args = context.args or []
    now = date.today()
    try:
        year = int(args[0]) if len(args) > 0 else now.year
        month = int(args[1]) if len(args) > 1 else now.month
    except ValueError:
        await update.message.reply_text("Usage: /process [year] [month]\nExample: /process 2026 6")
        return

    await update.message.reply_text("⏳ Processing salary allocation…")
    try:
        data = await api_client.process_month(year, month)
        await update.message.reply_text(_fmt_process_result(data), parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")
