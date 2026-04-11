import os
import asyncio
from google import genai
from google.genai import types
from dotenv import load_dotenv
load_dotenv()

client = genai.Client()

async def main():
    resp = await client.aio.models.generate_content(
        model='gemini-2.5-flash',
        contents="Task: Write a simple Python function named 'solution' that returns the square of n.",
        config=types.GenerateContentConfig(
            system_instruction="You are a test engineer. Generate pytest.",
            temperature=0.2
        )
    )
    print("SUCCESS:", resp.text)

if __name__ == "__main__":
    asyncio.run(main())
