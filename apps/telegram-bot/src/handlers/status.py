from datetime import date
from telegram import Update
from telegram.ext import ContextTypes
from src.utils.decorators import require_auth
from src.services import api_client
from src.utils.formatters import bold, fmt_gbp, fmt_inr, _h

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


def _build_status_message(data: dict) -> str:
    now = date.today()
    period = data.get("period", {})
    year, month = period.get("year", now.year), period.get("month", now.month)
    month_label = date(year, month, 1).strftime("%B %Y")

    lines = [bold(f"📊 Financial Status — {month_label}"), ""]

    # ── Income sources
    sources = data.get("sources", [])
    lines.append("<b>Salary Sources:</b>")
    for s in sources:
        tick = "✅" if s.get("receivedThisMonth") else "⏳"
        day = f" (day {s['salaryDay']})" if s.get("salaryDay") else ""
        amt = fmt_gbp(s["receivedAmount"]) if s.get("receivedAmount") else "—"
        lines.append(f"  {tick} {_h(s['name'])}{day}: {bold(amt)}")
    lines.append("")

    # ── Allocation
    allocation = data.get("allocation")
    if allocation:
        lines.append(f"<b>Combined Income:</b> {bold(fmt_gbp(allocation['combinedIncome']))}")
        lines.append("")

        if allocation.get("hasWarnings"):
            lines.append("⚠️ Shortfall warnings:")
            for w in allocation.get("warnings", []):
                lines.append(f"  • {_h(w['message'])}")
            lines.append("")

        lines.append("<b>Monthly Allocations:</b>")
        for item in allocation.get("items", []):
            icon = CATEGORY_ICONS.get(item.get("category", "OTHER"), "•")
            label = _h(item["label"])
            total = fmt_gbp(item["totalAllocated"])
            pct = item.get("percentOfCombined", 0)
            lines.append(f"  {icon} {label}: {bold(total)} ({pct:.1f}%)")
            breakdown = item.get("sourceBreakdown", [])
            if len(breakdown) > 1:
                parts = [f"{_h(sb['sourceName'])} {fmt_gbp(sb['amount'])}" for sb in breakdown if sb['amount'] > 0]
                if parts:
                    lines.append(f"       ↳ {' | '.join(parts)}")

        lines.append("")
        savings_gbp = allocation["totalSavings"]
        savings_inr = data.get("inrRate") and f" · {fmt_inr(savings_gbp * data['inrRate'])}"
        lines.append(f"💰 {bold('Monthly Savings')}: {bold(fmt_gbp(savings_gbp))}{savings_inr or ''}")
        lines.append("")
    else:
        lines.append("No income received yet this month.")
        lines.append("Use /process to run allocation once salaries are added.")
        lines.append("")

    # ── Debts
    debts = data.get("debts", [])
    if debts:
        lines.append("<b>Active Debts:</b>")
        for d in debts:
            symbol = "₹" if d["currencyCode"] == "INR" else "£"
            bal = f"{symbol}{d['outstandingBalance']:,.2f}" if d["currencyCode"] != "INR" else f"₹{d['outstandingBalance']:,.0f}"
            inr_equiv = f" (~₹{int(d['outstandingInr']):,})" if d.get("outstandingInr") and d["currencyCode"] == "GBP" else ""
            due = f" | due day {d['paymentDueDay']}" if d.get("paymentDueDay") else ""
            min_pay = f" | min {symbol}{d['minimumPayment']:,.2f}" if d.get("minimumPayment") else ""
            lines.append(f"  • {_h(d['name'])}: {bold(_h(bal))}{_h(inr_equiv)}{_h(due)}{_h(min_pay)}")
        lines.append("")

    # ── Savings → Debt breakdown
    savings_breakdown = data.get("savingsBreakdown", [])
    if savings_breakdown:
        lines.append("<b>Savings → Debt Repayment:</b>")
        for sb in savings_breakdown:
            pct = sb["savingsPct"]
            gbp = fmt_gbp(float(sb["amountGbp"]))
            inr = f" / {fmt_inr(float(sb['amountInr']))}" if sb.get("amountInr") else ""
            lines.append(f"  • {_h(sb['debtName'])}: {pct}% → {bold(gbp)}{_h(inr)}")

    return "\n".join(lines)


@require_auth
async def status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    /status — Show current month's full financial status.
    """
    import traceback
    now = date.today()
    try:
        data = await api_client.get_monthly_status(now.year, now.month)
        await update.message.reply_text(_build_status_message(data), parse_mode="HTML")
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[status] error:\n{tb}")
        await update.message.reply_text(f"❌ Error fetching status: {e}")
