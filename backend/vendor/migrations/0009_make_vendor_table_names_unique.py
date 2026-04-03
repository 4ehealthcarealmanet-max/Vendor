# Generated manually for explicit, collision-resistant table names.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("vendor", "0008_vendorquotation_rejected_at_and_more"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="accountprofile",
            table="medvendor_account_profiles",
        ),
        migrations.AlterModelTable(
            name="vendorprofile",
            table="medvendor_vendor_profiles",
        ),
        migrations.AlterModelTable(
            name="vendorproductservice",
            table="medvendor_vendor_product_services",
        ),
        migrations.AlterModelTable(
            name="vendororder",
            table="medvendor_vendor_orders",
        ),
        migrations.AlterModelTable(
            name="vendororderitem",
            table="medvendor_vendor_order_items",
        ),
        migrations.AlterModelTable(
            name="vendorrfq",
            table="medvendor_vendor_rfqs",
        ),
        migrations.AlterModelTable(
            name="vendorquotation",
            table="medvendor_vendor_quotations",
        ),
        migrations.AlterModelTable(
            name="vendorrfqinvitation",
            table="medvendor_vendor_rfq_invitations",
        ),
    ]
