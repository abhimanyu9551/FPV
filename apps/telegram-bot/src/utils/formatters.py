def _h(text) -> str:
    """Escape text for Telegram HTML parse mode."""
    return str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def bold(text) -> str:
    return f"<b>{_h(text)}</b>"


def fmt_gbp(amount: float | None) -> str:
    if amount is None:
        return "N/A"
    return _h(f"£{amount:,.2f}")


def fmt_inr(amount: float | None) -> str:
    if amount is None:
        return "N/A"
    return _h(f"₹{amount:,.0f}")


def fmt_pct(value: float | None) -> str:
    if value is None:
        return "N/A"
    return _h(f"{value:.1f}%")


def debt_plan_message(plan: dict) -> str:
    strategy = plan["strategy"]
    debt_free = plan["debtFreeDate"]
    lines = [
        bold(f"Debt Plan — {strategy}"),
        f"Debt-free: {bold(debt_free)}",
        f"Total interest: {bold(fmt_gbp(plan['totalInterestCost']))}",
        f"Interest saved: {bold(fmt_gbp(plan['interestSavedVsMinimumOnly']))}",
        "",
        bold("Priority order:"),
    ]
    for d in plan["debts"]:
        name = _h(d["debtName"])
        order = d["priorityOrder"]
        months = d["monthsToPayoff"]
        balance = fmt_gbp(d["currentBalance"])
        lines.append(f"{order}. {bold(name)} — {balance} ({months} months)")
    return "\n".join(lines)


def status_message(dashboard: dict) -> str:
    debt = dashboard.get("debtSummary", {})
    snap = dashboard.get("latestSnapshot")
    total_debts = debt.get("totalDebts", 0)
    total_gbp = debt.get("totalOutstandingGbp")
    lines = [
        bold("Financial Status"),
        "",
        f"Active debts: {bold(total_debts)}",
        f"Total debt: {bold(fmt_gbp(total_gbp))}",
    ]
    if snap:
        lines += [
            "",
            f"Net worth: {bold(fmt_gbp(snap.get('netWorthGbp')))}",
            f"MoM change: {bold(fmt_gbp(snap.get('deltaGbp')))}",
        ]
    return "\n".join(lines)
