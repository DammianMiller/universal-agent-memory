/**
 * Hybrid Adaptive Context Selector for UAM (Option 4)
 *
 * Combines task classification with time-budget awareness, runtime monitoring,
 * and historical benefit tracking for optimal context loading decisions.
 *
 * Decision factors:
 * 1. Task classification (reasoning vs domain-knowledge tasks)
 * 2. Time budget (critical/high/medium/low pressure)
 * 3. Historical success rate for similar tasks
 * 4. Estimated overhead vs available time
 */

import { classifyTask as classifyTaskType } from './task-classifier.js';
import { recordTaskOutcome as updateModelRouterFingerprint } from './model-router.js';
import type { ModelId } from './model-router.js';

export type ContextLevel = 'none' | 'minimal' | 'full';
export type TimePressure = 'critical' | 'high' | 'medium' | 'low';

export interface ContextDecision {
  level: ContextLevel;
  sections: string[];
  reason: string;
  estimatedOverheadMs: number;
  taskType: string;
  timePressure: TimePressure;
  historicalBenefit: number;
}

export interface TaskMetadata {
  timeout_sec?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  historical_uam_benefit?: number;
}

export interface HistoricalData {
  taskType: string;
  totalAttempts: number;
  uamSuccesses: number;
  noUamSuccesses: number;
  avgTimeWithUam: number;
  avgTimeWithoutUam: number;
}

// Task categories that typically don't benefit from UAM context
// Only skip when purely in these categories with no domain overlap
const LOW_BENEFIT_CATEGORIES = new Set([
  'reasoning',
  'games',
  'pure-logic',
  'mathematical',
]);

// Keywords that suggest a task won't benefit from domain knowledge
// Removed overly broad terms: 'schedule', 'constraint', 'optimize' - these appear in DevOps/coding tasks
const SKIP_UAM_KEYWORDS = [
  'calendar meeting',
  'meeting room',
  'chess move',
  'best move',
  'game theory',
  'mathematical proof',
  'prove that',
  'logic puzzle',
  'sudoku',
  'tic tac toe',
  'crossword',
];

// Keywords that strongly suggest UAM will help
const HIGH_BENEFIT_KEYWORDS = [
  'password',
  'hash',
  'crack',
  'decrypt',
  'elf',
  'binary',
  'executable',
  'extract',
  'xss',
  'injection',
  'sanitize',
  'filter',
  'sqlite',
  'database',
  'recovery',
  'wal',
  'compile',
  'build',
  'makefile',
  'cobol',
  'modernize',
  'legacy',
];

// Context sections with token counts and relevance keywords
const CONTEXT_SECTIONS: Record<
  string,
  { tokens: number; keywords: string[]; content: string }
> = {
  security: {
    tokens: 150,
    keywords: ['xss', 'password', 'hash', 'crack', 'secret', 'exploit', 'injection', 'sanitize'],
    content: `### Security
- XSS: Use bleach.clean() or DOMPurify. Remove script, onclick, onerror, javascript:
- Password cracking: hashcat -m 11600 for 7z, -m 0 MD5, john for CPU
- Binary secrets: strings, objdump -d, check .rodata section
- Always validate and sanitize user input`,
  },
  file_formats: {
    tokens: 120,
    keywords: ['elf', 'sqlite', '7z', 'archive', 'binary', 'extract', 'format'],
    content: `### File Formats
- ELF: Program headers at e_phoff. Use struct.unpack for parsing
- SQLite WAL: Header 32 bytes, frames follow. PRAGMA wal_checkpoint to recover
- 7z: Install p7zip-full, use 7z x -p for password protected archives`,
  },
  coding: {
    tokens: 80,
    keywords: ['implement', 'function', 'class', 'refactor', 'algorithm', 'code'],
    content: `### Coding
- Use absolute paths (/app/...)
- Verify file exists before reading
- Handle edge cases in parsing
- Match exact output format required`,
  },
  tools: {
    tokens: 100,
    keywords: ['hashcat', 'john', 'strings', 'objdump', 'readelf', 'command', 'cli'],
    content: `### Tools
- hashcat: GPU password cracking, -m flag for hash type
- john: CPU password cracking, flexible format support
- readelf/objdump: Binary analysis
- strings: Extract printable strings from binaries`,
  },
  legacy: {
    tokens: 90,
    keywords: ['cobol', 'fortran', 'legacy', 'modernize', 'mainframe'],
    content: `### Legacy Code
- COBOL: Fixed-format columns, WORKING-STORAGE for variables
- Modernization: Preserve business logic, update data structures
- Test with original inputs to verify behavior`,
  },
  debugging: {
    tokens: 70,
    keywords: ['debug', 'error', 'fix', 'traceback', 'exception', 'crash'],
    content: `### Debugging
- Check logs first: journalctl, /var/log/
- Use verbose flags: -v, --debug
- Isolate the problem: binary search through changes`,
  },
};

