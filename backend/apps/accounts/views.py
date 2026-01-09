from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from datetime import date
from decimal import Decimal

from .models import Account, BalanceSnapshot, AssetGroup, LiabilityDetails, AssetDetails
from .serializers import (
    AccountSerializer, AccountDetailSerializer,
    BalanceSnapshotSerializer, AssetGroupSerializer
)
from apps.scenarios.reality_events import emit_accounts_changed


class AccountViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Account.objects.filter(household=self.request.household)
        if self.request.query_params.get('active_only', 'true').lower() == 'true':
            qs = qs.filter(is_active=True)
        account_type = self.request.query_params.get('type')
        if account_type:
            qs = qs.filter(account_type=account_type)
        return qs.select_related('asset_group', 'owner').prefetch_related('snapshots')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AccountDetailSerializer
        return AccountSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        account = serializer.save(household=self.request.household)
        # Create initial balance snapshot if provided
        balance = self.request.data.get('initial_balance')
        if balance:
            BalanceSnapshot.objects.create(
                account=account,
                as_of_date=date.today(),
                balance=Decimal(str(balance))
            )
        # Emit reality change event
        emit_accounts_changed(self.request.household, str(account.id))

    def perform_update(self, serializer):
        account = serializer.save()
        # Emit reality change event
        emit_accounts_changed(self.request.household, str(account.id))

    def perform_destroy(self, instance):
        household = instance.household
        account_id = str(instance.id)
        instance.delete()
        # Emit reality change event
        emit_accounts_changed(household, account_id)

    @action(detail=True, methods=['post'])
    def balance(self, request, pk=None):
        """Update account balance with new snapshot."""
        account = self.get_object()
        serializer = BalanceSnapshotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(account=account)
        # Emit reality change event
        emit_accounts_changed(request.household, str(account.id))
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get balance history for account."""
        account = self.get_object()
        snapshots = account.snapshots.all()

        page = self.paginate_queryset(snapshots)
        if page is not None:
            serializer = BalanceSnapshotSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = BalanceSnapshotSerializer(snapshots, many=True)
        return Response(serializer.data)


class AssetGroupViewSet(viewsets.ModelViewSet):
    serializer_class = AssetGroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AssetGroup.objects.filter(household=self.request.household)

    def perform_create(self, serializer):
        serializer.save(household=self.request.household)
