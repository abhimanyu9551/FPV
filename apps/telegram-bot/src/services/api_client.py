"""
API client for the FPV Finance Dashboard.
All bot commands call these methods — no business logic here.
"""
import httpx
from src.config import FINANCE_API_BASE_URL, BOT_API_SECRET

BASE = FINANCE_API_BASE_URL.rstrip("/")
HEADERS = {
    "x-bot-secret": BOT_API_SECRET,
    "Content-Type": "application/json",
}


async def get_dashboard() -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{BASE}/api/v1/dashboard", headers=HEADERS)
        r.raise_for_status()
        return r.json()


async def get_reports() -> list:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{BASE}/api/v1/reports", headers=HEADERS)
        r.raise_for_status()
        return r.json()


async def get_debt_plan(strategy: str = "AVALANCHE") -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{BASE}/api/v1/debts/plan",
            params={"strategy": strategy},
            headers=HEADERS,
        )
        r.raise_for_status()
        return r.json()


async def add_income(income_source_id: str, amount: float, currency: str, exchange_rate: float | None = None) -> dict:
    payload = {
        "incomeSourceId": income_source_id,
        "receivedDate": _today(),
        "originalAmount": amount,
        "originalCurrency": currency,
    }
    if exchange_rate:
        payload["exchangeRate"] = exchange_rate
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(f"{BASE}/api/v1/income", json=payload, headers=HEADERS)
        r.raise_for_status()
        return r.json()


async def list_income_sources() -> list:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{BASE}/api/v1/income/sources", headers=HEADERS)
        r.raise_for_status()
        return r.json()


async def get_remittance_categories() -> list:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{BASE}/api/v1/remittances/categories", headers=HEADERS)
        r.raise_for_status()
        return r.json()


def _today() -> str:
    from datetime import date
    return date.today().isoformat()
