"""
Polymarket Friction Model
Models real-world friction factors that affect bot trading performance.
Includes: latency, competing bots, spreads, fees, slippage, liquidity,
API issues, market manipulation, and resolution risk.
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum


class MarketLiquidity(Enum):
    """Liquidity tiers based on Polymarket market analysis."""
    HIGH = "high"        # >$1M volume, tight spreads (political, major crypto)
    MEDIUM = "medium"    # $100K-$1M volume
    LOW = "low"          # $10K-$100K volume
    VERY_LOW = "very_low"  # <$10K volume (niche, novelty)


@dataclass
class FrictionParams:
    """Parameters for friction modeling."""
    # Latency: order placement delay in seconds
    latency_min_s: float = 0.5
    latency_max_s: float = 2.0
    latency_mean_s: float = 1.0

    # Competing bots: probability that a faster bot front-runs your order
    frontrun_prob_high_freq: float = 0.40   # 15-min crypto markets
    frontrun_prob_medium: float = 0.15      # popular event markets
    frontrun_prob_low: float = 0.05         # niche/boring markets
    frontrun_price_impact: float = 0.02     # avg price move when front-run

    # Bid-ask spreads by liquidity tier (as fraction of price)
    spread_high_liq: float = 0.02           # 2% for liquid markets
    spread_medium_liq: float = 0.05         # 5% for medium
    spread_low_liq: float = 0.10            # 10% for low
    spread_very_low_liq: float = 0.15       # 15% for very low

    # Fees: Polymarket fee structure
    # Most markets: 0% fees
    # 15-min crypto: up to 1.56% at 50% probability
    # Sports (NCAAB, Serie A): lower fee curve
    fee_rate_crypto: float = 0.25           # feeRate parameter for crypto
    fee_rate_sports: float = 0.0175         # feeRate parameter for sports
    fee_exponent_crypto: float = 1.0
    fee_exponent_sports: float = 1.0

    # Slippage: market impact for $1K account
    slippage_per_dollar_high_liq: float = 0.00001   # negligible
    slippage_per_dollar_medium_liq: float = 0.0001
    slippage_per_dollar_low_liq: float = 0.001
    slippage_per_dollar_very_low_liq: float = 0.005

    # API reliability
    api_failure_rate: float = 0.02          # 2% chance of API issue per trade
    api_delay_penalty: float = 0.01         # additional 1% price move during delay

    # Market manipulation
    manipulation_prob: float = 0.03         # 3% chance of stop-hunting/fake signals
    manipulation_loss_pct: float = 0.05     # 5% loss when manipulated

    # Resolution risk
    resolution_risk_prob: float = 0.02      # 2% chance of ambiguous resolution
    resolution_risk_loss_pct: float = 0.50  # 50% loss on ambiguous resolution


def calculate_polymarket_fee(price: float, shares: float,
                             fee_rate: float = 0.0,
                             exponent: float = 1.0) -> float:
    """
    Calculate Polymarket taker fee using official formula.
    fee = C * p * feeRate * (p * (1 - p))^exponent
    Most markets have fee_rate = 0 (no fees).
    """
    if fee_rate <= 0:
        return 0.0
    p = np.clip(price, 0.01, 0.99)
    fee = shares * p * fee_rate * (p * (1.0 - p)) ** exponent
    return max(0.0, fee)


def get_liquidity_tier(market: Dict) -> MarketLiquidity:
    """Determine liquidity tier based on market volume and characteristics."""
    volume = market.get("volume", 0)
    question = market.get("question", "").lower()

    # High-frequency crypto markets
    if "15-minute" in question or "15 minute" in question:
        return MarketLiquidity.MEDIUM  # decent volume but thin books

    if volume > 1_000_000:
        return MarketLiquidity.HIGH
    elif volume > 100_000:
        return MarketLiquidity.MEDIUM
    elif volume > 10_000:
        return MarketLiquidity.LOW
    else:
        return MarketLiquidity.VERY_LOW


def get_spread(liquidity: MarketLiquidity, params: FrictionParams) -> float:
    """Get bid-ask spread for a given liquidity tier."""
    spreads = {
        MarketLiquidity.HIGH: params.spread_high_liq,
        MarketLiquidity.MEDIUM: params.spread_medium_liq,
        MarketLiquidity.LOW: params.spread_low_liq,
        MarketLiquidity.VERY_LOW: params.spread_very_low_liq,
    }
    return spreads[liquidity]


def get_slippage(position_size: float, liquidity: MarketLiquidity,
                 params: FrictionParams) -> float:
    """Calculate slippage based on position size and liquidity."""
    rates = {
        MarketLiquidity.HIGH: params.slippage_per_dollar_high_liq,
        MarketLiquidity.MEDIUM: params.slippage_per_dollar_medium_liq,
        MarketLiquidity.LOW: params.slippage_per_dollar_low_liq,
        MarketLiquidity.VERY_LOW: params.slippage_per_dollar_very_low_liq,
    }
    return position_size * rates[liquidity]


def get_frontrun_probability(strategy_type: str, liquidity: MarketLiquidity,
                             params: FrictionParams) -> float:
    """
    Probability of being front-run depends on strategy type and market.
    High-frequency strategies in liquid markets face more competition.
    """
    base_prob = {
        MarketLiquidity.HIGH: params.frontrun_prob_medium,
        MarketLiquidity.MEDIUM: params.frontrun_prob_medium,
        MarketLiquidity.LOW: params.frontrun_prob_low,
        MarketLiquidity.VERY_LOW: params.frontrun_prob_low * 0.5,
    }[liquidity]

    # Strategy-specific multipliers
    strategy_multipliers = {
        "momentum": 1.5,         # Very common signal, many bots watch
        "mean_reversion": 1.3,   # Common quantitative signal
        "volatility_selling": 1.0,  # Moderate competition
        "late_convergence": 0.8,    # Less competitive (boring)
        "mispricing": 1.2,          # Model-based, some competition
        "obvious_no": 0.5,          # Low competition
        "kelly_composite": 1.0,     # Moderate
    }
    multiplier = strategy_multipliers.get(strategy_type, 1.0)
    return min(0.6, base_prob * multiplier)


def simulate_latency_impact(price: float, volatility: float,
                            params: FrictionParams) -> float:
    """
    Simulate price movement during latency period.
    Returns the price change (adverse) that occurs while waiting for fill.
    """
    latency = np.random.uniform(params.latency_min_s, params.latency_max_s)
    # Price can move during latency; assume ~0.1% per second in volatile markets
    price_move_per_sec = volatility * 0.01
    adverse_move = latency * price_move_per_sec
    # Random direction but biased adverse (other bots move price against you)
    if np.random.random() < 0.6:  # 60% chance of adverse move
        return adverse_move
    else:
        return -adverse_move * 0.3  # Sometimes favorable but smaller


@dataclass
class FrictionResult:
    """Result of applying friction to a single trade."""
    original_pnl: float = 0.0
    spread_cost: float = 0.0
    slippage_cost: float = 0.0
    fee_cost: float = 0.0
    latency_cost: float = 0.0
    frontrun_cost: float = 0.0
    api_failure_cost: float = 0.0
    manipulation_cost: float = 0.0
    resolution_risk_cost: float = 0.0
    adjusted_pnl: float = 0.0
    trade_killed: bool = False  # True if trade couldn't execute


def apply_friction_to_trade(
    original_pnl: float,
    entry_price: float,
    position_size: float,
    market: Dict,
    strategy_type: str,
    params: FrictionParams,
    is_fee_market: bool = False,
    rng: Optional[np.random.RandomState] = None,
) -> FrictionResult:
    """
    Apply all friction factors to a single trade.
    Returns the friction-adjusted PnL and breakdown of costs.
    """
    if rng is None:
        rng = np.random.RandomState()

    result = FrictionResult(original_pnl=original_pnl)
    liquidity = get_liquidity_tier(market)

    # 1. Spread cost: you always cross the spread to enter and exit
    spread = get_spread(liquidity, params)
    # Entry spread cost (half spread on entry, half on exit)
    shares = position_size / max(entry_price, 0.01)
    result.spread_cost = shares * spread * entry_price  # full round-trip

    # 2. Slippage
    result.slippage_cost = get_slippage(position_size, liquidity, params)

    # 3. Fees (only on fee-enabled markets)
    if is_fee_market:
        fee_rate = params.fee_rate_crypto  # Use crypto rate as default for fee markets
        result.fee_cost = calculate_polymarket_fee(
            entry_price, shares, fee_rate, params.fee_exponent_crypto
        )
    else:
        result.fee_cost = 0.0

    # 4. Latency impact
    # Calculate market volatility proxy from price
    vol_proxy = max(0.01, abs(entry_price - 0.5) * 0.1 + 0.02)
    latency_move = simulate_latency_impact(entry_price, vol_proxy, params)
    result.latency_cost = abs(latency_move) * shares * 0.5  # partial impact

    # 5. Front-running / competing bots
    frontrun_prob = get_frontrun_probability(strategy_type, liquidity, params)
    if rng.random() < frontrun_prob:
        # Got front-run: price moved against us
        result.frontrun_cost = position_size * params.frontrun_price_impact
    else:
        result.frontrun_cost = 0.0

    # 6. API failure
    if rng.random() < params.api_failure_rate:
        # API failed: either miss the trade entirely or get worse fill
        if rng.random() < 0.3:
            # Trade killed entirely
            result.trade_killed = True
            result.api_failure_cost = max(0, original_pnl)  # Missed profit
        else:
            # Delayed fill at worse price
            result.api_failure_cost = position_size * params.api_delay_penalty

    # 7. Market manipulation
    if rng.random() < params.manipulation_prob:
        result.manipulation_cost = position_size * params.manipulation_loss_pct

    # 8. Resolution risk
    if rng.random() < params.resolution_risk_prob:
        result.resolution_risk_cost = position_size * params.resolution_risk_loss_pct

    # Calculate adjusted PnL
    if result.trade_killed:
        result.adjusted_pnl = 0.0
    else:
        total_friction = (
            result.spread_cost +
            result.slippage_cost +
            result.fee_cost +
            result.latency_cost +
            result.frontrun_cost +
            result.api_failure_cost +
            result.manipulation_cost +
            result.resolution_risk_cost
        )
        result.adjusted_pnl = original_pnl - total_friction

    return result


@dataclass
class StrategyFrictionProfile:
    """Profile of how friction affects a specific strategy."""
    strategy_name: str
    strategy_type: str

    # Sensitivity scores (0-10, 10 = most sensitive)
    latency_sensitivity: float = 5.0
    competition_sensitivity: float = 5.0
    spread_sensitivity: float = 5.0
    fee_sensitivity: float = 5.0
    slippage_sensitivity: float = 5.0
    liquidity_sensitivity: float = 5.0
    api_sensitivity: float = 5.0
    manipulation_sensitivity: float = 5.0
    resolution_sensitivity: float = 5.0

    # Computed
    overall_friction_resistance: float = 0.0
    description: str = ""


def get_strategy_friction_profiles() -> Dict[str, StrategyFrictionProfile]:
    """
    Define friction sensitivity profiles for each strategy.
    Based on analysis of strategy mechanics and real-world conditions.
    """
    profiles = {}

    # Strategy 1: Obvious NO / Absurd Markets
    profiles["obvious_no"] = StrategyFrictionProfile(
        strategy_name="Obvious NO / Absurd Markets",
        strategy_type="obvious_no",
        latency_sensitivity=2.0,      # Long hold, timing doesn't matter much
        competition_sensitivity=3.0,  # Few bots in absurd markets
        spread_sensitivity=4.0,       # Moderate - these are often illiquid
        fee_sensitivity=1.0,          # No fees on these markets
        slippage_sensitivity=6.0,     # Often very illiquid
        liquidity_sensitivity=7.0,    # Major issue - thin markets
        api_sensitivity=2.0,          # Long hold, one-time entry
        manipulation_sensitivity=3.0, # Hard to manipulate absurd markets
        resolution_sensitivity=9.0,   # HUGE risk - "absurd" events sometimes happen
        description="Low latency sensitivity but extremely high resolution risk. "
                    "The fundamental problem is that 'absurd' events sometimes happen."
    )

    # Strategy 2: Mean Reversion
    profiles["mean_reversion"] = StrategyFrictionProfile(
        strategy_name="Mean Reversion",
        strategy_type="mean_reversion",
        latency_sensitivity=7.0,      # Needs timely entry at extremes
        competition_sensitivity=8.0,  # Very common quant signal
        spread_sensitivity=8.0,       # Edge is small, spread eats it
        fee_sensitivity=3.0,          # Most markets fee-free
        slippage_sensitivity=6.0,     # Moderate position sizes
        liquidity_sensitivity=7.0,    # Needs liquid markets for quick fills
        api_sensitivity=6.0,          # Time-sensitive entries
        manipulation_sensitivity=7.0, # Stop-hunting targets mean reversion
        resolution_sensitivity=3.0,   # Exits before resolution usually
        description="Highly sensitive to competition and spreads. The small edge "
                    "from mean reversion is easily consumed by friction."
    )

    # Strategy 3: Momentum / Trend Following
    profiles["momentum"] = StrategyFrictionProfile(
        strategy_name="Momentum / Trend Following",
        strategy_type="momentum",
        latency_sensitivity=8.0,      # Needs to catch trends early
        competition_sensitivity=9.0,  # Most common bot strategy
        spread_sensitivity=7.0,       # Many trades, spread adds up
        fee_sensitivity=3.0,          # Most markets fee-free
        slippage_sensitivity=5.0,     # Moderate
        liquidity_sensitivity=6.0,    # Needs liquid markets
        api_sensitivity=7.0,          # Missing a signal is costly
        manipulation_sensitivity=8.0, # Trend fakers target momentum bots
        resolution_sensitivity=4.0,   # Exits before resolution
        description="Extremely sensitive to competition and latency. Momentum signals "
                    "are the most crowded trade in prediction markets."
    )

    # Strategy 4: Late-Stage Convergence
    profiles["late_convergence"] = StrategyFrictionProfile(
        strategy_name="Late-Stage Convergence",
        strategy_type="late_convergence",
        latency_sensitivity=3.0,      # Slow-moving, hours/days to resolution
        competition_sensitivity=5.0,  # Some competition but edge is small
        spread_sensitivity=9.0,       # CRITICAL: edge is only 1-5%, spread kills it
        fee_sensitivity=2.0,          # Usually fee-free markets
        slippage_sensitivity=4.0,     # Small positions
        liquidity_sensitivity=6.0,    # Needs fills near resolution
        api_sensitivity=3.0,          # Not time-critical
        manipulation_sensitivity=2.0, # Hard to manipulate near resolution
        resolution_sensitivity=8.0,   # Entire strategy depends on correct resolution
        description="Spread is the critical friction factor. With only 1-5% edge per trade, "
                    "even a 2% spread eliminates most profit. Resolution risk is also high."
    )

    # Strategy 5: Volatility Selling / Range Trading
    profiles["volatility_selling"] = StrategyFrictionProfile(
        strategy_name="Volatility Selling / Range Trading",
        strategy_type="volatility_selling",
        latency_sensitivity=5.0,      # Moderate - needs entry at range edges
        competition_sensitivity=6.0,  # Market makers compete here
        spread_sensitivity=7.0,       # Range is often similar to spread
        fee_sensitivity=2.0,          # Usually fee-free
        slippage_sensitivity=5.0,     # Moderate positions
        liquidity_sensitivity=6.0,    # Needs stable, liquid markets
        api_sensitivity=4.0,          # Moderate timing needs
        manipulation_sensitivity=6.0, # Range breaks can be manufactured
        resolution_sensitivity=5.0,   # Holds through some resolutions
        description="Moderate friction sensitivity overall. The main risk is that "
                    "spreads consume the range-trading edge, and breakouts cause losses."
    )

    # Strategy 6: Mispricing Detection
    profiles["mispricing"] = StrategyFrictionProfile(
        strategy_name="Mispricing Detection / Edge Finder",
        strategy_type="mispricing",
        latency_sensitivity=6.0,      # Mispricings get corrected fast
        competition_sensitivity=7.0,  # Other models find same mispricings
        spread_sensitivity=6.0,       # Needs edge > spread
        fee_sensitivity=2.0,          # Usually fee-free
        slippage_sensitivity=5.0,     # Moderate
        liquidity_sensitivity=5.0,    # Moderate
        api_sensitivity=5.0,          # Moderate timing
        manipulation_sensitivity=5.0, # Some vulnerability
        resolution_sensitivity=4.0,   # Model-based, exits before resolution
        description="Moderate to high friction sensitivity. Mispricings are corrected "
                    "quickly by competing bots, reducing the available edge."
    )

    # Strategy 7: Kelly Criterion Composite
    profiles["kelly_composite"] = StrategyFrictionProfile(
        strategy_name="Kelly Criterion Composite",
        strategy_type="kelly_composite",
        latency_sensitivity=5.0,      # Moderate
        competition_sensitivity=6.0,  # Depends on underlying signals
        spread_sensitivity=6.0,       # Kelly sizes based on edge, spread reduces edge
        fee_sensitivity=2.0,          # Usually fee-free
        slippage_sensitivity=4.0,     # Kelly sizes conservatively
        liquidity_sensitivity=5.0,    # Moderate
        api_sensitivity=4.0,          # One entry per market
        manipulation_sensitivity=5.0, # Moderate
        resolution_sensitivity=5.0,   # Holds to resolution sometimes
        description="Moderate friction sensitivity. Kelly sizing helps manage risk "
                    "but the underlying signals are affected by the same friction."
    )

    # Compute overall friction resistance (inverse of average sensitivity)
    for key, profile in profiles.items():
        sensitivities = [
            profile.latency_sensitivity,
            profile.competition_sensitivity,
            profile.spread_sensitivity,
            profile.fee_sensitivity,
            profile.slippage_sensitivity,
            profile.liquidity_sensitivity,
            profile.api_sensitivity,
            profile.manipulation_sensitivity,
            profile.resolution_sensitivity,
        ]
        avg_sensitivity = np.mean(sensitivities)
        profile.overall_friction_resistance = round(10.0 - avg_sensitivity, 2)

    return profiles


# ============================================================
# Friction-Resistant Strategy Modifications
# ============================================================

def get_friction_adjusted_params() -> Dict[str, Dict]:
    """
    Return modified strategy parameters that account for friction.
    These are the 'hardened' versions of each strategy.
    """
    return {
        "obvious_no": {
            "max_position_pct": 0.03,  # Reduced from 0.05
            "min_yes_price": 0.03,
            "max_yes_price": 0.12,     # Tighter range (was 0.20)
            "notes": "Tighter entry criteria, smaller positions due to resolution risk"
        },
        "mean_reversion": {
            "max_position_pct": 0.03,  # Reduced from 0.05
            "lookback": 30,            # Longer lookback (was 20)
            "z_threshold": 2.5,        # Higher threshold (was 1.5)
            "notes": "Much higher threshold to ensure edge survives spread costs"
        },
        "momentum": {
            "max_position_pct": 0.03,
            "fast_period": 8,          # Slower (was 5)
            "slow_period": 30,         # Slower (was 20)
            "notes": "Slower signals to reduce whipsaw from competing bots"
        },
        "late_convergence": {
            "max_position_pct": 0.06,  # Can be larger (high win rate)
            "min_probability": 0.95,   # Higher threshold (was 0.90)
            "notes": "Only enter when probability is very high to survive spread"
        },
        "volatility_selling": {
            "max_position_pct": 0.03,  # Reduced
            "min_range": 0.08,         # Wider range required (was 0.03)
            "notes": "Require wider range to ensure edge > spread"
        },
        "mispricing": {
            "max_position_pct": 0.04,  # Slightly reduced
            "min_deviation": 0.10,     # Higher threshold (was 0.05)
            "notes": "Larger mispricing required to survive friction"
        },
        "kelly_composite": {
            "max_position_pct": 0.06,
            "kelly_fraction": 0.15,    # Reduced from 0.25
            "notes": "More conservative Kelly fraction to account for friction"
        },
    }
