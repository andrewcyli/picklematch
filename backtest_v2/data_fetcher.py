"""
Polymarket Data Fetcher
Fetches market metadata and price history from Polymarket APIs.
"""

import requests
import json
import time
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

GAMMA_API = "https://gamma-api.polymarket.com"
CLOB_API = "https://clob.polymarket.com"

CACHE_DIR = "/home/ubuntu/backtest/cache"
os.makedirs(CACHE_DIR, exist_ok=True)


def fetch_markets(closed: bool = True, limit: int = 100, offset: int = 0,
                  order: str = "volumeNum", ascending: bool = False,
                  tag_id: Optional[str] = None) -> List[Dict]:
    """Fetch markets from Gamma API."""
    params = {
        "closed": str(closed).lower(),
        "limit": limit,
        "offset": offset,
        "order": order,
        "ascending": str(ascending).lower(),
    }
    if tag_id:
        params["tag_id"] = tag_id

    resp = requests.get(f"{GAMMA_API}/markets", params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_events(closed: bool = True, limit: int = 100, offset: int = 0,
                 order: str = "volume", ascending: bool = False) -> List[Dict]:
    """Fetch events from Gamma API."""
    params = {
        "closed": str(closed).lower(),
        "limit": limit,
        "offset": offset,
        "order": order,
        "ascending": str(ascending).lower(),
    }
    resp = requests.get(f"{GAMMA_API}/events", params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_price_history(token_id: str, interval: str = "max",
                        fidelity: int = 60) -> List[Dict]:
    """Fetch price history from CLOB API."""
    cache_file = os.path.join(CACHE_DIR, f"ph_{token_id[:20]}_{interval}_{fidelity}.json")
    if os.path.exists(cache_file):
        with open(cache_file) as f:
            return json.load(f)

    params = {
        "market": token_id,
        "interval": interval,
        "fidelity": fidelity,
    }
    try:
        resp = requests.get(f"{CLOB_API}/prices-history", params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        history = data.get("history", [])
        if history:
            with open(cache_file, "w") as f:
                json.dump(history, f)
        return history
    except Exception as e:
        print(f"  Error fetching price history for {token_id[:20]}...: {e}")
        return []


def fetch_all_closed_markets(max_markets: int = 500) -> List[Dict]:
    """Fetch a large set of closed markets for backtesting."""
    all_markets = []
    offset = 0
    batch_size = 100

    while len(all_markets) < max_markets:
        markets = fetch_markets(closed=True, limit=batch_size, offset=offset)
        if not markets:
            break
        all_markets.extend(markets)
        offset += batch_size
        time.sleep(0.3)  # Rate limiting

    return all_markets[:max_markets]


def parse_market(market: Dict) -> Dict:
    """Parse a market dict into a clean format."""
    try:
        outcomes = json.loads(market.get("outcomes", "[]"))
        outcome_prices = json.loads(market.get("outcomePrices", "[]"))
        clob_tokens = json.loads(market.get("clobTokenIds", "[]"))
    except (json.JSONDecodeError, TypeError):
        outcomes = []
        outcome_prices = []
        clob_tokens = []

    return {
        "id": market.get("id"),
        "question": market.get("question", ""),
        "outcomes": outcomes,
        "outcome_prices": [float(p) for p in outcome_prices] if outcome_prices else [],
        "clob_tokens": clob_tokens,
        "volume": float(market.get("volumeNum", 0)),
        "created_at": market.get("createdAt", ""),
        "closed_time": market.get("closedTime", ""),
        "active": market.get("active", False),
        "closed": market.get("closed", False),
        "neg_risk": market.get("negRisk", False),
        "order_min_size": float(market.get("orderMinSize", 5)),
        "tick_size": float(market.get("orderPriceMinTickSize", 0.001)),
    }


def get_market_with_history(market: Dict, interval: str = "max",
                            fidelity: int = 60) -> Optional[Dict]:
    """Get a parsed market with its price history attached."""
    parsed = parse_market(market)
    if not parsed["clob_tokens"]:
        return None

    # Fetch history for the first outcome (YES token)
    history = fetch_price_history(parsed["clob_tokens"][0], interval, fidelity)
    if not history:
        return None

    parsed["price_history"] = history
    return parsed


def build_dataset(n_markets: int = 200, min_volume: float = 10000,
                  min_history_points: int = 20) -> List[Dict]:
    """Build a dataset of markets with price histories for backtesting."""
    print(f"Fetching up to {n_markets} closed markets...")
    raw_markets = fetch_all_closed_markets(max_markets=n_markets * 2)
    print(f"  Fetched {len(raw_markets)} raw markets")

    dataset = []
    for i, m in enumerate(raw_markets):
        if len(dataset) >= n_markets:
            break

        parsed = parse_market(m)
        if parsed["volume"] < min_volume:
            continue
        if not parsed["clob_tokens"]:
            continue

        # Fetch price history
        history = fetch_price_history(parsed["clob_tokens"][0], "max", 60)
        if len(history) < min_history_points:
            # Try with lower fidelity
            history = fetch_price_history(parsed["clob_tokens"][0], "max", 1440)

        if len(history) >= min_history_points:
            parsed["price_history"] = history
            dataset.append(parsed)
            if len(dataset) % 10 == 0:
                print(f"  Collected {len(dataset)} markets with history...")

        time.sleep(0.2)  # Rate limiting

    print(f"Final dataset: {len(dataset)} markets with price history")
    return dataset


if __name__ == "__main__":
    # Quick test
    markets = fetch_markets(closed=False, limit=5)
    print(f"Active markets: {len(markets)}")
    for m in markets:
        p = parse_market(m)
        print(f"  {p['question'][:60]} | Vol: ${p['volume']:,.0f}")