// Estimated overhead per token (ms) - accounts for context processing
const MS_PER_TOKEN = 3;

// Historical benefit threshold - below this, skip UAM
const BENEFIT_THRESHOLD = 0.1;

// Minimum relevance score to include a section (0-1)
const RELEVANCE_THRESHOLD = 0.5;

// Max tokens for time-critical tasks (<120s timeout)
const TIME_CRITICAL_MAX_TOKENS = 200;

// In-memory historical data store (in production, use SQLite)
const historicalDataStore = new Map<string, HistoricalData>();

/**
 * Classify task type from instruction text
 * Requires stronger signals before classifying as low-benefit to avoid skipping useful context
 */
export function classifyTask(instruction: string): string {
  const lower = instruction.toLowerCase();

  // Check high-benefit keywords FIRST - these always get context
  let highBenefitMatches = 0;
  for (const kw of HIGH_BENEFIT_KEYWORDS) {
    if (lower.includes(kw)) {
      highBenefitMatches++;
    }
  }

  // If any high-benefit keyword matches, classify by domain
  if (highBenefitMatches > 0) {
    if (lower.includes('password') || lower.includes('hash') || lower.includes('crack')) {
      return 'security';
    }
    if (lower.includes('xss') || lower.includes('injection') || lower.includes('sanitize')) {
      return 'security';
    }
    if (lower.includes('elf') || lower.includes('sqlite') || lower.includes('binary')) {
      return 'file-ops';
    }
    if (lower.includes('cobol') || lower.includes('legacy') || lower.includes('modernize')) {
      return 'legacy';
    }
  }

  // Check skip keywords - require multi-word phrase match (not single words)
  let skipMatches = 0;
  for (const kw of SKIP_UAM_KEYWORDS) {
    if (lower.includes(kw)) {
      skipMatches++;
    }
  }
  
  // Only skip if we have skip signal AND no high-benefit signal
  if (skipMatches > 0 && highBenefitMatches === 0) {
    if (lower.includes('chess move') || lower.includes('best move') || lower.includes('game theory')) {
      return 'games';
    }
    if (lower.includes('mathematical proof') || lower.includes('prove that') || lower.includes('logic puzzle')) {
      return 'pure-logic';
    }
    if (lower.includes('sudoku') || lower.includes('crossword') || lower.includes('tic tac toe')) {
      return 'reasoning';
    }
    if (lower.includes('calendar meeting') || lower.includes('meeting room')) {
      return 'scheduling';
    }
  }

  // Fall back to task-classifier for detailed classification
  const classification = classifyTaskType(instruction);
  return classification.category;
}

/**
 * Assess time pressure based on timeout and task complexity
 */
