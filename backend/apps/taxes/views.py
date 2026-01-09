from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import IncomeSource, W2Withholding, PreTaxDeduction, PostTaxDeduction, SelfEmploymentTax
from .serializers import (
    IncomeSourceSerializer, IncomeSourceDetailSerializer, W2WithholdingSerializer,
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


class W2WithholdingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = W2WithholdingSerializer

    def get_queryset(self):
        return W2Withholding.objects.filter(
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


class TaxSummaryView(APIView):
    """
    Tax summary endpoint.

    GET /api/v1/taxes/summary/

    Returns comprehensive tax information for all income sources.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        household = request.household
        income_sources = IncomeSource.objects.filter(
            household=household,
            is_active=True
        ).prefetch_related(
            'pretax_deductions',
            'posttax_deductions',
            'self_employment_tax'
        )

        total_gross = Decimal('0')
        total_federal_withholding = Decimal('0')
        total_state_withholding = Decimal('0')
        total_fica = Decimal('0')
        total_pretax_deductions = Decimal('0')
        total_net = Decimal('0')
        total_quarterly_estimates = Decimal('0')

        income_breakdown = []

        for source in income_sources:
            calc = PaycheckCalculator(source)
            breakdown = calc.calculate_paycheck()

            # Annual amounts
            periods_per_year = {
                'weekly': 52,
                'biweekly': 26,
                'semimonthly': 24,
                'monthly': 12,
            }
            multiplier = periods_per_year.get(source.pay_frequency, 12)

            annual_gross = breakdown.gross_pay * multiplier
            annual_federal = breakdown.federal_withholding * multiplier
            annual_state = breakdown.state_withholding * multiplier
            annual_fica = (breakdown.social_security_tax + breakdown.medicare_tax) * multiplier
            annual_pretax = (breakdown.pretax_retirement + breakdown.pretax_health + breakdown.pretax_other) * multiplier
            annual_net = breakdown.net_pay * multiplier

            total_gross += annual_gross
            total_federal_withholding += annual_federal
            total_state_withholding += annual_state
            total_fica += annual_fica
            total_pretax_deductions += annual_pretax
            total_net += annual_net

            # Check for self-employment quarterly estimates
            se_tax = getattr(source, 'self_employment_tax', None)
            if se_tax and hasattr(se_tax, 'quarterly_estimate_amount'):
                quarterly = se_tax.quarterly_estimate_amount or Decimal('0')
                total_quarterly_estimates += quarterly * 4  # Annual

            income_breakdown.append({
                'source_id': str(source.id),
                'source_name': source.name,
                'income_type': source.income_type,
                'gross_annual': str(source.gross_annual),
                'federal_withholding_annual': str(annual_federal),
                'state_withholding_annual': str(annual_state),
                'fica_annual': str(annual_fica),
                'pretax_deductions_annual': str(annual_pretax),
                'net_annual': str(annual_net),
                'effective_rate': str(breakdown.effective_tax_rate),
            })

        # Determine filing status and basic info
        filing_status = household.tax_filing_status
        state = household.state_of_residence

        # Calculate total taxes
        total_taxes = total_federal_withholding + total_state_withholding + total_fica

        # Effective rate
        effective_rate = (total_taxes / total_gross * 100) if total_gross > 0 else Decimal('0')

        return Response({
            'filing_status': filing_status,
            'state_of_residence': state,
            'summary': {
                'total_gross_annual': str(total_gross),
                'total_federal_withholding': str(total_federal_withholding),
                'total_state_withholding': str(total_state_withholding),
                'total_fica': str(total_fica),
                'total_pretax_deductions': str(total_pretax_deductions),
                'total_taxes': str(total_taxes),
                'total_net_annual': str(total_net),
                'effective_tax_rate': str(effective_rate.quantize(Decimal('0.01'))),
                'quarterly_estimates': str(total_quarterly_estimates),
            },
            'income_sources': income_breakdown,
            'tax_strategies': _get_tax_strategy_suggestions(
                total_gross, total_pretax_deductions, income_sources
            ),
        })


def _get_tax_strategy_suggestions(gross: Decimal, pretax: Decimal, sources) -> list:
    """Generate tax optimization suggestions."""
    suggestions = []

    # Check 401k contribution room
    max_401k = Decimal('23000')  # 2024 limit
    current_401k = Decimal('0')

    for source in sources:
        for ded in source.pretax_deductions.all():
            if ded.deduction_type in ('traditional_401k', 'roth_401k'):
                if ded.amount_type == 'percentage':
                    # amount is stored as decimal (0.06 for 6%), no division needed
                    current_401k += (source.gross_annual * ded.amount)
                else:
                    current_401k += ded.amount * 12  # Assuming monthly

    if current_401k < max_401k:
        room = max_401k - current_401k
        suggestions.append({
            'id': 'increase_401k',
            'title': 'Maximize 401(k) Contributions',
            'description': f'You have ${room:,.0f} remaining 401(k) contribution room.',
            'potential_savings': str((room * Decimal('0.22')).quantize(Decimal('0.01'))),  # Rough 22% bracket
            'action_template': 'change_401k',
        })

    # Check HSA contribution
    max_hsa = Decimal('4150')  # 2024 individual limit
    current_hsa = Decimal('0')

    for source in sources:
        for ded in source.pretax_deductions.all():
            if ded.deduction_type == 'hsa':
                if ded.amount_type == 'percentage':
                    # amount is stored as decimal (0.06 for 6%), no division needed
                    current_hsa += (source.gross_annual * ded.amount)
                else:
                    current_hsa += ded.amount * 12

    if current_hsa < max_hsa:
        room = max_hsa - current_hsa
        suggestions.append({
            'id': 'increase_hsa',
            'title': 'Maximize HSA Contributions',
            'description': f'You have ${room:,.0f} remaining HSA contribution room.',
            'potential_savings': str((room * Decimal('0.30')).quantize(Decimal('0.01'))),  # Triple tax benefit
            'action_template': 'change_hsa',
        })

    # Check for self-employment without quarterly estimates
    for source in sources:
        if source.income_type in ('self_employed', '1099'):
            se_tax = getattr(source, 'self_employment_tax', None)
            if not se_tax or not se_tax.quarterly_estimate_amount:
                suggestions.append({
                    'id': 'quarterly_estimates',
                    'title': 'Set Up Quarterly Estimates',
                    'description': f'Self-employment income "{source.name}" may require quarterly estimated payments.',
                    'potential_savings': 'Avoid underpayment penalties',
                    'action_template': 'set_quarterly_estimates',
                })

    return suggestions
