"""1Sub SDK HTTP Client"""

import time
import random
from typing import Any, Dict, Optional

import requests

from .errors import parse_api_error, OneSubError


class HttpClient:
    """HTTP client for 1Sub API with retry logic"""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://1sub.io/api/v1",
        timeout: int = 30,
        max_retries: int = 3,
        debug: bool = False
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.debug = debug
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "onesub-python/1.0.0",
        })

    def _log(self, message: str) -> None:
        if self.debug:
            print(f"[1Sub SDK] {message}")

    def _calculate_backoff(self, attempt: int) -> float:
        """Calculate exponential backoff delay"""
        base_delay = 1.0
        max_delay = 30.0
        delay = base_delay * (2 ** attempt)
        jitter = random.random()
        return min(delay + jitter, max_delay)

    def request(
        self,
        method: str,
        path: str,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make an HTTP request with automatic retries"""
        url = f"{self.base_url}{path}"
        last_error: Optional[Exception] = None

        for attempt in range(self.max_retries + 1):
            try:
                self._log(f"{method} {url}")

                response = self.session.request(
                    method=method,
                    url=url,
                    json=data,
                    timeout=self.timeout
                )

                self._log(f"Response: {response.status_code}")

                if response.ok:
                    return response.json()

                # Parse error response
                try:
                    body = response.json()
                except ValueError:
                    body = {"message": response.text}

                # Don't retry client errors (except rate limits)
                if 400 <= response.status_code < 500 and response.status_code != 429:
                    parse_api_error(response.status_code, body)

                parse_api_error(response.status_code, body)

            except OneSubError:
                raise
            except requests.exceptions.Timeout:
                last_error = OneSubError(
                    f"Request timed out after {self.timeout}s",
                    "TIMEOUT",
                    0
                )
            except requests.exceptions.RequestException as e:
                last_error = OneSubError(str(e), "NETWORK_ERROR", 0)

            # Retry with backoff
            if attempt < self.max_retries:
                delay = self._calculate_backoff(attempt)
                self._log(f"Retrying in {delay:.1f}s (attempt {attempt + 1}/{self.max_retries})")
                time.sleep(delay)

        if last_error:
            raise last_error
        raise OneSubError("Request failed after retries", "NETWORK_ERROR", 0)

    def get(self, path: str) -> Dict[str, Any]:
        return self.request("GET", path)

    def post(self, path: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self.request("POST", path, data)

    def close(self) -> None:
        """Close the HTTP session"""
        self.session.close()
