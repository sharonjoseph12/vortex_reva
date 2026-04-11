import asyncio
from test_generator import generate_unit_tests

async def main():
    desc = "Write a simple Python function named 'solution' that takes one integer 'n' and returns the square of that number (n * n)."
    res = await generate_unit_tests(desc, 'python')
    print('test_count:', res['test_count'])
    print('covers_edge:', res['covers_edge_cases'])
    print('warnings:', res['warnings'])
    print('---TESTS---')
    print(res['tests'][:500])

if __name__ == "__main__":
    asyncio.run(main())
