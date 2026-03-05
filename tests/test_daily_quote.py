import os
import unittest
from unittest.mock import patch

import app as board_app


class DailyQuoteTests(unittest.TestCase):
    def setUp(self):
        self.client = board_app.app.test_client()
        board_app.QUOTE_CACHE["date"] = None
        board_app.QUOTE_CACHE["quote"] = board_app.DAILY_QUOTE_FALLBACK
        board_app.QUOTE_CACHE["is_fallback"] = True

    @patch.dict(os.environ, {}, clear=True)
    def test_call_quote_api_returns_fallback_without_config(self):
        quote, is_fallback = board_app._call_quote_api("2026-03-05")
        self.assertEqual(quote, board_app.DAILY_QUOTE_FALLBACK)
        self.assertTrue(is_fallback)


    def test_extract_quote_supports_array_content(self):
        payload = {
            "choices": [
                {"message": {"content": [{"type": "text", "text": "向光而行"}]}}
            ]
        }
        quote = board_app._extract_quote(payload)
        self.assertEqual(quote, "向光而行")

    def test_refreshes_when_cache_is_fallback(self):
        board_app.QUOTE_CACHE["date"] = board_app._today_str()
        board_app.QUOTE_CACHE["quote"] = board_app.DAILY_QUOTE_FALLBACK
        board_app.QUOTE_CACHE["is_fallback"] = True

        with patch("app._call_quote_api", return_value=("今天会更好", False)) as mocked:
            resp = self.client.get('/api/daily-quote')

        self.assertEqual(resp.status_code, 200)
        payload = resp.get_json()
        self.assertEqual(payload["quote"], "今天会更好")
        self.assertFalse(payload["isFallback"])
        mocked.assert_called_once()
    @patch.dict(os.environ, {}, clear=True)
    def test_api_response_marks_fallback_flag(self):
        resp = self.client.get('/api/daily-quote')
        self.assertEqual(resp.status_code, 200)
        payload = resp.get_json()
        self.assertEqual(payload["quote"], board_app.DAILY_QUOTE_FALLBACK)
        self.assertTrue(payload["isFallback"])


if __name__ == '__main__':
    unittest.main()
