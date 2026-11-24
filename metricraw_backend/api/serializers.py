from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import *

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ['username','email','first_name','last_name','password','password2']
    def validate(self, d):
        if d['password'] != d['password2']:
            raise serializers.ValidationError({'password':'Passwords do not match.'})
        return d
    def create(self, d):
        d.pop('password2'); p=d.pop('password')
        u=User.objects.create_user(password=p, **d)
        Profile.objects.create(user=u)
        return u

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model=Profile; fields='__all__'; read_only_fields=['user']
class GoalSerializer(serializers.ModelSerializer):
    class Meta:
        model=Goal; fields='__all__'; read_only_fields=['user','created_at']
class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model=Exercise; fields='__all__'
class WorkoutExerciseSerializer(serializers.ModelSerializer):
    exercise_name=serializers.CharField(source='exercise.name',read_only=True)
    muscle_group=serializers.CharField(source='exercise.muscle_group',read_only=True)
    class Meta:
        model=WorkoutExercise; fields=['id','exercise','exercise_name','muscle_group','order','sets','reps','rest_seconds']
class WorkoutDaySerializer(serializers.ModelSerializer):
    exercises=WorkoutExerciseSerializer(many=True,read_only=True)
    class Meta:
        model=WorkoutDay; fields=['id','day_number','name','exercises']
class WorkoutSerializer(serializers.ModelSerializer):
    days=WorkoutDaySerializer(many=True,read_only=True)
    class Meta:
        model=WorkoutPlan; fields=['id','name','goal','days_per_week','session_minutes','source','created_at','days']
class HistorySerializer(serializers.ModelSerializer):
    class Meta:
        model=WorkoutHistory; fields='__all__'; read_only_fields=['user','completed_at']
class ProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model=Progress; fields='__all__'; read_only_fields=['user']
class ProductSerializer(serializers.ModelSerializer):
    category_name=serializers.CharField(source='category.name',read_only=True)
    class Meta:
        model=Product; fields='__all__'
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model=Category; fields='__all__'
class CartItemSerializer(serializers.ModelSerializer):
    product=ProductSerializer(read_only=True)
    product_id=serializers.PrimaryKeyRelatedField(source='product',queryset=Product.objects.filter(is_active=True),write_only=True)
    subtotal=serializers.SerializerMethodField()
    class Meta:
        model=CartItem; fields=['id','product','product_id','quantity','subtotal']
    def get_subtotal(self,o): return o.product.price*o.quantity
class CartSerializer(serializers.ModelSerializer):
    items=CartItemSerializer(many=True,read_only=True)
    total=serializers.SerializerMethodField()
    class Meta:
        model=Cart; fields=['id','items','total','updated_at']
    def get_total(self,o): return sum(i.product.price*i.quantity for i in o.items.select_related('product'))
class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model=OrderItem; fields='__all__'
class OrderSerializer(serializers.ModelSerializer):
    items=OrderItemSerializer(many=True,read_only=True)
    class Meta:
        model=Order; fields=['id','status','total','shipping_address','billing_address','payment_method','created_at','items']
