# Generated migration for adding GIN indexes to JSON fields

from django.contrib.postgres.operations import BtreeGinExtension
from django.db import migrations
from django.contrib.postgres.indexes import GinIndex


class Migration(migrations.Migration):

    dependencies = [
        ('scenarios', '0005_change_source_flow_id_to_charfield'),
    ]

    operations = [
        # Enable btree_gin extension for GIN indexes on JSONB
        BtreeGinExtension(),

        # Add GIN index on ScenarioChange.parameters for faster JSON queries
        migrations.AddIndex(
            model_name='scenariochange',
            index=GinIndex(
                fields=['parameters'],
                name='scenario_change_params_gin',
            ),
        ),

        # Add GIN index on LifeEventTemplate.suggested_changes for faster lookups
        migrations.AddIndex(
            model_name='lifeeventtemplate',
            index=GinIndex(
                fields=['suggested_changes'],
                name='template_changes_gin',
            ),
        ),

        # Add GIN index on RealityChangeEvent.payload for filtering by payload contents
        migrations.AddIndex(
            model_name='realitychangeevent',
            index=GinIndex(
                fields=['payload'],
                name='reality_event_payload_gin',
            ),
        ),
    ]
