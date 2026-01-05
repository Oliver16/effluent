from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import IncomeSource, PreTaxDeduction
from .serializers import IncomeSourceSerializer, IncomeSourceDetailSerializer, PreTaxDeductionSerializer
from .services import PaycheckCalculator


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
