"""
CrimeLens - Centralized Thread-Safe Parameter-Aware In-Memory Cache Service
Provides robust, high-performance in-memory caching with:
- Strict dataset namespace separation ('real' vs 'synthetic') preventing cache cross-contamination
- Deterministic canonical cache key generation across filter parameters
- Configurable TTL (Time-To-Live) and max capacity with LRU eviction
- Complete thread safety via reentrant lock
"""

import time
import json
import threading
from typing import Any, Optional, Dict, Tuple
from collections import OrderedDict


class CacheEntry:
    __slots__ = ('value', 'expires_at', 'created_at')

    def __init__(self, value: Any, ttl_seconds: float):
        self.value = value
        self.created_at = time.time()
        self.expires_at = self.created_at + ttl_seconds if ttl_seconds > 0 else float('inf')

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class InMemoryCache:
    def __init__(self, max_size: int = 256, default_ttl: float = 300.0):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._store: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    def _make_key(self, namespace: str, dataset: str, params: Optional[Dict[str, Any]] = None) -> str:
        """
        Generates a canonical, collision-free cache key including namespace, dataset, and normalized params.
        """
        clean_ds = str(dataset).lower().strip()
        if clean_ds in ["synthetic", "synthetic_demo", "synthetic_data", "demo"]:
            ds_prefix = "synth"
        else:
            ds_prefix = "real"

        if not params:
            param_str = "{}"
        else:
            # Filter out None and empty strings for canonical equivalence
            clean_params = {
                k: v for k, v in params.items()
                if v is not None and v != "" and v != []
            }
            param_str = json.dumps(clean_params, sort_keys=True, default=str)

        return f"{namespace}::{ds_prefix}::{param_str}"

    def get(self, namespace: str, dataset: str, params: Optional[Dict[str, Any]] = None) -> Optional[Any]:
        key = self._make_key(namespace, dataset, params)
        with self._lock:
            if key in self._store:
                entry = self._store[key]
                if entry.is_expired():
                    del self._store[key]
                    self._misses += 1
                    return None
                # Move to end (MRU)
                self._store.move_to_end(key)
                self._hits += 1
                return entry.value
            self._misses += 1
            return None

    def set(self, namespace: str, dataset: str, value: Any, params: Optional[Dict[str, Any]] = None, ttl: Optional[float] = None) -> None:
        key = self._make_key(namespace, dataset, params)
        entry_ttl = ttl if ttl is not None else self.default_ttl
        with self._lock:
            if key in self._store:
                self._store.move_to_end(key)
            self._store[key] = CacheEntry(value, entry_ttl)
            # Evict oldest if exceeding max_size
            while len(self._store) > self.max_size:
                self._store.popitem(last=False)
                self._evictions += 1

    def clear(self, namespace: Optional[str] = None) -> int:
        with self._lock:
            if namespace is None:
                count = len(self._store)
                self._store.clear()
                return count
            keys_to_del = [k for k in self._store if k.startswith(f"{namespace}::")]
            for k in keys_to_del:
                del self._store[k]
            return len(keys_to_del)

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            total_reqs = self._hits + self._misses
            hit_rate = (self._hits / total_reqs * 100) if total_reqs > 0 else 0.0
            return {
                "size": len(self._store),
                "max_size": self.max_size,
                "hits": self._hits,
                "misses": self._misses,
                "evictions": self._evictions,
                "hit_rate_pct": round(hit_rate, 2)
            }


# Global singleton cache instance for CrimeLens API
GLOBAL_CACHE = InMemoryCache(max_size=512, default_ttl=300.0)