export function assessTimePressure(
  timeoutSec: number,
  taskType: string,
  difficulty: string = 'medium'
): TimePressure {
  // Expected duration multipliers by difficulty
  const difficultyMultiplier: Record<string, number> = {
    easy: 0.5,
    medium: 1.0,
    hard: 2.0,
  };

  // Base expected duration by task type (seconds)
  const baseDuration: Record<string, number> = {
    security: 120,
    'file-ops': 90,
    legacy: 150,
    coding: 60,
    debugging: 90,
    scheduling: 45,
    games: 30,
    'constraint-satisfaction': 60,
    'pure-logic': 90,
    reasoning: 60,
    general: 60,
    sysadmin: 120,
    'ml-training': 180,
    testing: 60,
    unknown: 60,
  };

  const expectedDuration = (baseDuration[taskType] || 60) * (difficultyMultiplier[difficulty] || 1.0);
  const ratio = timeoutSec / expectedDuration;

  if (ratio < 1.2) return 'critical';
  if (ratio < 1.5) return 'high';
  if (ratio < 2.0) return 'medium';
  return 'low';
}

/**
 * Get historical benefit ratio for a task type
 */
export function getHistoricalBenefit(taskType: string): number {
  const data = historicalDataStore.get(taskType);
  if (!data || data.totalAttempts < 3) {
    // Not enough data - use defaults based on category
    if (LOW_BENEFIT_CATEGORIES.has(taskType)) {
      return 0.05; // Very low default for reasoning tasks
    }
    return 0.5; // Neutral default
  }

  // Calculate benefit as improvement ratio
  const uamRate = data.uamSuccesses / Math.max(data.totalAttempts / 2, 1);
  const noUamRate = data.noUamSuccesses / Math.max(data.totalAttempts / 2, 1);

  if (noUamRate === 0) return uamRate > 0 ? 1.0 : 0.5;
  return (uamRate - noUamRate) / Math.max(uamRate, noUamRate, 0.1);
}

/**
 * Record task outcome for historical tracking
 * Also updates model router fingerprints to improve future routing
 */
export function recordOutcome(
  taskType: string,
  usedUam: boolean,
  success: boolean,
  durationMs: number,
  modelId?: string
): void {
  let data = historicalDataStore.get(taskType);
  if (!data) {
    data = {
      taskType,
      totalAttempts: 0,
      uamSuccesses: 0,
      noUamSuccesses: 0,
      avgTimeWithUam: 0,
      avgTimeWithoutUam: 0,
    };
    historicalDataStore.set(taskType, data);
  }

  data.totalAttempts++;
  if (success) {
    if (usedUam) {
      data.uamSuccesses++;
      data.avgTimeWithUam =
        (data.avgTimeWithUam * (data.uamSuccesses - 1) + durationMs) / data.uamSuccesses;
    } else {
      data.noUamSuccesses++;
      data.avgTimeWithoutUam =
        (data.avgTimeWithoutUam * (data.noUamSuccesses - 1) + durationMs) / data.noUamSuccesses;
    }
  }
  
  // Update model router fingerprints for feedback loop
  if (modelId) {
    const validModelIds: ModelId[] = ['glm-4.7', 'gpt-5.2', 'claude-opus-4.5', 'gpt-5.2-codex'];
    if (validModelIds.includes(modelId as ModelId)) {
      updateModelRouterFingerprint(modelId as ModelId, success, durationMs, taskType);
    }
  }
}

/**
 * Calculate relevance score for a section (0-1)
 */
function calculateSectionRelevance(instruction: string, sectionConfig: { keywords: string[] }): number {
  const lower = instruction.toLowerCase();
  let matches = 0;
  for (const kw of sectionConfig.keywords) {
    if (lower.includes(kw.toLowerCase())) {
      matches++;
    }
  }
  return Math.min(matches / Math.max(sectionConfig.keywords.length * 0.3, 1), 1);
}

/**
 * Select relevant context sections based on task type and instruction
 * Only includes sections with relevance >= RELEVANCE_THRESHOLD
 */
