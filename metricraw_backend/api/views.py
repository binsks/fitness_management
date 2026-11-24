from django.contrib.auth.models import User
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics,status
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import *
from .serializers import *
from .services import generate_plan,ai_reply

class RegisterView(generics.CreateAPIView): queryset=User.objects.all(); serializer_class=RegisterSerializer; permission_classes=[AllowAny]
class ProfileView(generics.RetrieveUpdateAPIView): serializer_class=ProfileSerializer; permission_classes=[IsAuthenticated]

def get_profile(user): return Profile.objects.get_or_create(user=user)[0]
ProfileView.get_object=lambda self:get_profile(self.request.user)
class GoalList(generics.ListCreateAPIView):
    serializer_class=GoalSerializer; permission_classes=[IsAuthenticated]
    def get_queryset(self): return Goal.objects.filter(user=self.request.user).order_by('-created_at')
    def perform_create(self,s):
        Goal.objects.filter(user=self.request.user).update(active=False)
        s.save(user=self.request.user, active=True)
class GoalDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class=GoalSerializer; permission_classes=[IsAuthenticated]
    def get_queryset(self): return Goal.objects.filter(user=self.request.user)
class ExerciseList(generics.ListAPIView):
    serializer_class=ExerciseSerializer; permission_classes=[IsAuthenticated]
    def get_queryset(self):
        q=Exercise.objects.filter(is_active=True); muscle=self.request.query_params.get('muscle'); difficulty=self.request.query_params.get('difficulty');
        if muscle:q=q.filter(muscle_group__icontains=muscle)
        if difficulty:q=q.filter(difficulty=difficulty)
        return q
class ExerciseDetail(generics.RetrieveAPIView): queryset=Exercise.objects.filter(is_active=True); serializer_class=ExerciseSerializer; permission_classes=[IsAuthenticated]
class WorkoutList(generics.ListAPIView):
    serializer_class=WorkoutSerializer; permission_classes=[IsAuthenticated]
    def get_queryset(self): return WorkoutPlan.objects.filter(user=self.request.user)
class WorkoutDetail(generics.RetrieveAPIView):
    serializer_class=WorkoutSerializer; permission_classes=[IsAuthenticated]
    def get_queryset(self): return WorkoutPlan.objects.filter(user=self.request.user)
class GenerateWorkout(APIView):
    permission_classes=[IsAuthenticated]
    def post(self,request):
        goal_id = request.data.get('goal_id')
        goal_type = request.data.get('goal')
        days = int(request.data.get('days_per_week', 4))
        mins = int(request.data.get('session_minutes', 60))
        if goal_id:
            goal = get_object_or_404(Goal, id=goal_id, user=request.user)
        elif goal_type:
            if goal_type not in dict(Goal.GOALS):
                goal_type = 'general_fitness'
            Goal.objects.filter(user=request.user).update(active=False)
            goal = Goal.objects.create(user=request.user, goal=goal_type, days_per_week=days, session_minutes=mins, active=True)
        else:
            goal = Goal.objects.filter(user=request.user, active=True).first()
            if not goal:
                goal = Goal.objects.create(user=request.user, goal='general_fitness', days_per_week=days, session_minutes=mins, active=True)
        return Response(WorkoutSerializer(generate_plan(request.user,goal)).data,status=201)
class HistoryListCreate(generics.ListCreateAPIView):
    serializer_class=HistorySerializer; permission_classes=[IsAuthenticated]
    def get_queryset(self): return WorkoutHistory.objects.filter(user=self.request.user)
    def perform_create(self,s): s.save(user=self.request.user)
class ProgressListCreate(generics.ListCreateAPIView):
    serializer_class=ProgressSerializer; permission_classes=[IsAuthenticated]
    def get_queryset(self): return Progress.objects.filter(user=self.request.user).order_by('-date')
    def perform_create(self,s): s.save(user=self.request.user)
class ProgressSummary(APIView):
    permission_classes=[IsAuthenticated]
    def get(self,request):
        rows=list(Progress.objects.filter(user=request.user).order_by('date').values('date','weight_kg','body_fat','waist_cm','chest_cm')); return Response({'entries':rows,'latest':rows[-1] if rows else None})
class Chat(APIView):
    permission_classes=[IsAuthenticated]
    def get(self, request):
        c = Conversation.objects.filter(user=request.user).order_by('-created_at').first()
        if not c:
            return Response({'conversation_id': None, 'messages': []})
        msgs = list(c.messages.order_by('created_at').values('role', 'content'))
        return Response({'conversation_id': c.id, 'messages': msgs})
    def post(self,request):
        msg=str(request.data.get('message','')).strip()
        if not msg:return Response({'detail':'message is required'},status=400)
        cid=request.data.get('conversation_id'); c=Conversation.objects.filter(id=cid,user=request.user).first() if cid else Conversation.objects.create(user=request.user)
        if not c:return Response({'detail':'Conversation not found'},status=404)
        Message.objects.create(conversation=c,role='user',content=msg); hist=list(c.messages.order_by('-created_at')[:8].values('role','content'))[::-1]; answer=ai_reply(request.user,msg,hist); Message.objects.create(conversation=c,role='assistant',content=answer); return Response({'conversation_id':c.id,'reply':answer})
