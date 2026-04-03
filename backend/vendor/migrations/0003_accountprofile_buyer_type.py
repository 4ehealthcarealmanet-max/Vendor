from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vendor", "0002_accountprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="accountprofile",
            name="buyer_type",
            field=models.CharField(blank=True, choices=[("hospital", "Hospital"), ("pharmacy", "Pharmacy"), ("ngo", "NGO"), ("clinic", "Clinic")], default="", max_length=20),
        ),
    ]
