/**
 * Dynamic Memory Retrieval System for UAM
 * 
 * Retrieves relevant memories based on task content, not static context.
 * Implements semantic search with fallback to keyword matching.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { classifyTask, extractTaskEntities, getSuggestedMemoryQueries, type TaskClassification } from './task-classifier.js';

export interface RetrievedMemory {
  content: string;
  type: 'lesson' | 'gotcha' | 'pattern' | 'context' | 'example';
  relevance: number;
  source: string;
}

export interface DynamicMemoryContext {
  classification: TaskClassification;
  relevantMemories: RetrievedMemory[];
  patterns: string[];
  gotchas: string[];
  projectContext: string;
  formattedContext: string;
}

/**
 * Main function to retrieve task-specific memory context
 */
export async function retrieveDynamicMemoryContext(
  taskInstruction: string,
  projectRoot: string = process.cwd()
): Promise<DynamicMemoryContext> {
  // Step 1: Classify the task
  const classification = classifyTask(taskInstruction);
  
  // Step 2: Extract entities from task
  const entities = extractTaskEntities(taskInstruction);
  
  // Step 3: Get suggested memory queries
  const suggestedQueries = getSuggestedMemoryQueries(classification);
  
  // Step 4: Query all memory sources
  const memories = await queryAllMemorySources(
    taskInstruction,
    classification,
    entities,
    suggestedQueries,
    projectRoot
  );
  
  // Step 5: Extract patterns and gotchas
  const patterns = memories
    .filter(m => m.type === 'pattern')
    .map(m => m.content);
  
  const gotchas = memories
    .filter(m => m.type === 'gotcha')
    .map(m => m.content);
  
  // Step 6: Get project-specific context
  const projectContext = await getProjectContext(classification, projectRoot);
  
  // Step 7: Format the context with recency bias (critical at END)
  const formattedContext = formatContextWithRecencyBias(
    classification,
    memories,
    patterns,
    gotchas,
    projectContext
  );
  
  return {
    classification,
    relevantMemories: memories,
    patterns,
    gotchas,
    projectContext,
    formattedContext,
  };
}

/**
 * Query all memory sources for relevant information
 */
async function queryAllMemorySources(
  taskInstruction: string,
  classification: TaskClassification,
  entities: ReturnType<typeof extractTaskEntities>,
  suggestedQueries: string[],
  projectRoot: string
): Promise<RetrievedMemory[]> {
  const memories: RetrievedMemory[] = [];
  
  // Source 1: Short-term SQLite memory
  const shortTermMemories = await queryShortTermMemory(
    classification,
    entities,
    projectRoot
  );
  memories.push(...shortTermMemories);
  
  // Source 2: Session memories (recent decisions)
  const sessionMemories = await querySessionMemory(taskInstruction, projectRoot);
  memories.push(...sessionMemories);
  
  // Source 3: Long-term prepopulated memory
  const longTermMemories = await queryLongTermMemory(
    suggestedQueries,
    projectRoot
  );
  memories.push(...longTermMemories);
  
  // Source 4: CLAUDE.md sections relevant to task
  const claudeMdMemories = await queryCLAUDEMd(classification, projectRoot);
  memories.push(...claudeMdMemories);
  
  // Source 5: Category-specific patterns from droids
  const droidPatterns = getCategoryPatterns(classification);
  memories.push(...droidPatterns);
  
  // Deduplicate and sort by relevance
  const uniqueMemories = deduplicateMemories(memories);
  return uniqueMemories.sort((a, b) => b.relevance - a.relevance).slice(0, 15);
}

/**
 * Query short-term SQLite memory
 */
async function queryShortTermMemory(
  classification: TaskClassification,
  entities: ReturnType<typeof extractTaskEntities>,
  projectRoot: string
): Promise<RetrievedMemory[]> {
  const dbPath = join(projectRoot, 'agents/data/memory/short_term.db');
  if (!existsSync(dbPath)) return [];
  
  const memories: RetrievedMemory[] = [];
  
  try {
    // Query by category keywords
    for (const keyword of classification.keywords.slice(0, 3)) {
      const result = execSync(
        `sqlite3 "${dbPath}" "SELECT type, content FROM memories WHERE content LIKE '%${keyword}%' ORDER BY id DESC LIMIT 3;"`,
        { encoding: 'utf-8', timeout: 5000 }
      ).trim();
      
      if (result) {
        for (const line of result.split('\n')) {
          const [type, content] = line.split('|');
          if (content) {
            memories.push({
              content: content.slice(0, 500),
              type: type === 'lesson' ? 'lesson' : 'context',
              relevance: 0.7,
              source: 'short-term-memory',
            });
          }
        }
      }
    }
    
    // Query by technology mentions
    for (const tech of entities.technologies.slice(0, 2)) {
      const result = execSync(
        `sqlite3 "${dbPath}" "SELECT type, content FROM memories WHERE content LIKE '%${tech}%' ORDER BY id DESC LIMIT 2;"`,
        { encoding: 'utf-8', timeout: 5000 }
      ).trim();
      
      if (result) {
        for (const line of result.split('\n')) {
          const [type, content] = line.split('|');
          if (content) {
            memories.push({
              content: content.slice(0, 500),
              type: type === 'gotcha' ? 'gotcha' : 'context',
              relevance: 0.6,
              source: 'short-term-memory',
            });
          }
        }
      }
    }
  } catch {
    // Ignore query errors
  }
  
  return memories;
}

