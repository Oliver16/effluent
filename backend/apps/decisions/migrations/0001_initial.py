import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
        ('scenarios', '0002_baseline_scenario_system'),
    ]

    operations = [
        migrations.CreateModel(
            name='DecisionTemplate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('key', models.CharField(db_index=True, max_length=50, unique=True)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('category', models.CharField(choices=[('income', 'Income'), ('expenses', 'Expenses'), ('debt', 'Debt'), ('housing', 'Housing'), ('retirement', 'Retirement'), ('savings', 'Savings')], max_length=30)),
                ('icon', models.CharField(default='calculator', max_length=50)),
                ('ui_schema', models.JSONField(default=dict)),
                ('change_plan', models.JSONField(default=dict)),
                ('is_active', models.BooleanField(default=True)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'decision_templates',
                'ordering': ['category', 'sort_order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='DecisionRun',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('template_key', models.CharField(db_index=True, max_length=50)),
                ('inputs', models.JSONField(default=dict)),
                ('scenario_name_override', models.CharField(blank=True, max_length=200)),
                ('is_draft', models.BooleanField(default=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('created_scenario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='decision_runs', to='scenarios.scenario')),
                ('household', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='decisionruns', to='core.household')),
                ('template', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='runs', to='decisions.decisiontemplate')),
            ],
            options={
                'db_table': 'decision_runs',
                'ordering': ['-created_at'],
            },
        ),
    ]
