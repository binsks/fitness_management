import requests
from django.conf import settings
from .models import *

SPLITS={2:['Full Body A','Full Body B'],3:['Full Body','Upper Body','Lower Body'],4:['Upper Body','Lower Body','Upper Body','Lower Body'],5:['Push','Pull','Legs','Upper Body','Lower Body'],6:['Push','Pull','Legs','Push','Pull','Legs']}
MUSCLES={'push':['chest','shoulder','triceps'],'pull':['back','biceps'],'legs':['quadriceps','hamstring','glute','calf'],'upper':['chest','back','shoulder','biceps','triceps'],'lower':['quadriceps','hamstring','glute','calf'],'full':['chest','back','shoulder','quadriceps','hamstring','glute']}

def generate_plan(user,goal):
    days=max(2,min(goal.days_per_week,6)); profile=getattr(user,'profile',None); level=profile.experience if profile else 'beginner'; equip=(profile.equipment if profile else 'bodyweight').lower(); pool=list(Exercise.objects.filter(is_active=True,difficulty=level))
    if equip not in ('gym','full gym','any'):
        filtered=[e for e in pool if e.equipment.lower() in ('bodyweight',equip)]
        if filtered: pool=filtered
    plan=WorkoutPlan.objects.create(user=user,name=f'{goal.get_goal_display()} {days}-Day Plan',goal=goal.goal,days_per_week=days,session_minutes=goal.session_minutes)
    used=set()
    for n,name in enumerate(SPLITS[days],1):
        day=WorkoutDay.objects.create(plan=plan,day_number=n,name=name); key=name.lower(); groups=[]
        for k,v in MUSCLES.items():
            if k in key: groups=v; break
        choices=[e for e in pool if e.id not in used and (not groups or any(g in e.muscle_group.lower() for g in groups))]
        if len(choices)<4: choices=[e for e in pool if e.id not in used]
        for order,e in enumerate(choices[:6],1):
            used.add(e.id); WorkoutExercise.objects.create(day=day,exercise=e,order=order,sets=3,reps='8-12' if goal.goal in ('muscle_gain','strength') else '10-15',rest_seconds=90 if goal.goal=='strength' else 60)
    return plan

def ai_reply(user,message,history):
    profile=getattr(user,'profile',None); goal=Goal.objects.filter(user=user,active=True).first()
    g = goal.goal.replace('_', ' ') if goal else 'general fitness'
    exp = getattr(profile,'experience','beginner')
    eq = getattr(profile,'equipment','bodyweight')
    sys_prompt = (
        f"You are MetricRaw AI Coach, an expert fitness trainer and nutrition advisor. "
        f"Provide concise, encouraging, and science-backed fitness guidance. "
        f"Athlete Profile: Fitness Goal: {g}, Experience Level: {exp}, Available Equipment: {eq}. "
        f"Format key takeaways clearly. Do not prescribe medical treatments."
    )
    if settings.AI_API_URL and settings.AI_API_KEY and settings.AI_MODEL:
        try:
            payload = {
                'model': settings.AI_MODEL,
                'messages': [{'role': 'system', 'content': sys_prompt}, *history, {'role': 'user', 'content': message}],
                'temperature': 0.4,
            }
            r = requests.post(settings.AI_API_URL, headers={'Authorization': f'Bearer {settings.AI_API_KEY}'}, json=payload, timeout=30)
            if r.status_code == 200:
                data = r.json()
                if 'choices' in data and data['choices']:
                    return data['choices'][0]['message']['content']
        except Exception as e:
            print("AI API Exception:", e)
    if 'muscle' in message.lower() or 'gain' in message.lower(): return 'For muscle gain, focus on progressive resistance training, adequate protein, recovery, and consistent sleep.'
    if 'fat' in message.lower() or 'weight' in message.lower(): return 'For fat loss, prioritize a sustainable calorie deficit, resistance training, daily activity, protein, and sleep.'
    return f"Your current MetricRaw goal is {g}. I can help with workouts, recovery, nutrition basics, and progress tracking."
