import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings'); import django; django.setup()
from api.models import Exercise,Category,Product
ex=[('Push Up','chest','bodyweight','beginner'),('Bodyweight Squat','quadriceps','bodyweight','beginner'),('Lunges','quadriceps','bodyweight','beginner'),('Glute Bridge','glutes','bodyweight','beginner'),('Plank','core','bodyweight','beginner'),('Pull Up','back','bodyweight','intermediate'),('Dumbbell Bench Press','chest','dumbbell','beginner'),('Dumbbell Row','back','dumbbell','beginner'),('Shoulder Press','shoulders','dumbbell','beginner'),('Biceps Curl','biceps','dumbbell','beginner'),('Triceps Extension','triceps','dumbbell','beginner'),('Romanian Deadlift','hamstrings','barbell','intermediate')]
for n,m,e,d in ex: Exercise.objects.get_or_create(name=n,defaults={'muscle_group':m,'equipment':e,'difficulty':d,'instructions':f'Perform {n} with controlled technique.'})
for n in ['Gym Equipment','Accessories','Fitness Wear','Recovery']: Category.objects.get_or_create(name=n)
a=Category.objects.get(name='Accessories'); g=Category.objects.get(name='Gym Equipment')
for n,desc,price,stock,c in [('Resistance Band','Medium resistance band',599,50,a),('Yoga Mat','Non-slip exercise mat',899,30,a),('Adjustable Dumbbell','Adjustable home dumbbell',3999,20,g),('Skipping Rope','Cardio skipping rope',299,80,a)]: Product.objects.get_or_create(name=n,defaults={'description':desc,'price':price,'stock':stock,'category':c})
print('Seed data created.')
