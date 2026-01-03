import chalk from 'chalk';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { prepopulateMemory } from '../memory/prepopulate.js';
import { SQLiteShortTermMemory } from '../memory/short-term/sqlite.js';
import { AgentContextConfigSchema } from '../types/index.js';
import type { AgentContextConfig } from '../types/index.js';

type MemoryAction = 'status' | 'start' | 'stop' | 'query' | 'store' | 'prepopulate';

interface MemoryOptions {
  search?: string;
  limit?: string;
  content?: string;
  tags?: string;
  importance?: string;
  docs?: boolean;
  git?: boolean;
  since?: string;
  verbose?: boolean;
}

export async function memoryCommand(action: MemoryAction, options: MemoryOptions = {}): Promise<void> {
  const cwd = process.cwd();

  switch (action) {
    case 'status':
      await showStatus(cwd);
      break;
    case 'start':
      await startServices(cwd);
      break;
    case 'stop':
      await stopServices(cwd);
      break;
    case 'query':
      await queryMemory(cwd, options.search!, parseInt(options.limit || '10'));
      break;
    case 'store':
      await storeMemory(cwd, options.content!, options.tags, parseInt(options.importance || '5'));
      break;
    case 'prepopulate':
      await prepopulateFromSources(cwd, options);
      break;
  }
}

async function showStatus(cwd: string): Promise<void> {
  console.log(chalk.bold('\n📊 Memory System Status\n'));

  // Check short-term memory
  const shortTermPath = join(cwd, 'agents/data/memory/short_term.db');
  if (existsSync(shortTermPath)) {
    console.log(chalk.green('✓ Short-term memory: Active'));
    console.log(chalk.dim(`  Path: ${shortTermPath}`));
    // TODO: Query for entry count
  } else {
    console.log(chalk.yellow('○ Short-term memory: Not initialized'));
  }

  // Check Qdrant
  console.log('');
  try {
    execSync('docker ps --filter name=qdrant --format "{{.Status}}"', { encoding: 'utf-8' });
    const status = execSync('docker ps --filter name=qdrant --format "{{.Status}}"', { encoding: 'utf-8' }).trim();
    if (status) {
      console.log(chalk.green('✓ Long-term memory (Qdrant): Running'));
      console.log(chalk.dim(`  Status: ${status}`));
    } else {
      console.log(chalk.yellow('○ Long-term memory (Qdrant): Not running'));
    }
  } catch {
    console.log(chalk.yellow('○ Long-term memory (Qdrant): Not available'));
    console.log(chalk.dim('  Run `uam memory start` to initialize'));
  }

  // Check docker-compose
  const composePath = join(cwd, 'agents/docker-compose.yml');
  if (!existsSync(composePath)) {
    const dockerPath = join(cwd, 'docker/docker-compose.yml');
    if (!existsSync(dockerPath)) {
      console.log(chalk.dim('\n  No docker-compose.yml found. Memory services need manual setup.'));
    }
  }

  console.log('');
}

async function startServices(cwd: string): Promise<void> {
  const spinner = ora('Starting memory services...').start();

  // Check for docker-compose file
  const composePaths = [
    join(cwd, 'agents/docker-compose.yml'),
    join(cwd, 'docker/docker-compose.yml'),
  ];

  let composePath: string | null = null;
  for (const path of composePaths) {
    if (existsSync(path)) {
      composePath = path;
      break;
    }
  }

  if (!composePath) {
    // Create default docker-compose
    spinner.text = 'Creating docker-compose.yml...';
    const defaultCompose = `version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: uam-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - ./qdrant_data:/qdrant/storage
    environment:
      - QDRANT__SERVICE__GRPC_PORT=6334
    restart: unless-stopped
`;
    const agentsDir = join(cwd, 'agents');
    if (!existsSync(agentsDir)) {
      mkdirSync(agentsDir, { recursive: true });
    }
    composePath = join(agentsDir, 'docker-compose.yml');
    writeFileSync(composePath, defaultCompose);
  }

  try {
    execSync(`docker-compose -f "${composePath}" up -d`, { encoding: 'utf-8', stdio: 'pipe' });
    spinner.succeed('Memory services started');
    console.log(chalk.dim('  Qdrant available at http://localhost:6333'));
  } catch (error) {
    spinner.fail('Failed to start memory services');
    console.error(chalk.red('Make sure Docker is installed and running'));
    console.error(error);
  }
}

async function stopServices(cwd: string): Promise<void> {
  const spinner = ora('Stopping memory services...').start();

  const composePaths = [
    join(cwd, 'agents/docker-compose.yml'),
    join(cwd, 'docker/docker-compose.yml'),
  ];

  let composePath: string | null = null;
  for (const path of composePaths) {
    if (existsSync(path)) {
      composePath = path;
      break;
    }
  }

  if (!composePath) {
    spinner.fail('No docker-compose.yml found');
    return;
  }

  try {
    execSync(`docker-compose -f "${composePath}" down`, { encoding: 'utf-8', stdio: 'pipe' });
    spinner.succeed('Memory services stopped');
  } catch (error) {
    spinner.fail('Failed to stop memory services');
    console.error(error);
  }
}

async function queryMemory(_cwd: string, search: string, limit: number): Promise<void> {
  console.log(chalk.bold(`\n🔍 Searching for: "${search}" (limit: ${limit})\n`));

  // TODO: Implement actual Qdrant query
  console.log(chalk.yellow('Memory query not yet implemented'));
  console.log(chalk.dim('This will search the Qdrant vector database for semantically similar memories'));
}

