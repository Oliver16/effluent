# Generated manually for baseline scenario system
from decimal import Decimal
from django.db import migrations, models
from django.db.models import Q
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('scenarios', '0001_initial'),
        ('core', '0001_initial'),
        ('metrics', '0001_initial'),
    ]

    operations = [
        # Create Scenario model with baseline fields
        migrations.CreateModel(
            name='Scenario',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('is_baseline', models.BooleanField(default=False)),
                ('baseline_mode', models.CharField(
                    choices=[('live', 'Live'), ('pinned', 'Pinned')],
                    default='live',
                    max_length=20
                )),
                ('baseline_pinned_at', models.DateTimeField(blank=True, null=True)),
                ('baseline_pinned_as_of_date', models.DateField(blank=True, null=True)),
                ('last_projected_at', models.DateTimeField(blank=True, null=True)),
                ('projection_months', models.PositiveIntegerField(default=60)),
                ('start_date', models.DateField()),
                ('inflation_rate', models.DecimalField(decimal_places=4, default=Decimal('0.03'), max_digits=5)),
                ('investment_return_rate', models.DecimalField(decimal_places=4, default=Decimal('0.07'), max_digits=5)),
                ('salary_growth_rate', models.DecimalField(decimal_places=4, default=Decimal('0.03'), max_digits=5)),
                ('is_active', models.BooleanField(default=True)),
                ('is_archived', models.BooleanField(default=False)),
                ('household', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='%(class)ss', to='core.household')),
                ('parent_scenario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='children', to='scenarios.scenario')),
                ('baseline_metric_snapshot', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='baseline_scenarios', to='metrics.metricsnapshot')),
            ],
            options={
                'db_table': 'scenarios',
                'ordering': ['-created_at'],
            },
        ),
        # Add unique constraint for one baseline per household
        migrations.AddConstraint(
            model_name='scenario',
            constraint=models.UniqueConstraint(
                condition=Q(is_baseline=True),
                fields=['household'],
                name='unique_baseline_per_household'
            ),
        ),
        # Create ScenarioChange model
        migrations.CreateModel(
            name='ScenarioChange',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('change_type', models.CharField(
                    choices=[
                        ('add_income', 'Add Income Source'),
                        ('modify_income', 'Modify Income'),
                        ('remove_income', 'Remove Income'),
                        ('add_expense', 'Add Expense'),
                        ('modify_expense', 'Modify Expense'),
                        ('remove_expense', 'Remove Expense'),
                        ('add_asset', 'Add Asset'),
                        ('modify_asset', 'Modify Asset Value'),
                        ('sell_asset', 'Sell Asset'),
                        ('add_debt', 'Add Debt'),
                        ('modify_debt', 'Modify Debt'),
                        ('payoff_debt', 'Pay Off Debt'),
                        ('refinance', 'Refinance'),
                        ('lump_sum_income', 'One-time Income'),
                        ('lump_sum_expense', 'One-time Expense'),
                        ('modify_401k', 'Change 401(k) Contribution'),
                        ('modify_hsa', 'Change HSA Contribution'),
                    ],
                    max_length=30
                )),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('effective_date', models.DateField()),
                ('end_date', models.DateField(blank=True, null=True)),
                ('source_account_id', models.UUIDField(blank=True, null=True)),
                ('source_flow_id', models.UUIDField(blank=True, null=True)),
                ('parameters', models.JSONField(default=dict)),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('is_enabled', models.BooleanField(default=True)),
                ('scenario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='changes', to='scenarios.scenario')),
            ],
            options={
                'db_table': 'scenario_changes',
                'ordering': ['effective_date', 'display_order'],
            },
        ),
        # Create ScenarioProjection model
        migrations.CreateModel(
            name='ScenarioProjection',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('projection_date', models.DateField()),
                ('month_number', models.PositiveIntegerField()),
                ('total_assets', models.DecimalField(decimal_places=2, max_digits=14)),
                ('total_liabilities', models.DecimalField(decimal_places=2, max_digits=14)),
                ('net_worth', models.DecimalField(decimal_places=2, max_digits=14)),
                ('liquid_assets', models.DecimalField(decimal_places=2, max_digits=14)),
                ('retirement_assets', models.DecimalField(decimal_places=2, max_digits=14)),
                ('total_income', models.DecimalField(decimal_places=2, max_digits=12)),
                ('total_expenses', models.DecimalField(decimal_places=2, max_digits=12)),
                ('net_cash_flow', models.DecimalField(decimal_places=2, max_digits=12)),
                ('dscr', models.DecimalField(decimal_places=3, max_digits=6)),
                ('savings_rate', models.DecimalField(decimal_places=4, max_digits=5)),
                ('liquidity_months', models.DecimalField(decimal_places=2, max_digits=5)),
                ('income_breakdown', models.JSONField(default=dict)),
                ('expense_breakdown', models.JSONField(default=dict)),
                ('asset_breakdown', models.JSONField(default=dict)),
                ('liability_breakdown', models.JSONField(default=dict)),
                ('computed_at', models.DateTimeField(auto_now=True)),
                ('scenario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='projections', to='scenarios.scenario')),
            ],
            options={
                'db_table': 'scenario_projections',
                'ordering': ['month_number'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='scenarioprojection',
            unique_together={('scenario', 'month_number')},
        ),
        # Create ScenarioComparison model
        migrations.CreateModel(
            name='ScenarioComparison',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('household', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='%(class)ss', to='core.household')),
                ('scenarios', models.ManyToManyField(related_name='comparisons', to='scenarios.scenario')),
            ],
            options={
                'db_table': 'scenario_comparisons',
            },
        ),
        # Create RealityChangeEvent model
        migrations.CreateModel(
            name='RealityChangeEvent',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('event_type', models.CharField(
                    choices=[
                        ('accounts_changed', 'Accounts Changed'),
                        ('flows_changed', 'Flows Changed'),
                        ('taxes_changed', 'Taxes Changed'),
                        ('onboarding_completed', 'Onboarding Completed'),
                        ('manual_refresh', 'Manual Refresh'),
                    ],
                    max_length=30
                )),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('processed', 'Processed'),
                        ('failed', 'Failed'),
                    ],
                    default='pending',
                    max_length=20
                )),
                ('error', models.TextField(blank=True)),
                ('household', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='%(class)ss', to='core.household')),
            ],
            options={
                'db_table': 'reality_change_events',
                'ordering': ['created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='realitychangeevent',
            index=models.Index(
                fields=['household', 'status', 'created_at'],
                name='reality_event_household_status'
            ),
        ),
    ]
