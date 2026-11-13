from django.contrib import admin
from .models import *
admin.site.register([Profile,Goal,Exercise,WorkoutPlan,WorkoutDay,WorkoutExercise,WorkoutHistory,Progress,Conversation,Message,Category,Product,Cart,CartItem,Order,OrderItem,Recommendation])
