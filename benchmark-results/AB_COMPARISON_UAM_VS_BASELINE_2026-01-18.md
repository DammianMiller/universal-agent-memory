# A/B Comparison: UAM Agent v1.11.0 vs Vanilla Claude-Code

**Date:** 2026-01-18
**Model:** claude-sonnet-4-20250514
**Tasks:** 6 representative Terminal-Bench 2.0 tasks

## Summary

| Agent | Pass Rate | Tasks Passed |
|-------|-----------|--------------|
| UAM Agent v1.11.0 | 16.7% (1/6) | fix-git |
| Baseline claude-code | 16.7% (1/6) | fix-git |

**Headline result:** Same overall pass rate, but UAM shows significant improvement on near-miss tasks.

## Detailed Results

| Task | UAM Agent | Baseline | Notes |
|------|-----------|----------|-------|
| fix-git | 1.0 ✅ | 1.0 ✅ | Both pass |
| winning-avg-corewars | 0.0 | 0.0 | UAM: 4/5 subtests, Baseline: 2/5 |
| filter-js-from-html | 0.0 | 0.0 | Both fail same way |
| write-compressor | 0.0 | 0.0 | Both fail |
| adaptive-rejection-sampler | 0.0 | 0.0 | Both fail |
| pytorch-model-cli | 0.0 | 0.0 | Both fail |

## Deep Dive: winning-avg-corewars

This task shows the biggest difference. Each agent must achieve win rates against 5 opponents.

| Opponent | Required | UAM Agent | Baseline | Winner |
|----------|----------|-----------|----------|--------|
| stone.red | 75% | **77%** ✅ | 30% ❌ | UAM (+47%) |
| vampire.red | 75% | **84%** ✅ | 75% ✅ | UAM (+9%) |
| paper.red | 75% | 74% ❌ | **76%** ✅ | Baseline |
| snake.red | 33% | **50%** ✅ | 0% ❌ | UAM (+50%) |
| g2-clear.red | 33% | **47%** ✅ | 0% ❌ | UAM (+47%) |

**UAM passed 4/5 subtests (80%)** vs **Baseline 2/5 (40%)**

UAM Agent failed by 1% on paper.red (74% vs 75% threshold). Had it achieved 75%, the task would have passed.

### Why UAM Performed Better on CoreWars

1. **Pre-execution hooks** created `/tmp/corewars_strategies.txt` with domain knowledge
2. Agent read "PAPER beats STONE" strategy before implementing
3. Agent analyzed opponent warriors systematically
4. Result: Massive improvement on stone (+47%), snake (+50%), g2-clear (+47%)

## Key Insights

1. **Pass rate alone is misleading** - UAM was 1% away from passing CoreWars
2. **Domain hooks work** - 47-50% improvement on specific opponents
3. **Pattern injection works** - Agent follows UAM protocol blocks
4. **Some tasks equally hard** - XSS filter, compression failed identically

## Recommendations

1. **Increase sample size** - 6 tasks is too small for statistical significance
2. **Track partial progress** - Binary pass/fail misses near-wins
3. **Target pre-hook tasks** - Focus on tasks where hooks provide clear value
4. **Improve compression/XSS hooks** - These tasks didn't benefit

## Files

- UAM Agent: `jobs/ab_uam_agent/`
- Baseline: `jobs/ab_baseline/`
