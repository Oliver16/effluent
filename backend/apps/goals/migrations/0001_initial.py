import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Goal',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(blank=True, default='', help_text='User-facing display name for this goal', max_length=120)),
                ('goal_type', models.CharField(choices=[
                    ('emergency_fund_months', 'Emergency Fund (Months)'),
                    ('min_dscr', 'Minimum DSCR'),
                    ('min_savings_rate', 'Minimum Savings Rate'),
                    ('net_worth_target_by_date', 'Net Worth Target by Date'),
                    ('retirement_age', 'Retirement Age'),
                ], db_index=True, help_text='Type of goal which determines how target_value is interpreted', max_length=50)),
                ('target_value', models.DecimalField(decimal_places=2, help_text='Numeric target value; interpretation depends on goal_type and target_unit', max_digits=12)),
                ('target_unit', models.CharField(blank=True, default='', help_text='Unit of measurement: months, ratio, percent, usd, age', max_length=24)),
                ('target_date', models.DateField(blank=True, help_text='Target date for time-bound goals like net_worth_target_by_date', null=True)),
                ('target_meta', models.JSONField(blank=True, default=dict, help_text='Additional typed configuration (e.g., {"months_to_goal": 24})')),
                ('is_primary', models.BooleanField(default=False, help_text='Whether this is the primary goal for the household')),
                ('is_active', models.BooleanField(db_index=True, default=True, help_text='Inactive goals are excluded from evaluation')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('household', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='goals', to='core.household')),
            ],
            options={
                'ordering': ['-is_primary', '-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='goal',
            constraint=models.UniqueConstraint(
                condition=models.Q(('is_primary', True)),
                fields=('household',),
                name='unique_primary_goal_per_household'
            ),
        ),
    ]