class Nutrition(APIView):
    permission_classes=[IsAuthenticated]
    def post(self,request): return Response({'suggestions':['Include protein in each main meal.','Eat vegetables, fruits and whole grains regularly.','Stay hydrated and adjust portions to your goal.','This is general fitness information, not medical advice.']})
class CategoryList(generics.ListAPIView): queryset=Category.objects.all(); serializer_class=CategorySerializer; permission_classes=[IsAuthenticated]
class ProductList(generics.ListAPIView):
    serializer_class=ProductSerializer; permission_classes=[IsAuthenticated]
    def get_queryset(self):
        q=Product.objects.filter(is_active=True).select_related('category'); s=self.request.query_params.get('search'); c=self.request.query_params.get('category')
        if s:q=q.filter(name__icontains=s)
        if c:q=q.filter(category_id=c)
        return q
class ProductDetail(generics.RetrieveAPIView): queryset=Product.objects.filter(is_active=True); serializer_class=ProductSerializer; permission_classes=[IsAuthenticated]
class TopSellingProductList(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return Product.objects.filter(is_active=True).select_related('category')[:4]
class CartView(APIView):
    permission_classes=[IsAuthenticated]
    def get(self,request): return Response(CartSerializer(Cart.objects.get_or_create(user=request.user)[0]).data)
class CartAdd(APIView):
    permission_classes=[IsAuthenticated]
    def post(self,request):
        p=get_object_or_404(Product,id=request.data.get('product_id'),is_active=True); q=int(request.data.get('quantity',1)); cart=Cart.objects.get_or_create(user=request.user)[0]; item,created=CartItem.objects.get_or_create(cart=cart,product=p); item.quantity=(q if created else item.quantity+q); 
        if item.quantity>p.stock:return Response({'detail':'Insufficient stock.'},status=400)
        item.save(); return Response(CartSerializer(cart).data,status=201)
class CartRemove(APIView):
    permission_classes=[IsAuthenticated]
    def delete(self,request,pk): CartItem.objects.filter(id=pk,cart__user=request.user).delete(); return Response(status=204)
class OrderList(generics.ListAPIView):
    serializer_class=OrderSerializer; permission_classes=[IsAuthenticated]
    def get_queryset(self): return Order.objects.filter(user=self.request.user)
class OrderDetail(generics.RetrieveAPIView):
    serializer_class=OrderSerializer; permission_classes=[IsAuthenticated]
    def get_queryset(self): return Order.objects.filter(user=self.request.user).prefetch_related('items')
class CreateOrder(APIView):
    permission_classes=[IsAuthenticated]
    @transaction.atomic
    def post(self,request):
        address=str(request.data.get('shipping_address','')).strip(); cart=Cart.objects.filter(user=request.user).first()
        pay=str(request.data.get('payment_method','cod')).strip().lower()
        allowed={k for k,_ in Order.PAY}
        if pay not in allowed:return Response({'detail':'Choose a valid billing option: cash on delivery, UPI, or card.'},status=400)
        billing=str(request.data.get('billing_address','')).strip() or address
        if not address:return Response({'detail':'shipping_address is required.'},status=400)
        if not cart or not cart.items.exists():return Response({'detail':'Cart is empty.'},status=400)
        for i in cart.items.select_related('product'):
            if i.quantity>i.product.stock:return Response({'detail':f'Insufficient stock for {i.product.name}.'},status=400)
        status_val='paid' if pay in ('upi','card') else 'pending'
        order=Order.objects.create(user=request.user,total=0,status=status_val,shipping_address=address,billing_address=billing,payment_method=pay); total=0
        for i in cart.items.select_related('product'):
            p=i.product; OrderItem.objects.create(order=order,product=p,product_name=p.name,unit_price=p.price,quantity=i.quantity); p.stock-=i.quantity; p.save(update_fields=['stock']); total+=p.price*i.quantity
        order.total=total; order.save(update_fields=['total']); cart.items.all().delete(); return Response(OrderSerializer(order).data,status=201)
class Recommendations(APIView):
    permission_classes=[IsAuthenticated]
    def get(self,request):
        qs=Recommendation.objects.filter(user=request.user).select_related('product'); return Response([{'id':x.id,'product':ProductSerializer(x.product).data,'reason':x.reason} for x in qs])
    def post(self,request):
        out=[]
        for p in Product.objects.filter(is_active=True,stock__gt=0)[:5]:
            x=Recommendation.objects.create(user=request.user,product=p,reason='Available fitness product that may support your training routine.'); out.append({'id':x.id,'product':ProductSerializer(p).data,'reason':x.reason})
        return Response(out,status=201)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ai_service import chat_with_ai


class ChatbotView(APIView):

    def post(self, request):

        message = request.data.get("message", "").strip()
        history = request.data.get("history", [])

        if not message:
            return Response(
                {"error": "Message is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(history, list):
            return Response(
                {"error": "History must be a list"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reply = chat_with_ai(message, history)

            return Response({
                "reply": reply
            })

        except Exception:
            return Response(
                {"error": "AI service is temporarily unavailable. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
