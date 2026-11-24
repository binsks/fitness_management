"""
Superuser-only admin API for MetricRaw.

Drop this file next to your app's views.py, then add to the app's urls.py:

    from django.urls import include, path
    from .admin_api import MeView, admin_urlpatterns

    urlpatterns += [
        path("me/", MeView.as_view()),
        path("admin/", include(admin_urlpatterns)),
    ]

Everything under /api/admin/ requires an authenticated user with is_superuser=True.
Anyone else gets 403 (not logged in: 401).
"""
from datetime import timedelta

from django.contrib.auth.models import User
from django.db.models import Count, ProtectedError, Q, Sum
from django.db.models.functions import TruncDate
from django.urls import path
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import *  # noqa: F401,F403  (Product, Order, Exercise, Category, ...)
from .serializers import (
    CategorySerializer,
    ExerciseSerializer,
    OrderItemSerializer,
    ProductSerializer,
)


class IsSuperUser(BasePermission):
    """Only logged-in superusers."""

    message = "Superuser access only."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_superuser)


class SafeDelete:
    """Turn 'row is referenced elsewhere' errors into a clear 409 instead of a 500."""

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This item is used by other records. Deactivate it instead of deleting."},
                status=409,
            )


class MeView(APIView):
    """Who am I? The frontend uses is_superuser to show/hide the admin link."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response(
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "is_staff": u.is_staff,
                "is_superuser": u.is_superuser,
            }
        )


class AdminStats(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        now = timezone.now()
        week = now - timedelta(days=7)
        today = timezone.localdate()
        days = [today - timedelta(days=13 - i) for i in range(14)]

        joined = {
            r["d"]: r["c"]
            for r in User.objects.filter(date_joined__gte=now - timedelta(days=15))
            .annotate(d=TruncDate("date_joined"))
            .values("d")
            .annotate(c=Count("id"))
        }

        orders = Order.objects.all()
        paying = orders.exclude(status__in=["cancelled", "canceled"])
        revenue = paying.aggregate(s=Sum("total"))["s"] or 0

        products = Product.objects.all()
        low = products.filter(is_active=True, stock__lte=5).order_by("stock", "name")

        recent = Order.objects.select_related("user").order_by("-created_at")[:8]

        return Response(
            {
                "users": {
                    "total": User.objects.count(),
                    "active": User.objects.filter(is_active=True).count(),
                    "staff": User.objects.filter(is_staff=True).count(),
                    "new_7d": User.objects.filter(date_joined__gte=week).count(),
                },
                "orders": {
                    "total": orders.count(),
                    "last_7d": orders.filter(created_at__gte=week).count(),
                    "revenue": revenue,
                    "by_status": list(orders.values("status").annotate(count=Count("id")).order_by("-count")),
                },
                "products": {
                    "total": products.count(),
                    "active": products.filter(is_active=True).count(),
                    "out_of_stock": products.filter(is_active=True, stock__lte=0).count(),
                    "low_stock": list(low.values("id", "name", "stock")[:8]),
                },
                "activity": {
                    "plans": WorkoutPlan.objects.count(),
                    "workouts_completed": WorkoutHistory.objects.count(),
                    "completed_7d": WorkoutHistory.objects.filter(completed_at__gte=week).count(),
                    "progress_entries": Progress.objects.count(),
                },
                "signups": [{"date": d.isoformat(), "count": joined.get(d, 0)} for d in days],
                "recent_orders": [
                    {
                        "id": o.id,
                        "username": o.user.username if o.user_id else "",
                        "total": o.total,
                        "status": o.status,
                        "created_at": o.created_at,
                    }
                    for o in recent
                ],
            }
        )


# ---------------------------------------------------------------- users
class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "is_active", "is_staff", "is_superuser", "date_joined", "last_login",
        ]
        # Only is_active and is_staff can be changed from the console.
        read_only_fields = [
            "id", "username", "email", "first_name", "last_name",
            "is_superuser", "date_joined", "last_login",
        ]


class AdminUserList(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = User.objects.order_by("-date_joined")
        q = self.request.query_params.get("search")
        if q:
            qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q))
        return qs


class AdminUserDetail(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsSuperUser]

    def perform_update(self, serializer):
        target = self.get_object()
        if target.is_superuser:
            raise ValidationError({"detail": "Superuser accounts cannot be changed here."})
        if target.pk == self.request.user.pk:
            raise ValidationError({"detail": "You cannot change your own account here."})
        serializer.save()


# --------------------------------------------------- products / catalogue
class AdminProductList(generics.ListCreateAPIView):
    queryset = Product.objects.all().order_by("-id")
    serializer_class = ProductSerializer
    permission_classes = [IsSuperUser]


class AdminProductDetail(SafeDelete, generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsSuperUser]


class AdminCategoryList(generics.ListCreateAPIView):
    queryset = Category.objects.all().order_by("id")
    serializer_class = CategorySerializer
    permission_classes = [IsSuperUser]


class AdminCategoryDetail(SafeDelete, generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsSuperUser]


class AdminExerciseList(generics.ListCreateAPIView):
    queryset = Exercise.objects.all().order_by("-id")
    serializer_class = ExerciseSerializer
    permission_classes = [IsSuperUser]


class AdminExerciseDetail(SafeDelete, generics.RetrieveUpdateDestroyAPIView):
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
    permission_classes = [IsSuperUser]


# --------------------------------------------------------------- orders
class AdminOrderSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "username", "status", "total", "shipping_address", "billing_address", "payment_method", "created_at", "items"]
        # Only the status can be edited; everything else is a record of what happened.
        read_only_fields = ["id", "username", "total", "shipping_address", "billing_address", "payment_method", "created_at", "items"]


class AdminOrderList(generics.ListAPIView):
    queryset = Order.objects.select_related("user").prefetch_related("items").order_by("-created_at")
    serializer_class = AdminOrderSerializer
    permission_classes = [IsSuperUser]


class AdminOrderDetail(generics.RetrieveUpdateAPIView):
    queryset = Order.objects.select_related("user").prefetch_related("items")
    serializer_class = AdminOrderSerializer
    permission_classes = [IsSuperUser]


admin_urlpatterns = [
    path("stats/", AdminStats.as_view()),
    path("users/", AdminUserList.as_view()),
    path("users/<int:pk>/", AdminUserDetail.as_view()),
    path("products/", AdminProductList.as_view()),
    path("products/<int:pk>/", AdminProductDetail.as_view()),
    path("categories/", AdminCategoryList.as_view()),
    path("categories/<int:pk>/", AdminCategoryDetail.as_view()),
    path("exercises/", AdminExerciseList.as_view()),
    path("exercises/<int:pk>/", AdminExerciseDetail.as_view()),
    path("orders/", AdminOrderList.as_view()),
    path("orders/<int:pk>/", AdminOrderDetail.as_view()),
]
