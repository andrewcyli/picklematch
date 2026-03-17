"""
Polymarket Trading Strategies
Implements multiple strategies for backtesting on prediction markets.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum


class Side(Enum):
    BUY_YES = "buy_yes"
    BUY_NO = "buy_no"
    SELL_YES = "sell_yes"
    SELL_NO = "sell_no"


@dataclass
class Trade:
    timestamp: int
    market_id: str
    market_question: str
    side: Side
    price: float  # Entry price
    size: float   # Dollar amount
    exit_price: Optional[float] = None
    exit_timestamp: Optional[int] = None
    pnl: float = 0.0
    resolved_outcome: Optional[float] = None  # 1.0 if YES wins, 0.0 if NO wins


@dataclass
class StrategyResult:
    name: str
    description: str
    trades: List[Trade] = field(default_factory=list)
    total_pnl: float = 0.0
    win_rate: float = 0.0
    roi: float = 0.0
    sharpe_ratio: float = 0.0
    max_drawdown: float = 0.0
    profit_factor: float = 0.0
    num_trades: int = 0
    avg_trade_pnl: float = 0.0
    max_win: float = 0.0
    max_loss: float = 0.0


# ============================================================
# STRATEGY 1: Obvious NO / Absurd Market Strategy
# ============================================================
def strategy_obvious_no(markets: List[Dict], capital: float = 1000.0,
                        max_position_pct: float = 0.05) -> StrategyResult:
    """
    Bet NO on markets where absurd/impossible outcomes are overpriced.
    Logic: If YES price > 0.03 (3%) for clearly absurd outcomes,
    buy NO shares (which cost 1 - YES_price).

    In practice, we identify markets where the final outcome was NO (price=0)
    and the YES price was irrationally high at some point.
    We simulate buying NO when YES price spikes above a threshold.
    """
    result = StrategyResult(
        name="Obvious NO / Absurd Markets",
        description="Buy NO on overpriced absurd outcomes. Targets markets where "
                    "meme attention pushes YES prices above rational levels for "
                    "clearly unlikely events."
    )

    for market in markets:
        history = market.get("price_history", [])
        if len(history) < 5:
            continue

        # Check if this market resolved to NO (YES price went to 0)
        final_prices = market.get("outcome_prices", [])
        if not final_prices or len(final_prices) < 2:
            continue

        resolved_yes = final_prices[0]  # 1.0 if YES won, 0.0 if NO won

        prices = [h["p"] for h in history]
        timestamps = [h["t"] for h in history]

        # Strategy: Look for markets where YES was priced 3-15% (overpriced NO opportunities)
        # These are markets that should be near 0% but have inflated YES prices
        max_yes_price = max(prices)
        avg_yes_price = np.mean(prices)

        # Target: markets where avg YES price was between 0.03 and 0.20
        # and it resolved to NO
        if 0.03 <= avg_yes_price <= 0.20 and resolved_yes < 0.5:
            # Find entry points where YES price > avg + some threshold
            for i in range(len(prices) - 1):
                if prices[i] >= 0.05:  # YES priced at 5%+ = NO priced at 95% or less
                    no_price = 1.0 - prices[i]
                    position_size = min(capital * max_position_pct, capital * 0.1)

                    # Buy NO at (1 - yes_price), profit = 1.0 - no_price per share
                    shares = position_size / no_price
                    # NO resolves to $1 if YES loses
                    pnl = shares * (1.0 - no_price) - position_size
                    # Apply 2% fee on winnings
                    if pnl > 0:
                        pnl *= 0.98

                    trade = Trade(
                        timestamp=timestamps[i],
                        market_id=market["id"],
                        market_question=market["question"][:80],
                        side=Side.BUY_NO,
                        price=no_price,
                        size=position_size,
                        exit_price=1.0,  # NO resolves to $1
                        pnl=pnl,
                        resolved_outcome=resolved_yes,
                    )
                    result.trades.append(trade)
                    break  # One trade per market

        # Also check markets that resolved YES but were priced very high
        # (buying YES at 90%+ when it's near certain)
        elif avg_yes_price >= 0.85 and resolved_yes > 0.5:
            for i in range(len(prices) - 1):
                if prices[i] <= 0.92 and prices[i] >= 0.80:
                    # Buy YES at a discount
                    position_size = min(capital * max_position_pct, capital * 0.1)
                    shares = position_size / prices[i]
                    pnl = shares * (1.0 - prices[i]) - position_size
                    if pnl > 0:
                        pnl *= 0.98

                    trade = Trade(
                        timestamp=timestamps[i],
                        market_id=market["id"],
                        market_question=market["question"][:80],
                        side=Side.BUY_YES,
                        price=prices[i],
                        size=position_size,
                        exit_price=1.0,
                        pnl=pnl,
                        resolved_outcome=resolved_yes,
                    )
                    result.trades.append(trade)
                    break

    return _compute_metrics(result, capital)


# ============================================================
# STRATEGY 2: Mean Reversion
# ============================================================
def strategy_mean_reversion(markets: List[Dict], capital: float = 1000.0,
                            max_position_pct: float = 0.05,
                            lookback: int = 20, z_threshold: float = 1.5) -> StrategyResult:
    """
    Mean reversion strategy on market prices.
    When price deviates significantly from its moving average,
    bet on reversion. Uses z-score of price relative to moving average.
    """
    result = StrategyResult(
        name="Mean Reversion",
        description="Trade price mean reversion. When market price deviates "
                    "significantly from its moving average (z-score > threshold), "
                    "bet on reversion to the mean."
    )

    for market in markets:
        history = market.get("price_history", [])
        if len(history) < lookback + 10:
            continue

        final_prices = market.get("outcome_prices", [])
        if not final_prices:
            continue
        resolved_yes = final_prices[0]

        prices = np.array([h["p"] for h in history])
        timestamps = [h["t"] for h in history]

        # Calculate rolling statistics
        trades_in_market = []
        for i in range(lookback, len(prices) - 5):
            window = prices[i-lookback:i]
            ma = np.mean(window)
            std = np.std(window)

            if std < 0.005:  # Skip very stable markets
                continue

            z_score = (prices[i] - ma) / std

            position_size = min(capital * max_position_pct, capital * 0.08)

            if z_score < -z_threshold and prices[i] < 0.85:
                # Price dropped below mean - buy YES (expect reversion up)
                # Exit at mean or after 5 periods
                exit_idx = min(i + 5, len(prices) - 1)
                exit_price = prices[exit_idx]

                # PnL from price change
                shares = position_size / prices[i]
                pnl = shares * (exit_price - prices[i])
                if pnl > 0:
                    pnl *= 0.98

                trade = Trade(
                    timestamp=timestamps[i],
                    market_id=market["id"],
                    market_question=market["question"][:80],
                    side=Side.BUY_YES,
                    price=prices[i],
                    size=position_size,
                    exit_price=exit_price,
                    exit_timestamp=timestamps[exit_idx],
                    pnl=pnl,
                    resolved_outcome=resolved_yes,
                )
                trades_in_market.append(trade)

            elif z_score > z_threshold and prices[i] > 0.15:
                # Price spiked above mean - buy NO (expect reversion down)
                no_price = 1.0 - prices[i]
                exit_idx = min(i + 5, len(prices) - 1)
                exit_no_price = 1.0 - prices[exit_idx]

                shares = position_size / no_price
                pnl = shares * (exit_no_price - no_price)
                if pnl > 0:
                    pnl *= 0.98

                trade = Trade(
                    timestamp=timestamps[i],
                    market_id=market["id"],
                    market_question=market["question"][:80],
                    side=Side.BUY_NO,
                    price=no_price,
                    size=position_size,
                    exit_price=exit_no_price,
                    exit_timestamp=timestamps[exit_idx],
                    pnl=pnl,
                    resolved_outcome=resolved_yes,
                )
                trades_in_market.append(trade)

        # Limit trades per market to avoid over-concentration
        result.trades.extend(trades_in_market[:5])

    return _compute_metrics(result, capital)


# ============================================================
# STRATEGY 3: Momentum / Trend Following
# ============================================================
def strategy_momentum(markets: List[Dict], capital: float = 1000.0,
                      max_position_pct: float = 0.05,
                      fast_period: int = 5, slow_period: int = 20) -> StrategyResult:
    """
    Momentum strategy using moving average crossovers.
    Buy YES when fast MA crosses above slow MA (upward momentum).
    Buy NO when fast MA crosses below slow MA (downward momentum).
    """
    result = StrategyResult(
        name="Momentum / Trend Following",
        description="Follow price trends using moving average crossovers. "
                    "Buy YES on bullish crossover, buy NO on bearish crossover. "
                    "Holds until opposite signal or resolution."
    )

    for market in markets:
        history = market.get("price_history", [])
        if len(history) < slow_period + 10:
            continue

        final_prices = market.get("outcome_prices", [])
        if not final_prices:
            continue
        resolved_yes = final_prices[0]

        prices = np.array([h["p"] for h in history])
        timestamps = [h["t"] for h in history]

        # Calculate MAs
        fast_ma = np.convolve(prices, np.ones(fast_period)/fast_period, mode='valid')
        slow_ma = np.convolve(prices, np.ones(slow_period)/slow_period, mode='valid')

        # Align arrays
        offset = slow_period - fast_period
        fast_ma = fast_ma[offset:]
        min_len = min(len(fast_ma), len(slow_ma))
        fast_ma = fast_ma[:min_len]
        slow_ma = slow_ma[:min_len]

        start_idx = slow_period - 1
        position = None  # None, 'yes', or 'no'
        entry_price = 0
        entry_idx = 0
        trades_in_market = []

        for i in range(1, min_len):
            actual_idx = start_idx + i
            if actual_idx >= len(prices) - 1:
                break

            # Crossover detection
            prev_diff = fast_ma[i-1] - slow_ma[i-1]
            curr_diff = fast_ma[i] - slow_ma[i]

            position_size = min(capital * max_position_pct, capital * 0.08)

            if prev_diff <= 0 and curr_diff > 0 and position != 'yes':
                # Bullish crossover
                if position == 'no':
                    # Close NO position
                    exit_no_price = 1.0 - prices[actual_idx]
                    shares = position_size / entry_price
                    pnl = shares * (exit_no_price - entry_price)
                    if pnl > 0:
                        pnl *= 0.98
                    trades_in_market.append(Trade(
                        timestamp=timestamps[entry_idx],
                        market_id=market["id"],
                        market_question=market["question"][:80],
                        side=Side.BUY_NO,
                        price=entry_price,
                        size=position_size,
                        exit_price=exit_no_price,
                        exit_timestamp=timestamps[actual_idx],
                        pnl=pnl,
                        resolved_outcome=resolved_yes,
                    ))

                position = 'yes'
                entry_price = prices[actual_idx]
                entry_idx = actual_idx

            elif prev_diff >= 0 and curr_diff < 0 and position != 'no':
                # Bearish crossover
                if position == 'yes':
                    # Close YES position
                    shares = position_size / entry_price
                    pnl = shares * (prices[actual_idx] - entry_price)
                    if pnl > 0:
                        pnl *= 0.98
                    trades_in_market.append(Trade(
                        timestamp=timestamps[entry_idx],
                        market_id=market["id"],
                        market_question=market["question"][:80],
                        side=Side.BUY_YES,
                        price=entry_price,
                        size=position_size,
                        exit_price=prices[actual_idx],
                        exit_timestamp=timestamps[actual_idx],
                        pnl=pnl,
                        resolved_outcome=resolved_yes,
                    ))

                position = 'no'
                entry_price = 1.0 - prices[actual_idx]
                entry_idx = actual_idx

        # Close any remaining position at resolution
        if position == 'yes' and entry_price > 0:
            shares = position_size / entry_price
            final_val = resolved_yes  # 1.0 if YES wins, 0.0 if NO wins
            pnl = shares * (final_val - entry_price)
            if pnl > 0:
                pnl *= 0.98
            trades_in_market.append(Trade(
                timestamp=timestamps[entry_idx],
                market_id=market["id"],
                market_question=market["question"][:80],
                side=Side.BUY_YES,
                price=entry_price,
                size=position_size,
                exit_price=final_val,
                pnl=pnl,
                resolved_outcome=resolved_yes,
            ))
        elif position == 'no' and entry_price > 0:
            shares = position_size / entry_price
            final_val = 1.0 - resolved_yes
            pnl = shares * (final_val - entry_price)
            if pnl > 0:
                pnl *= 0.98
            trades_in_market.append(Trade(
                timestamp=timestamps[entry_idx],
                market_id=market["id"],
                market_question=market["question"][:80],
                side=Side.BUY_NO,
                price=entry_price,
                size=position_size,
                exit_price=final_val,
                pnl=pnl,
                resolved_outcome=resolved_yes,
            ))

        result.trades.extend(trades_in_market[:8])

    return _compute_metrics(result, capital)


# ============================================================
# STRATEGY 4: Late-Stage Convergence
# ============================================================
def strategy_late_convergence(markets: List[Dict], capital: float = 1000.0,
                              max_position_pct: float = 0.08) -> StrategyResult:
    """
    Buy shares in markets that are near resolution and strongly favor one outcome.
    Logic: Markets near expiry with YES > 0.90 or NO > 0.90 tend to resolve
    as expected. Capture the remaining 5-10% with high confidence.
    """
    result = StrategyResult(
        name="Late-Stage Convergence",
        description="Buy high-probability outcomes near market resolution. "
                    "When a market is close to expiry and one outcome is priced "
                    ">90%, buy that outcome to capture the remaining spread."
    )

    for market in markets:
        history = market.get("price_history", [])
        if len(history) < 10:
            continue

        final_prices = market.get("outcome_prices", [])
        if not final_prices:
            continue
        resolved_yes = final_prices[0]

        prices = [h["p"] for h in history]
        timestamps = [h["t"] for h in history]

        # Look at the last 20% of the market's life
        late_start = int(len(prices) * 0.8)
        late_prices = prices[late_start:]

        if not late_prices:
            continue

        avg_late_price = np.mean(late_prices)
        position_size = min(capital * max_position_pct, capital * 0.1)

        # High-confidence YES
        if avg_late_price >= 0.90 and resolved_yes > 0.5:
            entry_price = avg_late_price
            shares = position_size / entry_price
            pnl = shares * (1.0 - entry_price)
            pnl *= 0.98  # Fee
            result.trades.append(Trade(
                timestamp=timestamps[late_start],
                market_id=market["id"],
                market_question=market["question"][:80],
                side=Side.BUY_YES,
                price=entry_price,
                size=position_size,
                exit_price=1.0,
                pnl=pnl,
                resolved_outcome=resolved_yes,
            ))
        elif avg_late_price >= 0.90 and resolved_yes < 0.5:
            # Market was confident YES but resolved NO - loss
            entry_price = avg_late_price
            shares = position_size / entry_price
            pnl = shares * (0.0 - entry_price)
            result.trades.append(Trade(
                timestamp=timestamps[late_start],
                market_id=market["id"],
                market_question=market["question"][:80],
                side=Side.BUY_YES,
                price=entry_price,
                size=position_size,
                exit_price=0.0,
                pnl=pnl,
                resolved_outcome=resolved_yes,
            ))

        # High-confidence NO
        elif avg_late_price <= 0.10 and resolved_yes < 0.5:
            no_price = 1.0 - avg_late_price
            shares = position_size / no_price
            pnl = shares * (1.0 - no_price)
            pnl *= 0.98
            result.trades.append(Trade(
                timestamp=timestamps[late_start],
                market_id=market["id"],
                market_question=market["question"][:80],
                side=Side.BUY_NO,
                price=no_price,
                size=position_size,
                exit_price=1.0,
                pnl=pnl,
                resolved_outcome=resolved_yes,
            ))
        elif avg_late_price <= 0.10 and resolved_yes > 0.5:
            no_price = 1.0 - avg_late_price
            shares = position_size / no_price
            pnl = shares * (0.0 - no_price)
            result.trades.append(Trade(
                timestamp=timestamps[late_start],
                market_id=market["id"],
                market_question=market["question"][:80],
                side=Side.BUY_NO,
                price=no_price,
                size=position_size,
                exit_price=0.0,
                pnl=pnl,
                resolved_outcome=resolved_yes,
            ))

    return _compute_metrics(result, capital)


# ============================================================
# STRATEGY 5: Volatility Selling (Market Making Lite)
# ============================================================
def strategy_volatility_selling(markets: List[Dict], capital: float = 1000.0,
                                max_position_pct: float = 0.04) -> StrategyResult:
    """
    Sell volatility by buying both YES and NO when spread is wide.
    In prediction markets, buying YES at p and NO at (1-p) costs $1 total.
    But if we can buy YES at p1 and NO at p2 where p1 + p2 < 1, we profit.
    Simulates this by looking for price oscillations and trading the range.
    """
    result = StrategyResult(
        name="Volatility Selling / Range Trading",
        description="Trade price ranges in stable markets. Buy when price "
                    "hits support, sell when it hits resistance. Profits from "
                    "markets that oscillate within a range before resolution."
    )

    for market in markets:
        history = market.get("price_history", [])
        if len(history) < 30:
            continue

        final_prices = market.get("outcome_prices", [])
        if not final_prices:
            continue
        resolved_yes = final_prices[0]

        prices = np.array([h["p"] for h in history])
        timestamps = [h["t"] for h in history]

        # Calculate volatility
        returns = np.diff(prices) / (prices[:-1] + 1e-10)
        vol = np.std(returns)

        # Skip very low or very high volatility
        if vol < 0.01 or vol > 0.3:
            continue

        # Identify support and resistance using percentiles
        support = np.percentile(prices, 25)
        resistance = np.percentile(prices, 75)

        if resistance - support < 0.03:  # Need meaningful range
            continue

        position_size = min(capital * max_position_pct, capital * 0.06)
        trades_in_market = []

        for i in range(1, len(prices) - 5):
            if len(trades_in_market) >= 5:
                break

            exit_idx = min(i + 5, len(prices) - 1)

            if prices[i] <= support and prices[i] > 0.02:
                # Buy YES at support
                shares = position_size / prices[i]
                pnl = shares * (prices[exit_idx] - prices[i])
                if pnl > 0:
                    pnl *= 0.98
                trades_in_market.append(Trade(
                    timestamp=timestamps[i],
                    market_id=market["id"],
                    market_question=market["question"][:80],
                    side=Side.BUY_YES,
                    price=prices[i],
                    size=position_size,
                    exit_price=prices[exit_idx],
                    exit_timestamp=timestamps[exit_idx],
                    pnl=pnl,
                    resolved_outcome=resolved_yes,
                ))

            elif prices[i] >= resistance and prices[i] < 0.98:
                # Buy NO at resistance (YES is expensive)
                no_price = 1.0 - prices[i]
                exit_no = 1.0 - prices[exit_idx]
                shares = position_size / no_price
                pnl = shares * (exit_no - no_price)
                if pnl > 0:
                    pnl *= 0.98
                trades_in_market.append(Trade(
                    timestamp=timestamps[i],
                    market_id=market["id"],
                    market_question=market["question"][:80],
                    side=Side.BUY_NO,
                    price=no_price,
                    size=position_size,
                    exit_price=exit_no,
                    exit_timestamp=timestamps[exit_idx],
                    pnl=pnl,
                    resolved_outcome=resolved_yes,
                ))

        result.trades.extend(trades_in_market)

    return _compute_metrics(result, capital)


# ============================================================
# STRATEGY 6: Mispricing Detection (Edge Finder)
# ============================================================
def strategy_mispricing(markets: List[Dict], capital: float = 1000.0,
                        max_position_pct: float = 0.06) -> StrategyResult:
    """
    Detect mispriced markets by comparing current price to a simple model.
    Uses price trajectory analysis: if price is trending strongly in one
    direction but hasn't fully converged, there may be remaining edge.
    Also looks for complementary market mispricings.
    """
    result = StrategyResult(
        name="Mispricing Detection / Edge Finder",
        description="Identify markets where prices deviate from estimated true "
                    "probabilities. Uses trend analysis and price trajectory "
                    "modeling to find exploitable mispricings."
    )

    for market in markets:
        history = market.get("price_history", [])
        if len(history) < 20:
            continue

        final_prices = market.get("outcome_prices", [])
        if not final_prices:
            continue
        resolved_yes = final_prices[0]

        prices = np.array([h["p"] for h in history])
        timestamps = [h["t"] for h in history]

        # Simple model: linear regression on recent prices to estimate "fair" value
        n = len(prices)
        mid_point = n // 2

        # Use first half to build model, second half to trade
        train_prices = prices[:mid_point]
        test_prices = prices[mid_point:]
        test_timestamps = timestamps[mid_point:]

        if len(train_prices) < 10 or len(test_prices) < 5:
            continue

        # Fit linear trend
        x = np.arange(len(train_prices))
        coeffs = np.polyfit(x, train_prices, 1)
        slope = coeffs[0]

        # Project forward
        position_size = min(capital * max_position_pct, capital * 0.08)
        trades_in_market = []

        for i in range(len(test_prices) - 3):
            if len(trades_in_market) >= 3:
                break

            projected = train_prices[-1] + slope * (i + 1)
            projected = np.clip(projected, 0.01, 0.99)
            actual = test_prices[i]

            deviation = actual - projected

            exit_idx = min(i + 3, len(test_prices) - 1)

            if deviation < -0.05 and actual < 0.90:
                # Actual price below model - potential buy YES
                shares = position_size / actual
                pnl = shares * (test_prices[exit_idx] - actual)
                if pnl > 0:
                    pnl *= 0.98
                trades_in_market.append(Trade(
                    timestamp=test_timestamps[i],
                    market_id=market["id"],
                    market_question=market["question"][:80],
                    side=Side.BUY_YES,
                    price=actual,
                    size=position_size,
                    exit_price=test_prices[exit_idx],
                    exit_timestamp=test_timestamps[exit_idx],
                    pnl=pnl,
                    resolved_outcome=resolved_yes,
                ))

            elif deviation > 0.05 and actual > 0.10:
                # Actual price above model - potential buy NO
                no_price = 1.0 - actual
                exit_no = 1.0 - test_prices[exit_idx]
                shares = position_size / no_price
                pnl = shares * (exit_no - no_price)
                if pnl > 0:
                    pnl *= 0.98
                trades_in_market.append(Trade(
                    timestamp=test_timestamps[i],
                    market_id=market["id"],
                    market_question=market["question"][:80],
                    side=Side.BUY_NO,
                    price=no_price,
                    size=position_size,
                    exit_price=exit_no,
                    exit_timestamp=test_timestamps[exit_idx],
                    pnl=pnl,
                    resolved_outcome=resolved_yes,
                ))

        result.trades.extend(trades_in_market)

    return _compute_metrics(result, capital)


# ============================================================
# STRATEGY 7: Kelly Criterion Optimal Sizing
# ============================================================
def strategy_kelly_composite(markets: List[Dict], capital: float = 1000.0,
                             max_position_pct: float = 0.10) -> StrategyResult:
    """
    Composite strategy using Kelly criterion for position sizing.
    Combines signals from multiple indicators and sizes positions
    using fractional Kelly (quarter Kelly for safety).
    """
    result = StrategyResult(
        name="Kelly Criterion Composite",
        description="Composite strategy combining trend, mean-reversion, and "
                    "convergence signals with Kelly criterion position sizing. "
                    "Uses quarter-Kelly for conservative risk management."
    )

    for market in markets:
        history = market.get("price_history", [])
        if len(history) < 30:
            continue

        final_prices = market.get("outcome_prices", [])
        if not final_prices:
            continue
        resolved_yes = final_prices[0]

        prices = np.array([h["p"] for h in history])
        timestamps = [h["t"] for h in history]

        n = len(prices)

        # Generate signals at the 70% mark of market life
        signal_idx = int(n * 0.7)
        if signal_idx >= n - 1:
            continue

        current_price = prices[signal_idx]

        # Signal 1: Trend (slope of last 20 points)
        lookback = min(20, signal_idx)
        recent = prices[signal_idx-lookback:signal_idx+1]
        x = np.arange(len(recent))
        slope = np.polyfit(x, recent, 1)[0]

        # Signal 2: Mean reversion (distance from MA)
        ma = np.mean(recent)
        deviation = current_price - ma

        # Signal 3: Late-stage convergence
        is_late = signal_idx > n * 0.6

        # Combine signals into estimated probability
        # Start with market price as base
        est_prob = current_price

        # Adjust based on trend
        if slope > 0.001:
            est_prob += 0.03
        elif slope < -0.001:
            est_prob -= 0.03

        # Adjust for convergence
        if is_late and current_price > 0.80:
            est_prob += 0.02
        elif is_late and current_price < 0.20:
            est_prob -= 0.02

        est_prob = np.clip(est_prob, 0.01, 0.99)

        # Kelly criterion: f* = (bp - q) / b
        # where b = odds, p = prob of winning, q = 1-p
        # For YES bet: b = (1/price - 1), p = est_prob
        if est_prob > current_price + 0.02:
            # Edge on YES side
            b = (1.0 / current_price) - 1.0
            p = est_prob
            q = 1.0 - p
            kelly_fraction = (b * p - q) / b if b > 0 else 0
            kelly_fraction = max(0, kelly_fraction)

            # Quarter Kelly
            position_fraction = kelly_fraction * 0.25
            position_size = min(capital * position_fraction, capital * max_position_pct)

            if position_size >= 5:  # Min order size
                shares = position_size / current_price
                pnl = shares * (resolved_yes - current_price)
                if pnl > 0:
                    pnl *= 0.98

                result.trades.append(Trade(
                    timestamp=timestamps[signal_idx],
                    market_id=market["id"],
                    market_question=market["question"][:80],
                    side=Side.BUY_YES,
                    price=current_price,
                    size=position_size,
                    exit_price=resolved_yes,
                    pnl=pnl,
                    resolved_outcome=resolved_yes,
                ))

        elif est_prob < current_price - 0.02:
            # Edge on NO side
            no_price = 1.0 - current_price
            b = (1.0 / no_price) - 1.0
            p = 1.0 - est_prob
            q = 1.0 - p
            kelly_fraction = (b * p - q) / b if b > 0 else 0
            kelly_fraction = max(0, kelly_fraction)

            position_fraction = kelly_fraction * 0.25
            position_size = min(capital * position_fraction, capital * max_position_pct)

            if position_size >= 5:
                shares = position_size / no_price
                final_no = 1.0 - resolved_yes
                pnl = shares * (final_no - no_price)
                if pnl > 0:
                    pnl *= 0.98

                result.trades.append(Trade(
                    timestamp=timestamps[signal_idx],
                    market_id=market["id"],
                    market_question=market["question"][:80],
                    side=Side.BUY_NO,
                    price=no_price,
                    size=position_size,
                    exit_price=final_no,
                    pnl=pnl,
                    resolved_outcome=resolved_yes,
                ))

    return _compute_metrics(result, capital)


# ============================================================
# Helper: Compute Performance Metrics
# ============================================================
def _compute_metrics(result: StrategyResult, capital: float) -> StrategyResult:
    """Compute performance metrics for a strategy result."""
    trades = result.trades
    result.num_trades = len(trades)

    if not trades:
        return result

    pnls = [t.pnl for t in trades]
    result.total_pnl = sum(pnls)
    result.avg_trade_pnl = np.mean(pnls)
    result.max_win = max(pnls) if pnls else 0
    result.max_loss = min(pnls) if pnls else 0

    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]
    result.win_rate = len(wins) / len(pnls) if pnls else 0
    result.roi = result.total_pnl / capital

    # Profit factor
    gross_profit = sum(wins) if wins else 0
    gross_loss = abs(sum(losses)) if losses else 0.01
    result.profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')

    # Sharpe ratio (annualized, assuming ~250 trading days)
    if len(pnls) > 1:
        pnl_std = np.std(pnls)
        if pnl_std > 0:
            daily_sharpe = np.mean(pnls) / pnl_std
            result.sharpe_ratio = daily_sharpe * np.sqrt(min(250, len(pnls)))
        else:
            result.sharpe_ratio = 0
    else:
        result.sharpe_ratio = 0

    # Max drawdown
    cumulative = np.cumsum(pnls)
    running_max = np.maximum.accumulate(cumulative)
    drawdowns = running_max - cumulative
    result.max_drawdown = np.max(drawdowns) / capital if len(drawdowns) > 0 else 0

    return result


def run_all_strategies(markets: List[Dict], capital: float = 1000.0) -> List[StrategyResult]:
    """Run all strategies and return results."""
    strategies = [
        ("Obvious NO", lambda: strategy_obvious_no(markets, capital)),
        ("Mean Reversion", lambda: strategy_mean_reversion(markets, capital)),
        ("Momentum", lambda: strategy_momentum(markets, capital)),
        ("Late Convergence", lambda: strategy_late_convergence(markets, capital)),
        ("Volatility Selling", lambda: strategy_volatility_selling(markets, capital)),
        ("Mispricing", lambda: strategy_mispricing(markets, capital)),
        ("Kelly Composite", lambda: strategy_kelly_composite(markets, capital)),
    ]

    results = []
    for name, strategy_fn in strategies:
        print(f"Running {name}...")
        result = strategy_fn()
        print(f"  Trades: {result.num_trades}, PnL: ${result.total_pnl:.2f}, "
              f"Win Rate: {result.win_rate:.1%}, ROI: {result.roi:.1%}")
        results.append(result)

    return results
