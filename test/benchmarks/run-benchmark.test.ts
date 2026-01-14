import { NaiveAgent } from '../../src/benchmarks/agents/naive-agent';
import { UAMAgent } from '../../src/benchmarks/agents/uam-agent';
import { BENCHMARK_TASKS } from '../../src/benchmarks/tasks';
import type {
  BenchmarkTask,
  BenchmarkResult,
  OverallBenchmarkStats,
  AgentExecution,
} from '../../src/benchmarks/benchmark';
import fs from 'node:fs';

// ============================================================================
// Benchmark Configuration
// ============================================================================

const BENCHMARK_CONFIG = {
  maxAttempts: 3,
  timeoutMs: 300000, // 5 minutes per task
  verbose: true,
};

// ============================================================================
// Benchmark Runner
// ============================================================================

class BenchmarkRunner {
  private naiveAgent = new NaiveAgent();
  private uamAgent = new UAMAgent();
  private results: AgentExecution[] = [];

  /**
   * Run benchmark on a single task
   */
  async runTask(task: BenchmarkTask): Promise<BenchmarkResult> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Task: ${task.name}`);
    console.log(`ID: ${task.id}`);
    console.log(`Difficulty: ${task.difficulty}`);
    console.log(`Category: ${task.category}`);
    console.log(`Instruction: ${task.instruction.slice(0, 100)}...`);
    console.log(`${'='.repeat(60)}\n`);

    const results: AgentExecution[] = [];

    // Run naive agent
    console.log(`Running Naive Agent...`);
    for (let attempt = 1; attempt <= BENCHMARK_CONFIG.maxAttempts; attempt++) {
      console.log(`  Attempt ${attempt}/${BENCHMARK_CONFIG.maxAttempts}...`);
      const execution = await this.runAgent(this.naiveAgent, task, attempt);
      results.push(execution);
      if (execution.success) break;
    }

    // Run UAM agent
    console.log(`Running UAM Agent...`);
    for (let attempt = 1; attempt <= BENCHMARK_CONFIG.maxAttempts; attempt++) {
      console.log(`  Attempt ${attempt}/${BENCHMARK_CONFIG.maxAttempts}...`);
      const execution = await this.runAgent(this.uamAgent, task, attempt);
      results.push(execution);
      if (execution.success) break;
    }

    this.results.push(...results);

    // Calculate summary
    const naiveResults = results.filter(r => r.agent === this.naiveAgent['name']);
    const uamResults = results.filter(r => r.agent === this.uamAgent['name']);

    const naiveSuccess = naiveResults.filter(r => r.success).length;
    const uamSuccess = uamResults.filter(r => r.success).length;

    const naiveSuccessRate = (naiveSuccess / naiveResults.length) * 100;
    const uamSuccessRate = (uamSuccess / uamResults.length) * 100;

    const naiveAvgTotalDuration = naiveResults.reduce((sum, r) => sum + r.durationMs, 0);
    const uamAvgTotalDuration = uamResults.reduce((sum, r) => sum + r.durationMs, 0);
    
    const naiveAvgDuration = naiveResults.length > 0 
      ? naiveAvgTotalDuration / naiveResults.length / 1000 
      : 0;
    const uamAvgDuration = uamResults.length > 0 
      ? uamAvgTotalDuration / uamResults.length / 1000 
      : 0;

    const successDelta = uamSuccessRate - naiveSuccessRate;
    const speedup = naiveAvgDuration > 0 ? naiveAvgDuration / uamAvgDuration : 1;

    const summary = {
      uamSuccessRate,
      naiveSuccessRate,
      uamAvgDuration,
      naiveAvgDuration,
      improvement: {
        successDelta,
        speedup,
        memoryQueries: (uamResults[0]?.memoryQueries || 0),
      },
    };

    return {
      taskId: task.id,
      taskName: task.name,
      results,
      summary,
    };
  }

  /**
   * Run a single agent on a task
   */
  private async runAgent(
    agent: NaiveAgent | UAMAgent,
    task: BenchmarkTask,
    attempt: number
  ): Promise<AgentExecution> {
    return await agent.executeTask(task, attempt);
  }

  /**
   * Run all benchmark tasks
   */
  async runAllTasks(): Promise<BenchmarkResult[]> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting UAM Terminal-Bench Adapter Benchmark`);
    console.log(`Total Tasks: ${BENCHMARK_TASKS.length}`);
    console.log(`Max Attempts: ${BENCHMARK_CONFIG.maxAttempts}`);
    console.log(`Timeout: ${BENCHMARK_CONFIG.timeoutMs}ms`);
    console.log(`${'='.repeat(60)}\n`);

    const results: BenchmarkResult[] = [];

    for (const task of BENCHMARK_TASKS) {
      const result = await this.runTask(task);
      results.push(result);
    }

    return results;
  }

  /**
   * Calculate overall statistics
   */
  calculateOverallStats(results: BenchmarkResult[]): OverallBenchmarkStats {
    const totalTasks = results.length;

    let uamSuccess = 0;
    let naiveSuccess = 0;
    let uamTotalDuration = 0;
    let naiveTotalDuration = 0;

    const byDifficulty: Record<string, { count: number; uamSuccess: number; naiveSuccess: number }> = {};
    const byCategory: Record<string, { count: number; uamSuccess: number; naiveSuccess: number }> = {};

    for (const result of results) {
      const task = BENCHMARK_TASKS.find(t => t.id === result.taskId)!;

      // Count successes
      const uamExecutions = result.results.filter(r => r.agent === 'uam-agent');
      const naiveExecutions = result.results.filter(r => r.agent === this.naiveAgent['name']);

      if (uamExecutions.some(r => r.success)) uamSuccess++;
      if (naiveExecutions.some(r => r.success)) naiveSuccess++;

      // Sum durations
      const uamDuration = uamExecutions.reduce((sum, r) => sum + r.durationMs, 0);
      const naiveDuration = naiveExecutions.reduce((sum, r) => sum + r.durationMs, 0);
      uamTotalDuration += uamDuration / uamExecutions.length / 1000;
      naiveTotalDuration += naiveDuration / naiveExecutions.length / 1000;

      // By difficulty
      if (!byDifficulty[task.difficulty]) {
        byDifficulty[task.difficulty] = { count: 0, uamSuccess: 0, naiveSuccess: 0 };
      }
      byDifficulty[task.difficulty].count++;
      if (uamExecutions.some(r => r.success)) byDifficulty[task.difficulty].uamSuccess++;
      if (naiveExecutions.some(r => r.success)) byDifficulty[task.difficulty].naiveSuccess++;

      // By category
      if (!byCategory[task.category]) {
        byCategory[task.category] = { count: 0, uamSuccess: 0, naiveSuccess: 0 };
      }
      byCategory[task.category].count++;
      if (uamExecutions.some(r => r.success)) byCategory[task.category].uamSuccess++;
      if (naiveExecutions.some(r => r.success)) byCategory[task.category].naiveSuccess++;
    }

    return {
      totalTasks,
      uamSuccess,
      naiveSuccess,
      uamSuccessRate: (uamSuccess / totalTasks) * 100,
      naiveSuccessRate: (naiveSuccess / totalTasks) * 100,
      uamAvgDuration: totalTasks > 0 ? uamTotalDuration / totalTasks : 0,
      naiveAvgDuration: totalTasks > 0 ? naiveTotalDuration / totalTasks : 0,
      overallSpeedup: 
        naiveTotalDuration > 0 
          ? (naiveTotalDuration / totalTasks) / (uamTotalDuration / totalTasks)
          : 1,
      byDifficulty,
      byCategory,
    };
  }

  /**
   * Generate markdown report
   */
  generateReport(results: BenchmarkResult[], stats: OverallBenchmarkStats): string {
    const timestamp = new Date().toISOString();
    
    let report = `# UAM Terminal-Bench Adapter - Benchmark Report\n\n`;
    report += `**Generated:** ${timestamp}\n`;
    report += `**Total Tasks:** ${stats.totalTasks}\n`;
    report += `**Agent Name:** UAM Agent (uam-agent) vs Naive Agent (naive-agent)\n\n`;

    // Executive Summary
    report += `## Executive Summary\n\n`;
    report += `| Metric | Naive Agent | UAM Agent | Improvement |\n`;
    report += `|--------|-------------|-----------|-------------|\n`;
    report += `| Success Rate | ${stats.naiveSuccessRate.toFixed(1)}% | ${stats.uamSuccessRate.toFixed(1)}% | +${stats.summary?.improvement?.successDelta.toFixed(1) || 0}% |\n`;
    report += `| Avg Duration | ${stats.naiveAvgDuration.toFixed(2)}s | ${stats.uamAvgDuration.toFixed(2)}s | ${(stats.overallSpeedup).toFixed(2)}x faster |\n`;
    report += `| Tasks Succeeded | ${stats.naiveSuccess}/${stats.totalTasks} | ${stats.uamSuccess}/${stats.totalTasks} | +${stats.uamSuccess - stats.naiveSuccess} tasks |\n\n`;

    // By Difficulty
    report += `## Results by Difficulty\n\n`;
    report += `| Difficulty | Count | Naive Success | UAM Success |\n`;
    report += `|-----------|-------|---------------|-------------|\n`;
    for (const [difficulty, data] of Object.entries(stats.byDifficulty)) {
      report += `| ${difficulty} | ${data.count} | ${data.naiveSuccess} | ${data.uamSuccess} |\n`;
    }
    report += `\n`;

    // By Category
    report += `## Results by Category\n\n`;
    report += `| Category | Count | Naive Success | UAM Success |\n`;
    report += `|----------|-------|---------------|-------------|\n`;
    for (const [category, data] of Object.entries(stats.byCategory)) {
      report += `| ${category} | ${data.count} | ${data.naiveSuccess} | ${data.uamSuccess} |\n`;
    }
    report += `\n`;

    // Detailed Results
    report += `## Detailed Task Results\n\n`;
    for (const result of results) {
      report += `### ${result.taskName}\n`;
      report += `**ID:** ${result.taskId}  \n`;
      report += `**Success Rate:** Naive: ${result.summary.naiveSuccessRate.toFixed(1)}%, UAM: ${result.summary.uamSuccessRate.toFixed(1)}%  \n`;
      report += `**Avg Duration:** Naive: ${result.summary.naiveAvgDuration.toFixed(2)}s, UAM: ${result.summary.uamAvgDuration.toFixed(2)}s  \n`;
      report += `**Speedup:** ${result.summary.improvement.speedup.toFixed(2)}x  \n\n`;
    }

    // Memory Statistics
    report += `## Memory Statistics (UAM Agent)\n\n`;
    const uamMemoryStats = this.uamAgent['getStats']?.()?.memoryStats || {};
    report += `- Short-term entries: ${uamMemoryStats.shortTermCount || 0}\n`;
    report += `- Long-term entries: ${uamMemoryStats.longTermCount || 0}\n`;
    report += `- Lessons stored: ${uamMemoryStats.lessonsCount || 0}\n\n`;

    return report;
  }

  /**
   * Save report to file
   */
  saveReport(report: string, path: string = './BENCHMARK_RESULTS.md'): void {
    fs.writeFileSync(path, report, 'utf-8');
    console.log(`\nBenchmark report saved to: ${path}`);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const runner = new BenchmarkRunner();

  try {
    // Run all tasks
    const results = await runner.runAllTasks();

    // Calculate overall statistics
    const stats = runner.calculateOverallStats(results);

    // Generate report
    const report = runner.generateReport(results, stats);
    
    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`BENCHMARK COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Tasks: ${stats.totalTasks}`);
    console.log(`Naive Success Rate: ${stats.naiveSuccessRate.toFixed(1)}%`);
    console.log(`UAM Success Rate: ${stats.uamSuccessRate.toFixed(1)}%`);
    console.log(`Success Improvement: +${(stats.uamSuccessRate - stats.naiveSuccessRate).toFixed(1)}%`);
    console.log(`Overall Speedup: ${stats.overallSpeedup.toFixed(2)}x faster`);
    console.log(`${'='.repeat(60)}`);

    // Save report
    runner.saveReport(report);

    process.exit(0);
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { BenchmarkRunner };
