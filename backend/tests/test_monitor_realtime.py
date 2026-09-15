"""Run with: python -m unittest discover -s tests -p 'test_monitor_*.py'."""
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app.services import monitor_service as monitor
from app.services.prometheus_service import PrometheusClient, _vector_value


class NetworkSamplingTests(unittest.TestCase):
    def setUp(self):
        monitor._network_sample = None

    def test_first_sample_is_unknown_then_real_rate(self):
        counters = [SimpleNamespace(bytes_recv=100, bytes_sent=200),
                    SimpleNamespace(bytes_recv=150, bytes_sent=300)]
        with patch.object(monitor.time, 'monotonic', side_effect=[10, 15]), patch.object(monitor.psutil, 'net_io_counters', side_effect=counters):
            self.assertIsNone(monitor._network_snapshot().rx_bytes_per_second)
            sample = monitor._network_snapshot()
            self.assertEqual(sample.rx_bytes_per_second, 10)
            self.assertEqual(sample.tx_bytes_per_second, 20)
            self.assertEqual(sample.sent_bytes, 300)

    def test_counter_reset_is_not_a_negative_rate(self):
        monitor._network_sample = (1, 1000, 1000)
        with patch.object(monitor.time, 'monotonic', return_value=2), patch.object(monitor.psutil, 'net_io_counters', return_value=SimpleNamespace(bytes_recv=10, bytes_sent=20)):
            self.assertIsNone(monitor._network_snapshot().rx_bytes_per_second)

    def test_missing_counter(self):
        with patch.object(monitor.psutil, 'net_io_counters', return_value=None):
            self.assertIsNone(monitor._network_snapshot().received_bytes)

    def test_invalid_prometheus_number(self):
        self.assertEqual(_vector_value({'value': [1, 'NaN']}, -1), -1)
        client = PrometheusClient(SimpleNamespace(PROMETHEUS_BASE_URL='http://localhost', PROMETHEUS_TIMEOUT_SECONDS=1, PROMETHEUS_DEFAULT_RANGE_MINUTES=1))
        with patch.object(client, 'query', return_value=[{'value': [1, 'Inf']}]):
            self.assertEqual(client.scalar('test', default=-1), -1)


if __name__ == '__main__':
    unittest.main()
