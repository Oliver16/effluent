from django.db import migrations


def load_templates(apps, schema_editor):
    """Load default decision templates."""
    from apps.decisions.templates import load_default_templates
    load_default_templates()


def clear_templates(apps, schema_editor):
    """Remove all decision templates."""
    DecisionTemplate = apps.get_model('decisions', 'DecisionTemplate')
    DecisionTemplate.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('decisions', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_templates, clear_templates),
    ]
