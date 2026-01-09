from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import IncomeSource, PreTaxDeduction, PostTaxDeduction, SelfEmploymentTax
from .serializers import (
    IncomeSourceSerializer, IncomeSourceDetailSerializer,
    PreTaxDeductionSerializer, PostTaxDeductionSerializer, SelfEmploymentTaxSerializer
)
from .services import PaycheckCalculator
from apps.scenarios.reality_events import emit_taxes_changed


class IncomeSourceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return IncomeSource.objects.filter(household=self.request.household)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return IncomeSourceDetailSerializer
        return IncomeSourceSerializer

    def perform_create(self, serializer):
        serializer.save(household=self.request.household)
        # Emit reality change event
        emit_taxes_changed(self.request.household)

    def perform_update(self, serializer):
        serializer.save()
        # Emit reality change event
        emit_taxes_changed(self.request.household)

    def perform_destroy(self, instance):
        household = instance.household
        instance.delete()
        # Emit reality change event
        emit_taxes_changed(household)

    @action(detail=True, methods=['get'])
    def paycheck(self, request, pk=None):
        """Calculate paycheck breakdown."""
        income_source = self.get_object()
        calc = PaycheckCalculator(income_source)
        breakdown = calc.calculate_paycheck()
        return Response({
            'gross_pay': str(breakdown.gross_pay),
            'pretax_retirement': str(breakdown.pretax_retirement),
            'pretax_health': str(breakdown.pretax_health),
            'pretax_other': str(breakdown.pretax_other),
            'federal_withholding': str(breakdown.federal_withholding),
            'social_security_tax': str(breakdown.social_security_tax),
            'medicare_tax': str(breakdown.medicare_tax),
            'state_withholding': str(breakdown.state_withholding),
            'total_taxes': str(breakdown.total_taxes),
            'net_pay': str(breakdown.net_pay),
            'employer_match': str(breakdown.employer_match),
            'effective_tax_rate': str(breakdown.effective_tax_rate),
        })


class PreTaxDeductionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PreTaxDeductionSerializer

    def get_queryset(self):
        return PreTaxDeduction.objects.filter(
            income_source__household=self.request.household
        )

    def perform_create(self, serializer):
        # Validate that income_source belongs to the user's household
        income_source_id = self.request.data.get('income_source')
        if income_source_id:
            income_source = IncomeSource.objects.filter(
                id=income_source_id,
                household=self.request.household
            ).first()
            if not income_source:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'income_source': 'Invalid income source for this household.'})
        serializer.save()
        # Emit reality change event
        emit_taxes_changed(self.request.household)

    def perform_update(self, serializer):
        serializer.save()
        # Emit reality change event
        emit_taxes_changed(self.request.household)

    def perform_destroy(self, instance):
        household = instance.income_source.household
        instance.delete()
        # Emit reality change event
        emit_taxes_changed(household)


class PostTaxDeductionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PostTaxDeductionSerializer

    def get_queryset(self):
        return PostTaxDeduction.objects.filter(
            income_source__household=self.request.household
        )

    def perform_create(self, serializer):
        # Validate that income_source belongs to the user's household
        income_source_id = self.request.data.get('income_source')
        if income_source_id:
            income_source = IncomeSource.objects.filter(
                id=income_source_id,
                household=self.request.household
            ).first()
            if not income_source:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'income_source': 'Invalid income source for this household.'})
        serializer.save()
        # Emit reality change event
        emit_taxes_changed(self.request.household)

    def perform_update(self, serializer):
        serializer.save()
        # Emit reality change event
        emit_taxes_changed(self.request.household)

    def perform_destroy(self, instance):
        household = instance.income_source.household
        instance.delete()
        # Emit reality change event
        emit_taxes_changed(household)


class SelfEmploymentTaxViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SelfEmploymentTaxSerializer

    def get_queryset(self):
        return SelfEmploymentTax.objects.filter(
            income_source__household=self.request.household
        )

    def perform_create(self, serializer):
        # Validate that income_source belongs to the user's household
        income_source_id = self.request.data.get('income_source')
        if income_source_id:
            income_source = IncomeSource.objects.filter(
                id=income_source_id,
                household=self.request.household
            ).first()
            if not income_source:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'income_source': 'Invalid income source for this household.'})
        serializer.save()
        # Emit reality change event
        emit_taxes_changed(self.request.household)

    def perform_update(self, serializer):
        serializer.save()
        # Emit reality change event
        emit_taxes_changed(self.request.household)

    def perform_destroy(self, instance):
        household = instance.income_source.household
        instance.delete()
        # Emit reality change event
        emit_taxes_changed(household)