export function selectRelevantSections(instruction: string, taskType: string): string[] {
  const sectionsWithScores: Array<{ name: string; score: number }> = [];

  for (const [name, config] of Object.entries(CONTEXT_SECTIONS)) {
    const score = calculateSectionRelevance(instruction, config);
    if (score >= RELEVANCE_THRESHOLD) {
      sectionsWithScores.push({ name, score });
    }
  }

  // Sort by relevance score descending
  sectionsWithScores.sort((a, b) => b.score - a.score);

  // Add default sections for certain task types if not already included
  const sections = sectionsWithScores.map(s => s.name);
  if (taskType === 'security' && !sections.includes('security')) {
    sections.push('security');
  }
  if (taskType === 'file-ops' && !sections.includes('file_formats')) {
    sections.push('file_formats');
  }
  if (taskType === 'legacy' && !sections.includes('legacy')) {
    sections.push('legacy');
  }

  return sections;
}

/**
 * Calculate estimated overhead for given sections in milliseconds
 */
export function calculateOverhead(sections: string[]): number {
  let totalTokens = 0;
  for (const section of sections) {
    totalTokens += CONTEXT_SECTIONS[section]?.tokens || 0;
  }
  return totalTokens * MS_PER_TOKEN;
}

/**
 * Main decision function: determine optimal context level using hybrid approach
 *
 * Decision Matrix:
 * 1. Task type is pure reasoning → skip UAM
 * 2. Historical benefit < threshold → skip UAM
 * 3. Critical time pressure → skip UAM
 * 4. High time pressure → minimal UAM (essential only)
 * 5. Default → full UAM with relevant sections
 */
export function decideContextLevel(
  instruction: string,
  metadata: TaskMetadata = {}
): ContextDecision {
  const taskType = classifyTask(instruction);
  const timeoutSec = metadata.timeout_sec || 300;
  const difficulty = metadata.difficulty || 'medium';

  // Factor 1: Task classification - skip for pure reasoning
  if (LOW_BENEFIT_CATEGORIES.has(taskType)) {
    return {
      level: 'none',
      sections: [],
      reason: `Task type '${taskType}' is pure reasoning - UAM adds no benefit`,
      estimatedOverheadMs: 0,
      taskType,
      timePressure: 'low',
      historicalBenefit: 0,
    };
  }

  // Factor 2: Time pressure assessment
  const timePressure = assessTimePressure(timeoutSec, taskType, difficulty);

  // Factor 3: Historical benefit
  const historicalBenefit = metadata.historical_uam_benefit ?? getHistoricalBenefit(taskType);

  // Factor 4: Check if historical data suggests skipping UAM
  if (historicalBenefit < BENEFIT_THRESHOLD) {
    return {
      level: 'none',
      sections: [],
      reason: `Low historical benefit (${(historicalBenefit * 100).toFixed(1)}%) for ${taskType}`,
      estimatedOverheadMs: 0,
      taskType,
      timePressure,
      historicalBenefit,
    };
  }

  // Factor 5: Critical time pressure - skip UAM
  if (timePressure === 'critical') {
    return {
      level: 'none',
      sections: [],
      reason: 'Critical time pressure - skipping UAM to avoid timeout',
      estimatedOverheadMs: 0,
      taskType,
      timePressure,
      historicalBenefit,
    };
  }

  // Factor 6: Select relevant sections
  const relevantSections = selectRelevantSections(instruction, taskType);
  const estimatedOverhead = calculateOverhead(relevantSections);

  // Factor 7: Check if overhead fits within time budget
  const overheadRatio = estimatedOverhead / (timeoutSec * 1000);

  // Time-critical tasks (<120s): cap overhead to TIME_CRITICAL_MAX_TOKENS
  if (timeoutSec < 120) {
    const cappedSections: string[] = [];
    let tokenBudget = TIME_CRITICAL_MAX_TOKENS;
    for (const section of relevantSections) {
      const sectionTokens = CONTEXT_SECTIONS[section]?.tokens || 0;
      if (tokenBudget - sectionTokens >= 0) {
        cappedSections.push(section);
        tokenBudget -= sectionTokens;
      }
    }
    return {
      level: cappedSections.length > 0 ? 'minimal' : 'none',
      sections: cappedSections,
      reason: `Time-critical task (<120s) - capped to ${TIME_CRITICAL_MAX_TOKENS} tokens`,
      estimatedOverheadMs: calculateOverhead(cappedSections),
      taskType,
      timePressure,
      historicalBenefit,
    };
  }

  if (timePressure === 'high' || overheadRatio > 0.1) {
    // Use minimal context - only most relevant section
    const minimalSections = relevantSections.slice(0, 1);
    return {
      level: 'minimal',
      sections: minimalSections,
      reason: `High time pressure - using minimal context (${minimalSections.join(', ') || 'best_practices'})`,
      estimatedOverheadMs: calculateOverhead(minimalSections),
      taskType,
      timePressure,
      historicalBenefit,
    };
  }

  // Default: Full context for everything else
  return {
    level: 'full',
    sections: relevantSections.length > 0 ? relevantSections : ['coding'],
    reason: `Full context for ${taskType} task (${timePressure} pressure)`,
    estimatedOverheadMs: estimatedOverhead,
    taskType,
    timePressure,
    historicalBenefit,
  };
}

