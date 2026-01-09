import pytest
from decimal import Decimal
from datetime import date
from apps.accounts.models import Account, BalanceSnapshot, AssetGroup, AccountType


@pytest.mark.django_db
class TestAccount:
    def test_create_checking_account(self, household):
        account = Account.objects.create(
            household=household,
            name='Main Checking',
            account_type=AccountType.CHECKING,
            institution='Bank of Test'
        )
        assert account.name == 'Main Checking'
        assert account.account_type == AccountType.CHECKING
        assert account.is_asset is True
        assert account.is_liability is False
        assert account.is_liquid is True

    def test_create_credit_card(self, household):
        account = Account.objects.create(
            household=household,
            name='Test Credit Card',
            account_type=AccountType.CREDIT_CARD,
            institution='Credit Corp'
        )
        assert account.is_asset is False
        assert account.is_liability is True
        assert account.is_liquid is False

    def test_current_balance_no_snapshots(self, household):
        account = Account.objects.create(
            household=household,
            name='Empty Account',
            account_type=AccountType.SAVINGS
        )
        assert account.current_balance == Decimal('0')


@pytest.mark.django_db
class TestBalanceSnapshot:
    def test_create_snapshot(self, household):
        account = Account.objects.create(
            household=household,
            name='Test Account',
            account_type=AccountType.CHECKING
        )
        snapshot = BalanceSnapshot.objects.create(
            account=account,
            as_of_date=date.today(),
            balance=Decimal('1000.00')
        )
        assert snapshot.balance == Decimal('1000.00')
        assert account.current_balance == Decimal('1000.00')

    def test_unrealized_gain(self, household):
        account = Account.objects.create(
            household=household,
            name='Investment',
            account_type=AccountType.BROKERAGE
        )
        snapshot = BalanceSnapshot.objects.create(
            account=account,
            as_of_date=date.today(),
            balance=Decimal('15000.00'),
            cost_basis=Decimal('10000.00'),
            market_value=Decimal('15000.00')
        )
        assert snapshot.unrealized_gain == Decimal('5000.00')


@pytest.mark.django_db
class TestAssetGroup:
    def test_create_asset_group(self, household):
        group = AssetGroup.objects.create(
            household=household,
            name='Home + Mortgage',
            description='Primary residence and associated mortgage'
        )
        assert group.name == 'Home + Mortgage'
        assert str(group) == f'{household.name} - Home + Mortgage'
