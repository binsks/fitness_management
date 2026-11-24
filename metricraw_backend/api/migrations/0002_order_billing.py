from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='billing_address',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='order',
            name='payment_method',
            field=models.CharField(
                choices=[('cod', 'Cash on delivery'), ('upi', 'UPI'), ('card', 'Card')],
                default='cod',
                max_length=20,
            ),
        ),
    ]
