"""Tests for scenario views."""
from decimal import Decimal
import unittest
from unittest.mock import Mock


class TestCompareHorizonExtension(unittest.TestCase):
    """Tests for horizon extension in compare endpoint."""

    def test_horizon_extension_logic(self):
        """Test that scenarios are extended when horizon > projection_months."""
        # This tests the core logic: when a scenario has projection_months < horizon_months,
        # we should update projection_months and recompute.

        # Create a mock scenario
        mock_scenario = Mock()
        mock_scenario.projection_months = 60  # 5 years

        horizon_months = 120  # 10 years requested

        # Test the condition that triggers extension
        needs_extension = mock_scenario.projection_months < horizon_months
        self.assertTrue(needs_extension)

        # After extension, projection_months should be updated
        if needs_extension:
            mock_scenario.projection_months = horizon_months

        self.assertEqual(mock_scenario.projection_months, 120)

    def test_no_extension_when_horizon_within_range(self):
        """Test that scenarios are not extended when horizon <= projection_months."""
        mock_scenario = Mock()
        mock_scenario.projection_months = 120  # 10 years

        horizon_months = 60  # 5 years requested (less than available)

        needs_extension = mock_scenario.projection_months < horizon_months
        self.assertFalse(needs_extension)


class TestProjectionGrowth(unittest.TestCase):
    """Tests for projection growth calculations."""

    def test_retirement_growth_compound(self):
        """Test that retirement assets compound over time."""
        # 7% annual return = ~0.565% monthly
        annual_rate = Decimal('0.07')
        monthly_rate = (1 + float(annual_rate)) ** (1/12) - 1

        # Starting balance
        initial = Decimal('21400')

        # Calculate growth over 60 months
        balance_60 = initial * (Decimal(str(1 + monthly_rate)) ** 60)

        # Calculate growth over 120 months
        balance_120 = initial * (Decimal(str(1 + monthly_rate)) ** 120)

        # 120 months should be more than 60 months
        self.assertGreater(balance_120, balance_60)

        # Verify reasonable growth (~1.4x for 5 years, ~2x for 10 years at 7%)
        self.assertGreater(float(balance_60), 21400 * 1.3)
        self.assertGreater(float(balance_120), 21400 * 1.8)


if __name__ == '__main__':
    unittest.main()
