# Generated manually

from django.db import migrations, models
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('scenarios', '0005_change_source_flow_id_to_charfield'),
    ]

    operations = [
        migrations.AddField(
            model_name='scenarioprojection',
            name='days_cash_on_hand',
            field=models.DecimalField(decimal_places=1, default=Decimal('0.0'), max_digits=6),
            preserve_default=False,
        ),
    ]
