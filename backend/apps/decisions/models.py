import uuid
from django.db import models
from apps.core.models import HouseholdOwnedModel, TimestampedModel


class DecisionCategory(models.TextChoices):
    """Categories for decision templates."""
    INCOME = 'income', 'Income'
    EXPENSES = 'expenses', 'Expenses'
    DEBT = 'debt', 'Debt'
    HOUSING = 'housing', 'Housing'
    RETIREMENT = 'retirement', 'Retirement'
    SAVINGS = 'savings', 'Savings'


class FieldType(models.TextChoices):
    """Supported field types for decision wizard UI."""
    CURRENCY = 'currency', 'Currency'
    PERCENT = 'percent', 'Percentage'
    INTEGER = 'integer', 'Integer'
    SELECT = 'select', 'Select'
    DATE = 'date', 'Date'
    TOGGLE = 'toggle', 'Toggle'
    TEXT = 'text', 'Text'


class DecisionTemplate(models.Model):
    """
    A global template for a financial decision wizard.

    Templates define:
    - UI schema for the wizard steps and form fields
    - Change plan for converting user inputs into ScenarioChange records
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=30, choices=DecisionCategory.choices)
    icon = models.CharField(max_length=50, default='calculator')

    # UI schema defines the wizard steps and form fields
    # Format:
    # {
    #   "steps": [
    #     {
    #       "id": "property",
    #       "title": "Property",
    #       "description": "Enter property details",
    #       "fields": [
    #         { "key": "purchase_price", "type": "currency", "label": "Purchase price", "required": true },
    #         { "key": "down_payment", "type": "currency", "label": "Down payment", "required": true, "default": 0 },
    #         { "key": "loan_type", "type": "select", "label": "Loan type", "options": [...] }
    #       ]
    #     }
    #   ]
    # }
    ui_schema = models.JSONField(default=dict)

    # Change plan defines how to convert inputs into ScenarioChange records
    # Format:
    # {
    #   "changes": [
    #     {
    #       "change_type": "add_expense",
    #       "name_template": "New expense: {expense_name}",
    #       "parameters": {
    #         "amount": "{amount}",
    #         "frequency": "{frequency}",
    #         "category": "{category}"
    #       }
    #     }
    #   ]
    # }
    change_plan = models.JSONField(default=dict)

    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'decision_templates'
        ordering = ['category', 'sort_order', 'name']

    def __str__(self):
        return f"{self.category}: {self.name}"


class DecisionRun(HouseholdOwnedModel):
    """
    A household's execution of a decision template.

    Stores the user's inputs and links to the created scenario.
    Can be saved as a draft before scenario creation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        DecisionTemplate,
        on_delete=models.SET_NULL,
        null=True,
        related_name='runs'
    )
    template_key = models.CharField(max_length=50, db_index=True)

    # User's answers to the template fields
    inputs = models.JSONField(default=dict)

    # The scenario created from this decision (null if draft)
    created_scenario = models.ForeignKey(
        'scenarios.Scenario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decision_runs'
    )

    # Optional name override for the created scenario
    scenario_name_override = models.CharField(max_length=200, blank=True)

    # Status tracking
    is_draft = models.BooleanField(default=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'decision_runs'
        ordering = ['-created_at']

    def __str__(self):
        status = "Draft" if self.is_draft else "Complete"
        return f"{self.household.name} - {self.template_key} ({status})"
