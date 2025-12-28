#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from '../cli/init.js';
import { analyzeCommand } from '../cli/analyze.js';
import { generateCommand } from '../cli/generate.js';
import { memoryCommand } from '../cli/memory.js';
import { worktreeCommand } from '../cli/worktree.js';
import { syncCommand } from '../cli/sync.js';
import { droidsCommand } from '../cli/droids.js';

const program = new Command();

program
  .name('agent-context')
  .description('Universal AI agent context system for Claude Code, Factory.AI, VSCode, and OpenCode')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize agent context in the current project')
  .option('-p, --platform <platforms...>', 'Target platforms (claude, factory, vscode, opencode, all)', ['all'])
  .option('--web', 'Quick setup for web platforms (claude.ai, factory.ai)')
  .option('--desktop', 'Quick setup for desktop platforms (Claude Code, VSCode)')
  .option('--interactive', 'Interactive setup with all options')
  .option('--with-memory', 'Set up memory system (SQLite + Qdrant)')
  .option('--with-worktrees', 'Set up git worktree workflow')
  .option('--force', 'Overwrite existing configuration')
  .action(initCommand);

program
  .command('analyze')
  .description('Analyze project structure and generate metadata')
  .option('-o, --output <format>', 'Output format (json, yaml, md)', 'json')
  .option('--save', 'Save analysis to .agent-context.analysis.json')
  .action(analyzeCommand);

program
  .command('generate')
  .description('Generate or update CLAUDE.md and related files')
  .option('-f, --force', 'Overwrite existing files without confirmation')
  .option('-d, --dry-run', 'Show what would be generated without writing')
  .option('-p, --platform <platform>', 'Generate for specific platform only')
  .option('--web', 'Generate AGENT.md for web platforms (claude.ai, factory.ai)')
  .action(generateCommand);

program
  .command('memory')
  .description('Manage agent memory system')
  .addCommand(
    new Command('status')
      .description('Show memory system status')
      .action(() => memoryCommand('status'))
  )
  .addCommand(
    new Command('start')
      .description('Start memory services (Qdrant container)')
      .action(() => memoryCommand('start'))
  )
  .addCommand(
    new Command('stop')
      .description('Stop memory services')
      .action(() => memoryCommand('stop'))
  )
  .addCommand(
    new Command('query')
      .description('Query long-term memory')
      .argument('<search>', 'Search term')
      .option('-n, --limit <number>', 'Max results', '10')
      .action((search, options) => memoryCommand('query', { search, ...options }))
  )
  .addCommand(
    new Command('store')
      .description('Store a memory')
      .argument('<content>', 'Memory content')
      .option('-t, --tags <tags>', 'Comma-separated tags')
      .option('-i, --importance <number>', 'Importance score (1-10)', '5')
      .action((content, options) => memoryCommand('store', { content, ...options }))
  )
  .addCommand(
    new Command('prepopulate')
      .description('Prepopulate memory from documentation and git history')
      .option('--docs', 'Import from documentation only')
      .option('--git', 'Import from git history only')
      .option('-n, --limit <number>', 'Limit git commits to analyze', '500')
      .option('--since <date>', 'Only analyze commits since date (e.g., "2024-01-01")')
      .option('-v, --verbose', 'Show detailed output')
      .action((options) => memoryCommand('prepopulate', options))
  );

program
  .command('worktree')
  .description('Manage git worktrees')
  .addCommand(
    new Command('create')
      .description('Create a new worktree for a feature')
      .argument('<slug>', 'Feature slug (e.g., add-user-auth)')
      .action((slug) => worktreeCommand('create', { slug }))
  )
  .addCommand(
    new Command('list')
      .description('List all worktrees')
      .action(() => worktreeCommand('list'))
  )
  .addCommand(
    new Command('pr')
      .description('Create PR from worktree')
      .argument('<id>', 'Worktree ID')
      .option('--draft', 'Create as draft PR')
      .action((id, options) => worktreeCommand('pr', { id, ...options }))
  )
  .addCommand(
    new Command('cleanup')
      .description('Remove worktree and delete branch')
      .argument('<id>', 'Worktree ID')
      .action((id) => worktreeCommand('cleanup', { id }))
  );

program
  .command('sync')
  .description('Sync configuration between platforms')
  .option('--from <platform>', 'Source platform (claude, factory, vscode, opencode)')
  .option('--to <platform>', 'Target platform(s)')
  .action(syncCommand);

program
  .command('droids')
  .description('Manage custom droids/agents')
  .addCommand(
    new Command('list')
      .description('List all droids')
      .action(() => droidsCommand('list'))
  )
  .addCommand(
    new Command('add')
      .description('Add a new droid')
      .argument('<name>', 'Droid name')
      .option('-t, --template <template>', 'Use built-in template')
      .action((name, options) => droidsCommand('add', { name, ...options }))
  )
  .addCommand(
    new Command('import')
      .description('Import droids from another platform')
      .argument('<path>', 'Path to import from')
      .action((path) => droidsCommand('import', { path }))
  );

program
  .command('update')
  .description('Update package and templates')
  .action(() => {
    console.log(chalk.yellow('Update functionality coming soon...'));
  });

program.parse();
