from django.db import migrations, models


def approve_existing_profiles(apps, schema_editor):
    AccountProfile = apps.get_model("vendor", "AccountProfile")
    AccountProfile.objects.all().update(status="approved")


class Migration(migrations.Migration):

    dependencies = [
        ("vendor", "0010_vendororderevent"),
    ]

    operations = [
        migrations.AddField(
            model_name="accountprofile",
            name="status",
            field=models.CharField(
                choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.RunPython(approve_existing_profiles, migrations.RunPython.noop),
    ]