/**
 * Query session memories for recent decisions
 */
async function querySessionMemory(
  _taskInstruction: string,
  projectRoot: string
): Promise<RetrievedMemory[]> {
  const dbPath = join(projectRoot, 'agents/data/memory/short_term.db');
  if (!existsSync(dbPath)) return [];
  
  const memories: RetrievedMemory[] = [];
  
  try {
    // Get recent high-importance session memories
    const result = execSync(
      `sqlite3 "${dbPath}" "SELECT type, content FROM session_memories WHERE importance >= 7 ORDER BY id DESC LIMIT 5;"`,
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    
    if (result) {
      for (const line of result.split('\n')) {
        const [type, content] = line.split('|');
        if (content) {
          memories.push({
            content: content.slice(0, 500),
            type: type === 'lesson' ? 'lesson' : type === 'decision' ? 'context' : 'pattern',
            relevance: 0.8,
            source: 'session-memory',
          });
        }
      }
    }
  } catch {
    // Ignore query errors
  }
  
  return memories;
}

/**
 * Query long-term prepopulated memory
 */
async function queryLongTermMemory(
  queries: string[],
  projectRoot: string
): Promise<RetrievedMemory[]> {
  const memoryPath = join(projectRoot, 'agents/data/memory/long_term_prepopulated.json');
  if (!existsSync(memoryPath)) return [];
  
  const memories: RetrievedMemory[] = [];
  
  try {
    const data = JSON.parse(readFileSync(memoryPath, 'utf-8'));
    const allMemories = data.memories || data.lessons || data || [];
    
    // Simple keyword matching for now (semantic search would be better)
    for (const query of queries.slice(0, 5)) {
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/);
      
      for (const mem of allMemories) {
        const content = (mem.content || mem.text || JSON.stringify(mem)).toLowerCase();
        const matchCount = queryWords.filter(w => content.includes(w)).length;
        
        if (matchCount >= 2) {
          memories.push({
            content: (mem.content || mem.text || JSON.stringify(mem)).slice(0, 500),
            type: mem.type || 'lesson',
            relevance: matchCount / queryWords.length,
            source: 'long-term-memory',
          });
        }
      }
    }
  } catch {
    // Ignore parse errors
  }
  
  return memories;
}

/**
 * Query CLAUDE.md for relevant sections
 */
