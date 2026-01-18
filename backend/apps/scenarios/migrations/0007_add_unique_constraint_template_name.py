# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scenarios', '0006_add_days_cash_on_hand'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lifeeventtemplate',
            name='name',
            field=models.CharField(max_length=200, unique=True, help_text='Unique name for this life event template'),
        ),
    ]
