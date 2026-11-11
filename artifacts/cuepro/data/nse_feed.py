"""
CUE-PRO Live NSE Data Feed
Cookie-bootstrapped client for option-chain-v3 and allIndices.
Handles session cookies, retries, expiry selection, and converts
raw JSON into DataFrames ready for aggregate_coi().
"""

import requests
import pandas as pd
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple, Any
import time
import logging

logger = logging.getLogger(__name__)

NSE_BASE = "https://www.nseindia.com"
OPTION_CHAIN_PAGE = f"{NSE_BASE}/option-chain"
CONTRACT_INFO = f"{NSE_BASE}/api/option-chain-contract-info"
CHAIN_V3 = f"{NSE_BASE}/api/option-chain-v3"
ALL_INDICES = f"{NSE_BASE}/api/allIndices"

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": OPTION_CHAIN_PAGE,
    "Origin": NSE_BASE,
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
}

INDEX_SYMBOLS = {"NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"}


class NSEClient:
    def __init__(self, timeout: int = 15, max_retries: int = 2):
        self.session = requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)
        self.timeout = timeout
        self.max_retries = max_retries
        self._cookies_fresh = False
        self._last_cookie_time = 0.0

    def _bootstrap_cookies(self) -> bool:
        """Visit the option-chain page to obtain Akamai/session cookies."""
        try:
            # First hit homepage (sometimes needed)
            self.session.get(NSE_BASE, timeout=self.timeout)
            time.sleep(0.5)
            resp = self.session.get(OPTION_CHAIN_PAGE, timeout=self.timeout)
            if resp.status_code in (200, 403):  # 403 can still set cookies
                self._cookies_fresh = True
                self._last_cookie_time = time.time()
                logger.info("NSE cookies bootstrapped")
                return True
            logger.warning("Cookie bootstrap status %s", resp.status_code)
            return False
        except Exception as e:
            logger.error("Cookie bootstrap failed: %s", e)
            return False

    def _ensure_cookies(self):
        # Refresh cookies every 8 minutes or if never set
        if not self._cookies_fresh or (time.time() - self._last_cookie_time) > 480:
            self._bootstrap_cookies()

    def _get(self, url: str, params: Optional[dict] = None) -> Optional[dict]:
        self._ensure_cookies()
        for attempt in range(self.max_retries + 1):
            try:
                resp = self.session.get(url, params=params, timeout=self.timeout)
                if resp.status_code == 200:
                    data = resp.json()
                    if data:  # reject empty {}
                        return data
                elif resp.status_code in (401, 403, 429):
                    logger.warning("NSE %s on %s — refreshing cookies", resp.status_code, url)
                    self._bootstrap_cookies()
                    time.sleep(1.2)
                else:
                    logger.warning("NSE status %s for %s", resp.status_code, url)
            except Exception as e:
                logger.error("Request error attempt %s: %s", attempt + 1, e)
            time.sleep(0.8 * (attempt + 1))
        return None

    def get_expiries(self, symbol: str) -> List[str]:
        """Return list of expiry dates (strings as returned by NSE, usually DD-MMM-YYYY)."""
        params = {"symbol": symbol}
        data = self._get(CONTRACT_INFO, params)
        if not data:
            return []
        # Common shapes: {"expiryDates": [...]} or records.expiryDates
        expiries = (
            data.get("expiryDates")
            or data.get("records", {}).get("expiryDates")
            or []
        )
        return expiries if isinstance(expiries, list) else []

    def pick_nearest_expiry(self, symbol: str) -> Optional[str]:
        """Drop past dates and return the nearest future expiry string."""
        expiries = self.get_expiries(symbol)
        if not expiries:
            return None
        today = date.today()
        valid = []
        for exp in expiries:
            try:
                # NSE usually returns "09-Nov-2026" or similar
                dt = datetime.strptime(exp, "%d-%b-%Y").date()
                if dt >= today:
                    valid.append((dt, exp))
            except ValueError:
                continue
        if not valid:
            return expiries[0]  # fallback
        valid.sort()
        return valid[0][1]

    def get_option_chain(
        self, symbol: str, expiry: Optional[str] = None
    ) -> Optional[pd.DataFrame]:
        """
        Fetch chain and return DataFrame with columns:
        strike, call_oi, put_oi, call_coi, put_coi, call_ltp, put_ltp, call_iv, put_iv
        """
        if expiry is None:
            expiry = self.pick_nearest_expiry(symbol)
        if not expiry:
            logger.error("No expiry available for %s", symbol)
            return None

        params = {
            "type": "Indices" if symbol.upper() in INDEX_SYMBOLS else "Equity",
            "symbol": symbol.upper(),
            "expiry": expiry,
        }
        data = self._get(CHAIN_V3, params)
        if not data:
            return None

        records = data.get("records", {})
        chain_data = records.get("data", [])
        if not chain_data:
            logger.warning("Empty chain data for %s %s", symbol, expiry)
            return None

        rows = []
        for item in chain_data:
            strike = item.get("strikePrice")
            if strike is None:
                continue
            ce = item.get("CE") or {}
            pe = item.get("PE") or {}
            rows.append({
                "strike": float(strike),
                "call_oi": float(ce.get("openInterest") or 0),
                "put_oi": float(pe.get("openInterest") or 0),
                "call_coi": float(ce.get("changeinOpenInterest") or 0),
                "put_coi": float(pe.get("changeinOpenInterest") or 0),
                "call_ltp": float(ce.get("lastPrice") or 0),
                "put_ltp": float(pe.get("lastPrice") or 0),
                "call_iv": float(ce.get("impliedVolatility") or 0),
                "put_iv": float(pe.get("impliedVolatility") or 0),
                "expiry": expiry,
            })

        if not rows:
            return None
        df = pd.DataFrame(rows).sort_values("strike").reset_index(drop=True)
        return df

    def get_indices(self) -> Dict[str, Any]:
        """Return dict of index name -> {last, change, pChange, ...} plus India VIX."""
        data = self._get(ALL_INDICES)
        if not data:
            return {}
        result = {}
        for idx in data.get("data", []):
            name = idx.get("index") or idx.get("indexSymbol")
            if name:
                result[name] = {
                    "last": idx.get("last"),
                    "change": idx.get("variation") or idx.get("change"),
                    "pChange": idx.get("percentChange") or idx.get("pChange"),
                    "open": idx.get("open"),
                    "high": idx.get("high"),
                    "low": idx.get("low"),
                    "previousClose": idx.get("previousClose"),
                }
        return result

    def get_spot_and_vix(self, symbol: str = "NIFTY") -> Tuple[Optional[float], Optional[float]]:
        """Convenience: spot for symbol + India VIX."""
        indices = self.get_indices()
        # Map common names
        name_map = {
            "NIFTY": "NIFTY 50",
            "BANKNIFTY": "NIFTY BANK",
            "FINNIFTY": "NIFTY FIN SERVICE",
            "MIDCPNIFTY": "NIFTY MID SELECT",
        }
        key = name_map.get(symbol.upper(), symbol)
        spot = None
        for k, v in indices.items():
            if key.upper() in k.upper() or symbol.upper() in k.upper():
                spot = v.get("last")
                break
        vix = None
        for k, v in indices.items():
            if "VIX" in k.upper():
                vix = v.get("last")
                break
        return spot, vix

    def get_multi_expiry_chains(
        self, symbol: str, n_expiries: int = 3
    ) -> Dict[str, pd.DataFrame]:
        """Fetch nearest n expiries and return {expiry_str: DataFrame}."""
        expiries = self.get_expiries(symbol)
        today = date.today()
        valid = []
        for exp in expiries:
            try:
                dt = datetime.strptime(exp, "%d-%b-%Y").date()
                if dt >= today:
                    valid.append(exp)
            except ValueError:
                continue
        valid = valid[:n_expiries]
        chains = {}
        for exp in valid:
            df = self.get_option_chain(symbol, expiry=exp)
            if df is not None and not df.empty:
                chains[exp] = df
            time.sleep(0.4)  # polite delay
        return chains


# Singleton-style convenience
_client: Optional[NSEClient] = None


def get_client() -> NSEClient:
    global _client
    if _client is None:
        _client = NSEClient()
    return _client
