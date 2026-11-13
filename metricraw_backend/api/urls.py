from django.urls import include, path
from .views import *
from .admin_api import MeView, admin_urlpatterns
from django.urls import path
from .views import ChatbotView
urlpatterns=[
 path('register/',RegisterView.as_view()),path('profile/',ProfileView.as_view()),path('goals/',GoalList.as_view()),path('goals/<int:pk>/',GoalDetail.as_view()),
 path('exercises/',ExerciseList.as_view()),path('exercises/<int:pk>/',ExerciseDetail.as_view()),path('workouts/',WorkoutList.as_view()),path('workouts/<int:pk>/',WorkoutDetail.as_view()),path('workouts/generate/',GenerateWorkout.as_view()),path('workout-history/',HistoryListCreate.as_view()),
 path('progress/',ProgressListCreate.as_view()),path('progress/summary/',ProgressSummary.as_view()),path('ai/chat/',Chat.as_view()),path('nutrition/suggestions/',Nutrition.as_view()),
 path('categories/',CategoryList.as_view()),path('products/top-selling/',TopSellingProductList.as_view()),path('products/',ProductList.as_view()),path('products/<int:pk>/',ProductDetail.as_view()),path('cart/',CartView.as_view()),path('cart/items/',CartAdd.as_view()),path('cart/items/<int:pk>/',CartRemove.as_view()),path('orders/',OrderList.as_view()),path('orders/create/',CreateOrder.as_view()),path('recommendations/',Recommendations.as_view()),
 path('me/',MeView.as_view()),path('admin/',include(admin_urlpatterns)),
 path("chatbot/", ChatbotView.as_view(), name="chatbot"),
 ]
 