/**
 * Generate context string based on decision
 */
export function generateContext(decision: ContextDecision): string {
  if (decision.level === 'none' || decision.sections.length === 0) {
    return '';
  }

  const contextParts: string[] = ['## UAM Memory Context\n'];

  for (const section of decision.sections) {
    const sectionConfig = CONTEXT_SECTIONS[section];
    if (sectionConfig) {
      contextParts.push(sectionConfig.content);
    }
  }

  return contextParts.join('\n');
}

/**
 * Progressive context strategy for retry scenarios
 *
 * Returns context levels to try in order based on initial failure analysis.
 */
export function getProgressiveContextLevels(
  instruction: string,
  initialError: string,
  metadata: TaskMetadata = {}
): ContextLevel[] {
  const decision = decideContextLevel(instruction, metadata);

  // If we already decided 'none' for a good reason, don't retry with more
  if (decision.level === 'none' && LOW_BENEFIT_CATEGORIES.has(decision.taskType)) {
    return ['none']; // Don't escalate for pure reasoning tasks
  }

  // Analyze error to see if context might help
  const errorLower = initialError.toLowerCase();
  const contextMightHelp =
    errorLower.includes('unknown') ||
    errorLower.includes('how to') ||
    errorLower.includes('what is') ||
    errorLower.includes('command not found') ||
    errorLower.includes('invalid syntax') ||
    errorLower.includes('format') ||
    errorLower.includes('parse');

  if (!contextMightHelp) {
    return [decision.level]; // Don't escalate if error is unrelated to knowledge
  }

  // Progressive escalation based on starting point
  switch (decision.level) {
    case 'none':
      return ['none', 'minimal', 'full'];
    case 'minimal':
      return ['minimal', 'full'];
    case 'full':
      return ['full']; // Already at max
    default:
      return ['none', 'minimal', 'full'];
  }
}

/**
 * Export configuration for Python agent integration
 */
export function exportConfigForPython(instruction: string, metadata: TaskMetadata = {}): string {
  const decision = decideContextLevel(instruction, metadata);
  const context = generateContext(decision);

  return JSON.stringify(
    {
      level: decision.level,
      sections: decision.sections,
      reason: decision.reason,
      estimatedOverheadMs: decision.estimatedOverheadMs,
      taskType: decision.taskType,
      timePressure: decision.timePressure,
      historicalBenefit: decision.historicalBenefit,
      context,
    },
    null,
    2
  );
}

// Export main interface
export const HybridAdaptiveContext = {
  classifyTask,
  assessTimePressure,
  getHistoricalBenefit,
  recordOutcome,
  decideContextLevel,
  generateContext,
  selectRelevantSections,
  calculateOverhead,
  getProgressiveContextLevels,
  exportConfigForPython,
};

export default HybridAdaptiveContext;
