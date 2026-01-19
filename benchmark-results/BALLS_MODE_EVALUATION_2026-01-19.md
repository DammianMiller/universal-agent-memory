# Balls-Mode Evaluation Results

**Date:** 2026-01-19
**Model:** claude-sonnet-4-20250514
**UAM Version:** 1.13.0 with balls-mode skill
**Tasks Tested:** 3 near-miss tasks

---

## Executive Summary

| Task | Result | Tests | Improvement vs Previous |
|------|--------|-------|-------------------------|
| winning-avg-corewars | FAIL | 2/3 (67%) | **Worse** (was 4/5 = 80% with hooks) |
| write-compressor | FAIL | 2/3 (67%) | Same (round-trip still failing) |
| adaptive-rejection-sampler | FAIL | 8/9 (89%) | Same (1 test still failing) |

**Overall:** 0/3 tasks passed (0%)

---

## Detailed Analysis

### 1. winning-avg-corewars (2/3 tests, 67%)

**Win Rates Achieved:**
| Opponent | Required | Achieved | Status |
|----------|----------|----------|--------|
| stone.red | 75% | **7%** | ❌ FAIL |
| vampire.red | 75% | **92%** | ✅ PASS |
| paper.red | 75% | **12%** | ❌ FAIL |
| snake.red | 33% | **0%** | ❌ FAIL |
| g2-clear.red | 33% | **0%** | ❌ FAIL |

**Analysis:**
- Agent read the pre-execution hook strategies (`/tmp/corewars_strategies.txt`)
- Created hybrid paper/bomber warrior
- **Regression**: Previous A/B test showed 77% vs stone, 84% vs vampire, 74% vs paper (4/5 passing)
- This run: Only 1/5 opponents passed
- **Root Cause**: Sonnet 4 with different prompting led to different warrior implementation

**Balls-Mode Would Help?**: **NO** - This is an optimization task requiring iteration, not decomposed reasoning. The agent needs to tune strategies through trial and error, not analyze confidence scores.

---

### 2. write-compressor (2/3 tests, 67%)

**Test Results:**
- ✅ test_compressed_file_exists
- ✅ test_compression_size  
- ❌ test_decompression_produces_original

**Decompression Output:**
```
Expected: "In information theory, data compression..."
Got: "In\x0f\n" (garbage)
```

**Analysis:**
- Agent created compression code
- Compression worked (file created, size acceptable)
- Decompression produces garbage - **format mismatch with decoder**
- Pre-execution hooks provided decoder analysis and round-trip verification script
- Agent didn't successfully match the decoder's arithmetic coding format

**Balls-Mode Would Help?**: **YES** - Decomposition would flag:
- Ball 1: "Do I understand decoder format?" → Confidence: 0.3
- Ball 2: "Did I test round-trip?" → Confidence: 0.2 (weakest link)
- Would force agent to verify round-trip BEFORE optimizing

---

### 3. adaptive-rejection-sampler (8/9 tests, 89%)

**Test Results:**
- ✅ 8 tests passed (function exists, modularity, error handling, etc.)
- ❌ test_can_generate_standard_distribution_samples

**Error:**
```
ERROR: Function is not log-concave - ARS not applicable
```

**Analysis:**
- Agent implemented ARS algorithm with log-concavity checking
- The check is too strict - normal distribution IS log-concave
- Agent's `is_log_concave()` function returns false positive
- Need to tune the numerical tolerance

**Balls-Mode Would Help?**: **PARTIAL** - Decomposition could identify:
- Ball: "Is my log-concavity check correct?" → Confidence: 0.5
- But the fix requires numerical debugging, not reasoning decomposition

---

## Balls-Mode Effectiveness Assessment

Based on this evaluation:

| Task Category | Balls-Mode Helps? | Reason |
|---------------|-------------------|--------|
| **Optimization/Iteration** (corewars) | NO | Needs trial-and-error, not reasoning |
| **Format Matching** (compression) | YES | Would flag format verification as weak link |
| **Numerical Debugging** (ARS) | PARTIAL | Identifies uncertainty but doesn't fix |

### When Balls-Mode IS Effective:
1. **Pre-implementation analysis** - Identify weak assumptions before coding
2. **Debugging format mismatches** - Flag round-trip verification as critical
3. **Architectural decisions** - When multiple approaches exist

### When Balls-Mode is NOT Effective:
1. **Pure optimization tasks** - Confidence scores don't improve iteration
2. **Numerical edge cases** - Bugs in math code need debugging, not reasoning
3. **Time-constrained execution** - Adds ~500 tokens overhead

---

## Comparison: Sonnet 4 vs Opus 4.5

From historical data:

| Model | winning-avg-corewars | write-compressor | adaptive-rejection |
|-------|---------------------|------------------|-------------------|
| Opus 4.5 + UAM | 4/5 subtests (80%) | 2/3 (67%) | 8/9 (89%) |
| Sonnet 4 + UAM | 1/5 subtests (20%) | 2/3 (67%) | 8/9 (89%) |

**Key Finding**: Model capability matters more than reasoning frameworks for optimization tasks. Opus 4.5 performs significantly better on CoreWars despite identical prompts.

---

## Recommendations

### 1. Don't Add Balls-Mode to Default UAM Preamble
- Adds token overhead for ALL tasks
- Only helps ~30% of failing task types
- Better as optional skill for specific scenarios

### 2. Keep Balls-Mode as Skill for Targeted Use
- Invoke for: architectural decisions, debugging failures, security analysis
- Don't invoke for: optimization, iteration, simple implementation

### 3. Focus on Domain-Specific Fixes
- **CoreWars**: Need better warrior templates, not reasoning
- **Compression**: Need P34 (Reversibility Verification) enforcement
- **ARS**: Need numerical robustness pattern with tolerance tuning

### 4. Use Opus 4.5 for Complex Tasks
- 4x better on optimization tasks vs Sonnet 4
- Worth the cost difference for Terminal-Bench

---

## Files Created

1. `.factory/skills/balls-mode/SKILL.md` - Balls-mode skill for UAM
2. `docs/BALLS_MODE_SELF_ANALYSIS.md` - Self-analysis using balls-mode
3. `benchmark-results/BALLS_MODE_EVALUATION_2026-01-19.md` - This report

---

## Conclusion

**Balls-mode is a useful technique but NOT a silver bullet.**

- Effective for: Complex reasoning, debugging, architecture decisions
- Ineffective for: Optimization tasks, numerical issues, time-critical execution
- Best use: Optional skill invoked when agent has low confidence or has failed once

The main value of this analysis is confirming that **UAM patterns + model capability** matter more than additional reasoning frameworks. The pre-execution hooks and domain patterns in UAM v1.13.0 provide the foundation; balls-mode adds value only in specific scenarios.

**Next Steps:**
1. Focus on improving domain-specific hooks for near-miss tasks
2. Consider using Opus 4.5 for Terminal-Bench runs where budget allows
3. Keep balls-mode as optional skill for complex decisions

---

**Report Generated:** 2026-01-19T20:15:00+11:00
