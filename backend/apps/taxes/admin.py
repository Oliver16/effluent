from django.contrib import admin
from .models import IncomeSource, W2Withholding, PreTaxDeduction, PostTaxDeduction

class W2WithholdingInline(admin.StackedInline):
    model = W2Withholding
    extra = 0

class PreTaxDeductionInline(admin.TabularInline):
    model = PreTaxDeduction
    extra = 1

class PostTaxDeductionInline(admin.TabularInline):
    model = PostTaxDeduction
    extra = 0

@admin.register(IncomeSource)
class IncomeSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'household_member', 'income_type', 'gross_annual', 'pay_frequency', 'is_active')
    list_filter = ('income_type', 'is_active')
    inlines = [W2WithholdingInline, PreTaxDeductionInline, PostTaxDeductionInline]
