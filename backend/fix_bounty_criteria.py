import sqlite3

db_path = "vortex.db"
bounty_id = "3f671b07-a0c1-4cb6-bb95-912a23240790"

criteria = """import pytest
from solution import solution

def test_integer_square():
    \"\"\"Verify that the square of an integer is correct.\"\"\"
    assert solution(4) == 16
    assert solution(0) == 0
    assert solution(-3) == 9

def test_float_square():
    \"\"\"Verify that the square of a float is correct within precision.\"\"\"
    assert abs(solution(2.5) - 6.25) < 0.0001
    assert abs(solution(1.1) - 1.21) < 0.0001

def test_type_error_on_string():
    \"\"\"Verification: Protocol must reject string inputs with TypeError.\"\"\"
    with pytest.raises(TypeError):
        solution("10")

def test_type_error_on_none():
    \"\"\"Verification: Protocol must reject NoneType inputs.\"\"\"
    with pytest.raises(TypeError):
        solution(None)

def test_type_error_on_list():
    \"\"\"Verification: Protocol must reject complex structures.\"\"\"
    with pytest.raises(TypeError):
        solution([1, 2, 3])

def test_large_numeric_values():
    \"\"\"Check performance/overflow boundaries for large numbers.\"\"\"
    assert solution(10000) == 100000000"""

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("UPDATE bounties SET verification_criteria = ? WHERE id = ?", (criteria, bounty_id))
conn.commit()
conn.close()
print(f"Successfully fixed indentation for bounty {bounty_id}")