async function queryCLAUDEMd(
  classification: TaskClassification,
  projectRoot: string
): Promise<RetrievedMemory[]> {
  const claudeMdPath = join(projectRoot, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) return [];
  
  const memories: RetrievedMemory[] = [];
  
  try {
    const content = readFileSync(claudeMdPath, 'utf-8');
    
    // Extract Code Field section (always relevant)
    const codeFieldMatch = content.match(/## .*CODE FIELD.*?(?=\n## |\n---\n|$)/s);
    if (codeFieldMatch) {
      memories.push({
        content: codeFieldMatch[0].slice(0, 800),
        type: 'pattern',
        relevance: 0.9,
        source: 'CLAUDE.md',
      });
    }
    
    // Extract category-specific sections
    const categorySectionMap: Record<string, RegExp[]> = {
      'sysadmin': [/## .*System|Admin|Linux|Network.*?(?=\n## |\n---\n|$)/si],
      'security': [/## .*Security|Auth.*?(?=\n## |\n---\n|$)/si],
      'testing': [/## .*Test.*?(?=\n## |\n---\n|$)/si],
      'coding': [/## .*Coding|Convention|Pattern.*?(?=\n## |\n---\n|$)/si],
    };
    
    const patterns = categorySectionMap[classification.category] || [];
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        memories.push({
          content: match[0].slice(0, 600),
          type: 'context',
          relevance: 0.75,
          source: 'CLAUDE.md',
        });
      }
    }
    
    // Extract gotchas/troubleshooting sections
    const gotchasMatch = content.match(/## .*Troubleshoot|Gotcha|Common.*?(?=\n## |\n---\n|$)/si);
    if (gotchasMatch) {
      memories.push({
        content: gotchasMatch[0].slice(0, 500),
        type: 'gotcha',
        relevance: 0.7,
        source: 'CLAUDE.md',
      });
    }
  } catch {
    // Ignore read errors
  }
  
  return memories;
}

/**
 * Get category-specific patterns from droid knowledge
 */
function getCategoryPatterns(classification: TaskClassification): RetrievedMemory[] {
  const patterns: RetrievedMemory[] = [];
  
  const categoryPatterns: Record<string, string[]> = {
    'sysadmin': [
      'Use `ip addr` instead of deprecated `ifconfig` for network info',
      'Use `ss -tlnp` instead of `netstat` for listening ports',
      'Always check `journalctl -u <service>` for service logs',
      'Use `make -j$(nproc)` for parallel kernel compilation',
    ],
    'security': [
      'Never log sensitive data (passwords, tokens, keys)',
      'Use parameterized queries to prevent SQL injection',
      'Validate and sanitize all user input',
      'Check for CVE exploits before attempting complex attacks',
    ],
    'ml-training': [
      'Start with smaller models (distilbert vs bert-large) for speed',
      'Use `CUDA_VISIBLE_DEVICES` to select specific GPUs',
      'Cache datasets to avoid repeated downloads',
      'Set `num_train_epochs=3` initially, increase if needed',
    ],
    'debugging': [
      'Use `pip check` to detect dependency conflicts',
      'Use `git reflog` to recover lost commits',
      'Check `conda env export` before modifying environments',
      'Add verbose flags (-v, --debug) to diagnose issues',
    ],
    'coding': [
      'State assumptions before writing code',
      'Handle edge cases explicitly (empty arrays, null values)',
      'Use TypeScript strict mode for better type safety',
      'Include try-catch for operations that can fail',
    ],
    'testing': [
      'Test edge cases: empty input, null, undefined',
      'Use mocks for external dependencies',
      'Aim for high coverage on critical paths',
      'Run tests before committing: `npm test`',
    ],
  };
  
  const relevantPatterns = categoryPatterns[classification.category] || [];
  for (const pattern of relevantPatterns) {
    patterns.push({
      content: pattern,
      type: 'pattern',
      relevance: 0.85,
      source: 'droid-knowledge',
    });
  }
  
  // Add common gotchas
  const commonGotchas = [
    'Array index: use `i < length`, not `i <= length`',
    'JSON.parse throws on invalid input - wrap in try/catch',
    'Empty array reduce needs initial value',
    'Map.get() returns undefined for missing keys',
  ];
  
  for (const gotcha of commonGotchas.slice(0, 2)) {
    patterns.push({
      content: gotcha,
      type: 'gotcha',
      relevance: 0.8,
      source: 'droid-knowledge',
    });
  }
  
  return patterns;
}

/**
 * Get project-specific context
 */
async function getProjectContext(
  classification: TaskClassification,
  projectRoot: string
): Promise<string> {
  const sections: string[] = [];
  
  // Add project structure if relevant
  if (['coding', 'testing', 'debugging'].includes(classification.category)) {
    try {
      const pkgJsonPath = join(projectRoot, 'package.json');
      if (existsSync(pkgJsonPath)) {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
        sections.push(`Project: ${pkg.name} v${pkg.version}`);
        if (pkg.scripts) {
          const scripts = Object.keys(pkg.scripts).slice(0, 5).join(', ');
          sections.push(`Available scripts: ${scripts}`);
        }
      }
    } catch {
      // Ignore
    }
  }
  
  return sections.join('\n');
}

/**
 * Format context with recency bias (critical info at END)
 * Based on Droid's hierarchical prompting strategy
 */
function formatContextWithRecencyBias(
  classification: TaskClassification,
  memories: RetrievedMemory[],
  patterns: string[],
  gotchas: string[],
  projectContext: string
): string {
  const sections: string[] = [];
  
  // Section 1: Project context (less critical, at start)
  if (projectContext) {
    sections.push('## Project Context\n' + projectContext);
  }
  
  // Section 2: General patterns (medium priority)
  if (patterns.length > 0) {
    sections.push('## Relevant Patterns\n' + patterns.slice(0, 5).map(p => `- ${p}`).join('\n'));
  }
  
  // Section 3: Retrieved memories
  const lessons = memories.filter(m => m.type === 'lesson').slice(0, 3);
  if (lessons.length > 0) {
    sections.push('## Lessons from Memory\n' + lessons.map(m => `- ${m.content}`).join('\n'));
  }
  
  // Section 4: Task classification info
  sections.push(`## Task Classification
- Category: ${classification.category}
- Suggested approach: Use ${classification.suggestedDroid} patterns
- Key focus: ${classification.keywords.slice(0, 3).join(', ')}`);
  
  // Section 5: CRITICAL - Gotchas at END (recency bias)
  if (gotchas.length > 0) {
    sections.push('## ⚠️ CRITICAL: Avoid These Mistakes\n' + gotchas.slice(0, 4).map(g => `- ${g}`).join('\n'));
  }
  
  // Section 6: Final reminders (most recent = highest attention)
  sections.push(`## Final Reminders
- State assumptions before coding
- Handle edge cases explicitly
- Verify solution before reporting success`);
  
  return sections.join('\n\n') + '\n\n---\n\n';
}

/**
 * Deduplicate memories by content similarity
 */
function deduplicateMemories(memories: RetrievedMemory[]): RetrievedMemory[] {
  const seen = new Set<string>();
  const unique: RetrievedMemory[] = [];
  
  for (const mem of memories) {
    const key = mem.content.slice(0, 100).toLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(mem);
    }
  }
  
  return unique;
}
