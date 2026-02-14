| name | description | argument-hint |
| --- | --- | --- |
| near-miss | Use when >50% of tests pass but not all. Focuses on fixing specific failing tests without breaking passing ones. Reserve 30% of time budget for this iteration loop. | failing test output or test names |

# Near-Miss Iteration

## Detection
Test results show partial success: 8/9, 6/7, 5/6, or any >50% pass rate with failures remaining.

## Protocol
1. Run tests with verbose output to identify exact failures
2. Extract ONLY failing test names
3. Read failing test source code to understand the exact requirement
4. Fix the specific issue without touching passing code
5. Re-run ONLY the failing test first: `pytest test_file.py::test_name -v`
6. Then run full suite to verify no regressions
7. Repeat until 100% or time budget exhausted

## Rules
- **Reserve 30% of time** for this iteration loop
- Fix ONE test at a time -- do not batch fixes
- Never refactor passing code while fixing failures
- If a fix breaks a passing test, revert and try a different approach
- Never give up on a task that is >50% passing -- small fixes flip outcomes
- Read the assertion message carefully -- it often contains the expected value