async function storeMemory(
  _cwd: string,
  content: string,
  tags?: string,
  importance: number = 5
): Promise<void> {
  console.log(chalk.bold('\n💾 Storing memory...\n'));
  console.log(chalk.dim(`Content: ${content}`));
  console.log(chalk.dim(`Tags: ${tags || 'none'}`));
  console.log(chalk.dim(`Importance: ${importance}/10`));

  // TODO: Implement actual Qdrant store
  console.log(chalk.yellow('\nMemory storage not yet implemented'));
  console.log(chalk.dim('This will embed the content and store in Qdrant'));
}

async function prepopulateFromSources(cwd: string, options: MemoryOptions): Promise<void> {
  console.log(chalk.bold('\n🧠 Prepopulating Memory from Project Sources\n'));

  // Load config
  const configPath = join(cwd, '.uam.json');
  let config: AgentContextConfig;
  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
      config = AgentContextConfigSchema.parse(raw);
    } catch {
      config = {
        version: '1.0.0',
        project: { name: 'project', defaultBranch: 'main' },
      };
    }
  } else {
    config = {
      version: '1.0.0',
      project: { name: 'project', defaultBranch: 'main' },
    };
  }

  const sources: string[] = [];
  if (options.docs) sources.push('documentation');
  if (options.git) sources.push('git history');
  if (sources.length === 0) sources.push('documentation', 'git history');

  console.log(chalk.dim(`Sources: ${sources.join(', ')}`));
  if (options.limit) console.log(chalk.dim(`Git commit limit: ${options.limit}`));
  if (options.since) console.log(chalk.dim(`Git commits since: ${options.since}`));
  console.log('');

  const spinner = ora('Extracting knowledge from project...').start();

  try {
    const { shortTerm, longTerm, skills } = await prepopulateMemory(cwd, {
      docs: options.docs || (!options.docs && !options.git),
      git: options.git || (!options.docs && !options.git),
      skills: true, // Always discover skills
      limit: options.limit ? parseInt(options.limit) : 500,
      since: options.since,
      verbose: options.verbose,
    });

    spinner.succeed(`Extracted ${shortTerm.length} short-term, ${longTerm.length} long-term memories, ${skills.length} skills/artifacts`);

    // Store short-term memories to SQLite
    if (shortTerm.length > 0) {
      const stSpinner = ora('Storing short-term memories...').start();
      try {
        const dbPath = config.memory?.shortTerm?.path || join(cwd, 'agents/data/memory/short_term.db');
        const shortTermDb = new SQLiteShortTermMemory({
          dbPath,
          projectId: config.project.name,
          maxEntries: config.memory?.shortTerm?.maxEntries || 50,
        });

        // Store memories in batch
        const entries = shortTerm.map(m => ({
          type: m.type,
          content: m.content,
          timestamp: m.timestamp,
        }));
        await shortTermDb.storeBatch(entries);
        await shortTermDb.close();

        stSpinner.succeed(`Stored ${shortTerm.length} short-term memories to SQLite`);
        console.log(chalk.dim(`  Database: ${dbPath}`));
      } catch (error) {
        stSpinner.fail('Failed to store short-term memories');
        console.error(chalk.red(error));
      }
    }

    // Store long-term memories (summary for now)
    if (longTerm.length > 0) {
      console.log(chalk.dim(`\n  Long-term memories ready: ${longTerm.length} entries`));
      console.log(chalk.dim('  To store in Qdrant, run: uam memory start'));
      
      // Save long-term memories as JSON for manual import or Qdrant storage
      const ltPath = join(cwd, 'agents/data/memory/long_term_prepopulated.json');
      const ltDir = join(cwd, 'agents/data/memory');
      if (!existsSync(ltDir)) {
        mkdirSync(ltDir, { recursive: true });
      }
      writeFileSync(ltPath, JSON.stringify(longTerm, null, 2));
      console.log(chalk.dim(`  Exported to: ${ltPath}`));
    }

    // Summary by type
    console.log(chalk.bold('\n📊 Memory Summary:\n'));
    const byType = {
      observations: longTerm.filter(m => m.type === 'observation').length,
      thoughts: longTerm.filter(m => m.type === 'thought').length,
      actions: longTerm.filter(m => m.type === 'action').length,
      goals: longTerm.filter(m => m.type === 'goal').length,
    };
    console.log(chalk.dim(`  Observations: ${byType.observations}`));
    console.log(chalk.dim(`  Thoughts: ${byType.thoughts}`));
    console.log(chalk.dim(`  Actions: ${byType.actions}`));
    console.log(chalk.dim(`  Goals: ${byType.goals}`));

    // Show sample memories
    if (options.verbose && shortTerm.length > 0) {
      console.log(chalk.bold('\n📝 Sample Memories:\n'));
      for (const mem of shortTerm.slice(0, 3)) {
        console.log(chalk.cyan(`  [${mem.type}] `) + chalk.dim(mem.content.substring(0, 100) + '...'));
      }
    }

    console.log(chalk.green('\n✅ Memory prepopulation complete!\n'));

  } catch (error) {
    spinner.fail('Failed to prepopulate memory');
    console.error(chalk.red(error));
  }
}
