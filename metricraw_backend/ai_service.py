
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(
    api_key=os.getenv("AI_API_KEY")
)

AI_MODEL = os.getenv("AI_MODEL")


def chat_with_ai(message, history=None):

    if not AI_MODEL:
        raise ValueError("AI_MODEL is missing in .env")

    chat_history = []

    for item in (history or [])[-20:]:
        role = item.get("role")
        content = item.get("content", "")

        if role not in ["user", "assistant"]:
            continue

        if not isinstance(content, str) or not content.strip():
            continue

        chat_history.append(
            types.Content(
                role="user" if role == "user" else "model",
                parts=[types.Part.from_text(text=content)]
            )
        )

    chat = client.chats.create(
        model=AI_MODEL,
        history=chat_history,
        config=types.GenerateContentConfig(
            system_instruction="""
            You are MetricRaw AI, a friendly fitness assistant.

            Help users with:
            - Workout routines
            - Muscle building
            - Weight loss
            - Exercise techniques
            - Healthy nutrition
            - Gym training

            Give clear and helpful answers.
            Keep answers easy to understand.
            Do not diagnose medical conditions.
            Recommend professional medical advice for injuries
            or medical concerns.
            """
        )
    )

    response = chat.send_message(message)

    return response.text
