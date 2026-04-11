import asyncio
from test_generator import generate_unit_tests

async def main():
    try:
        desc = "Write a simple Python function named 'solution' that takes one integer 'n' and returns the square of that number (n * n)."
        res = await generate_unit_tests(desc, 'python')
        print('SUCCESS:', res)
    except Exception as e:
        print('ERROR:', str(e))

if __name__ == "__main__":
    asyncio.run(main())
