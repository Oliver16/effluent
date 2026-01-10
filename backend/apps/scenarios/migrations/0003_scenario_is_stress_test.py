# Generated migration for adding is_stress_test field to Scenario
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scenarios', '0002_baseline_scenario_system'),
    ]

    operations = [
        migrations.AddField(
            model_name='scenario',
            name='is_stress_test',
            field=models.BooleanField(default=False),
        ),
    ]
