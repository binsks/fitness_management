from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user=models.OneToOneField(User,on_delete=models.CASCADE,related_name='profile')
    age=models.PositiveIntegerField(null=True,blank=True); height_cm=models.FloatField(null=True,blank=True); weight_kg=models.FloatField(null=True,blank=True)
    gender=models.CharField(max_length=30,blank=True); experience=models.CharField(max_length=20,default='beginner'); equipment=models.CharField(max_length=100,default='bodyweight')

class Goal(models.Model):
    GOALS=[('muscle_gain','Muscle Gain'),('fat_loss','Fat Loss'),('strength','Strength'),('endurance','Endurance'),('general_fitness','General Fitness')]
    user=models.ForeignKey(User,on_delete=models.CASCADE,related_name='goals'); goal=models.CharField(max_length=30,choices=GOALS); days_per_week=models.PositiveIntegerField(default=4); session_minutes=models.PositiveIntegerField(default=60); active=models.BooleanField(default=True); created_at=models.DateTimeField(auto_now_add=True)

class Exercise(models.Model):
    name=models.CharField(max_length=120); muscle_group=models.CharField(max_length=60); equipment=models.CharField(max_length=60,default='bodyweight'); difficulty=models.CharField(max_length=20,default='beginner'); instructions=models.TextField(); video_url=models.URLField(blank=True); is_active=models.BooleanField(default=True)

class WorkoutPlan(models.Model):
    user=models.ForeignKey(User,on_delete=models.CASCADE,related_name='plans'); name=models.CharField(max_length=150); goal=models.CharField(max_length=30); days_per_week=models.PositiveIntegerField(); session_minutes=models.PositiveIntegerField(); source=models.CharField(max_length=30,default='rule_based'); created_at=models.DateTimeField(auto_now_add=True)
class WorkoutDay(models.Model):
    plan=models.ForeignKey(WorkoutPlan,on_delete=models.CASCADE,related_name='days'); day_number=models.PositiveIntegerField(); name=models.CharField(max_length=100)
    class Meta: ordering=['day_number']
class WorkoutExercise(models.Model):
    day=models.ForeignKey(WorkoutDay,on_delete=models.CASCADE,related_name='exercises'); exercise=models.ForeignKey(Exercise,on_delete=models.PROTECT); order=models.PositiveIntegerField(); sets=models.PositiveIntegerField(default=3); reps=models.CharField(max_length=20,default='10-12'); rest_seconds=models.PositiveIntegerField(default=60)
    class Meta: ordering=['order']
class WorkoutHistory(models.Model):
    user=models.ForeignKey(User,on_delete=models.CASCADE); workout_day=models.ForeignKey(WorkoutDay,on_delete=models.CASCADE); duration_minutes=models.PositiveIntegerField(default=0); completed=models.BooleanField(default=True); notes=models.TextField(blank=True); completed_at=models.DateTimeField(auto_now_add=True)
class Progress(models.Model):
    user=models.ForeignKey(User,on_delete=models.CASCADE,related_name='progress'); date=models.DateField(); weight_kg=models.FloatField(null=True,blank=True); body_fat=models.FloatField(null=True,blank=True); waist_cm=models.FloatField(null=True,blank=True); chest_cm=models.FloatField(null=True,blank=True); notes=models.TextField(blank=True)
class Conversation(models.Model):
    user=models.ForeignKey(User,on_delete=models.CASCADE,related_name='conversations'); created_at=models.DateTimeField(auto_now_add=True)
class Message(models.Model):
    conversation=models.ForeignKey(Conversation,on_delete=models.CASCADE,related_name='messages'); role=models.CharField(max_length=20); content=models.TextField(); created_at=models.DateTimeField(auto_now_add=True)
class Category(models.Model): name=models.CharField(max_length=100,unique=True); description=models.TextField(blank=True)
class Product(models.Model):
    category=models.ForeignKey(Category,on_delete=models.PROTECT,related_name='products'); name=models.CharField(max_length=180); description=models.TextField(); price=models.DecimalField(max_digits=10,decimal_places=2); stock=models.PositiveIntegerField(default=0); image_url=models.URLField(blank=True); is_active=models.BooleanField(default=True)
class Cart(models.Model): user=models.OneToOneField(User,on_delete=models.CASCADE,related_name='cart'); updated_at=models.DateTimeField(auto_now=True)
class CartItem(models.Model):
    cart=models.ForeignKey(Cart,on_delete=models.CASCADE,related_name='items'); product=models.ForeignKey(Product,on_delete=models.PROTECT); quantity=models.PositiveIntegerField(default=1)
    class Meta: unique_together=[('cart','product')]
class Order(models.Model):
    PAY=[('cod','Cash on delivery'),('upi','UPI'),('card','Card')]
    user=models.ForeignKey(User,on_delete=models.PROTECT,related_name='orders'); status=models.CharField(max_length=20,default='pending'); total=models.DecimalField(max_digits=12,decimal_places=2); shipping_address=models.TextField(); billing_address=models.TextField(blank=True); payment_method=models.CharField(max_length=20,choices=PAY,default='cod'); created_at=models.DateTimeField(auto_now_add=True)
class OrderItem(models.Model):
    order=models.ForeignKey(Order,on_delete=models.CASCADE,related_name='items'); product=models.ForeignKey(Product,on_delete=models.PROTECT); product_name=models.CharField(max_length=180); unit_price=models.DecimalField(max_digits=10,decimal_places=2); quantity=models.PositiveIntegerField()
class Recommendation(models.Model): user=models.ForeignKey(User,on_delete=models.CASCADE); product=models.ForeignKey(Product,on_delete=models.CASCADE); reason=models.TextField(); created_at=models.DateTimeField(auto_now_add=True)
