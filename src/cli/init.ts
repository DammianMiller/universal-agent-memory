import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { analyzeProject } from '../analyzers/index.js';
import { generateClaudeMd } from '../generators/claude-md.js';
import { mergeClaudeMd } from '../utils/merge-claude-md.js';
import type { AgentContextConfig, Platform } from '../types/index.js';

interface InitOptions {
  platform: string[];
  web?: boolean;
  desktop?: boolean;
  interactive?: boolean;
  withMemory?: boolean;
  withWorktrees?: boolean;
  force?: boolean;
}

const PLATFORM_MAP: Record<string, Platform> = {
  claude: 'claudeCode',
  factory: 'factory',
  vscode: 'vscode',
  opencode: 'opencode',
};

export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const configPath = join(cwd, '.agent-context.json');

  console.log(chalk.bold('\n🚀 Agent Context Initialization\n'));

  // Check for existing config
  if (existsSync(configPath) && !options.force) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Configuration already exists. Overwrite?',
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.yellow('Initialization cancelled.'));
      return;
    }
  }

  // Determine platforms
  const platforms: Platform[] = options.platform.includes('all')
    ? ['claudeCode', 'factory', 'vscode', 'opencode']
    : options.platform.map((p) => PLATFORM_MAP[p] || p) as Platform[];

  // Analyze project
  const spinner = ora('Analyzing project structure...').start();
  let analysis;
  try {
    analysis = await analyzeProject(cwd);
    spinner.succeed(`Analyzed: ${analysis.projectName}`);
  } catch (error) {
    spinner.fail('Failed to analyze project');
    console.error(chalk.red(error));
    return;
  }

  // Display analysis summary
  console.log(chalk.dim('\nDetected:'));
  console.log(chalk.dim(`  Languages: ${analysis.languages.join(', ') || 'none detected'}`));
  console.log(chalk.dim(`  Frameworks: ${analysis.frameworks.join(', ') || 'none detected'}`));
  console.log(chalk.dim(`  Databases: ${analysis.databases.map((d) => d.type).join(', ') || 'none detected'}`));

  // Prompt for additional options if not specified
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'withMemory',
      message: 'Set up memory system (SQLite + Qdrant)?',
      default: true,
      when: () => options.withMemory === undefined,
    },
    {
      type: 'confirm',
      name: 'withWorktrees',
      message: 'Set up git worktree workflow?',
      default: true,
      when: () => options.withWorktrees === undefined,
    },
  ]);

  const withMemory = options.withMemory ?? answers.withMemory ?? true;
  const withWorktrees = options.withWorktrees ?? answers.withWorktrees ?? true;

  // Build configuration
  const config: AgentContextConfig = {
    $schema: 'https://agent-context.dev/schema.json',
    version: '1.0.0',
    project: {
      name: analysis.projectName,
      description: analysis.description,
      defaultBranch: analysis.defaultBranch,
    },
    platforms: {
      claudeCode: { enabled: platforms.includes('claudeCode') },
      factory: { enabled: platforms.includes('factory') },
      vscode: { enabled: platforms.includes('vscode') },
      opencode: { enabled: platforms.includes('opencode') },
    },
    memory: withMemory
      ? {
          shortTerm: {
            enabled: true,
            path: './agents/data/memory/short_term.db',
            webDatabase: 'agent_context_memory',
            maxEntries: 50,
            forceDesktop: false,
          },
          longTerm: {
            enabled: true,
            provider: 'qdrant',
            endpoint: 'localhost:6333',
            collection: 'agent_memory',
            embeddingModel: 'all-MiniLM-L6-v2',
          },
        }
      : undefined,
    worktrees: withWorktrees
      ? {
          enabled: true,
          directory: '.worktrees',
          branchPrefix: 'feature/',
          autoCleanup: true,
        }
      : undefined,
    droids: [],
    commands: [],
    template: {
      extends: 'default',
      sections: {
        memorySystem: withMemory,
        browserUsage: true,
        decisionLoop: true,
        worktreeWorkflow: withWorktrees,
        troubleshooting: true,
        augmentedCapabilities: true,
      },
    },
  };

  // Write configuration
  const configSpinner = ora('Writing configuration...').start();
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    configSpinner.succeed('Created .agent-context.json');
  } catch (error) {
    configSpinner.fail('Failed to write configuration');
    console.error(chalk.red(error));
    return;
  }

  // Create directory structure
  const dirsSpinner = ora('Creating directory structure...').start();
  try {
    const dirs = [
      'agents/data/memory',
      'agents/data/screenshots',
      'agents/scripts',
    ];

    if (withWorktrees) {
      dirs.push('.worktrees');
    }

    for (const dir of dirs) {
      const fullPath = join(cwd, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    }
    dirsSpinner.succeed('Created directory structure');
  } catch (error) {
    dirsSpinner.fail('Failed to create directories');
    console.error(chalk.red(error));
  }

  // Generate CLAUDE.md
  const claudeMdPath = join(cwd, 'CLAUDE.md');
  const agentMdPath = join(cwd, 'AGENT.md');
  const claudeMdExists = existsSync(claudeMdPath);
  const agentMdExists = existsSync(agentMdPath);
  
  let existingContent: string | undefined;
  let targetPath = claudeMdPath;
  let shouldGenerateClaude = true;
  
  if ((claudeMdExists || agentMdExists) && !options.force) {
    // Read existing content
    if (claudeMdExists) {
      existingContent = readFileSync(claudeMdPath, 'utf-8');
      targetPath = claudeMdPath;
    } else if (agentMdExists) {
      existingContent = readFileSync(agentMdPath, 'utf-8');
      targetPath = agentMdPath;
    }
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: `${claudeMdExists ? 'CLAUDE.md' : 'AGENT.md'} already exists. What would you like to do?`,
        choices: [
          { name: 'Merge with existing content (recommended)', value: 'merge' },
          { name: 'Overwrite completely', value: 'overwrite' },
          { name: 'Skip generation', value: 'skip' },
        ],
        default: 'merge',
      },
    ]);
    
    if (action === 'skip') {
      shouldGenerateClaude = false;
      console.log(chalk.dim('Skipping CLAUDE.md generation'));
    } else if (action === 'overwrite') {
      existingContent = undefined;
    }
  }
  
  if (shouldGenerateClaude) {
    const claudeSpinner = ora(`${existingContent ? 'Merging' : 'Generating'} CLAUDE.md...`).start();
    try {
      const newClaudeMd = await generateClaudeMd(analysis, config);
      const claudeMd = existingContent ? mergeClaudeMd(existingContent, newClaudeMd) : newClaudeMd;
      writeFileSync(targetPath, claudeMd);
      claudeSpinner.succeed(`${existingContent ? 'Merged and updated' : 'Generated'} ${targetPath.endsWith('CLAUDE.md') ? 'CLAUDE.md' : 'AGENT.md'}`);
      if (existingContent) {
        console.log(chalk.dim('  Preserved custom sections from existing file'));
      }
    } catch (error) {
      claudeSpinner.fail(`Failed to ${existingContent ? 'merge' : 'generate'} CLAUDE.md`);
      console.error(chalk.red(error));
    }
  }

  // Platform-specific setup
  for (const platform of platforms) {
    const platformSpinner = ora(`Setting up ${platform}...`).start();
    try {
      await setupPlatform(cwd, platform, config);
      platformSpinner.succeed(`Set up ${platform}`);
    } catch (error) {
      platformSpinner.fail(`Failed to set up ${platform}`);
      console.error(chalk.red(error));
    }
  }

  // Final summary
  console.log(chalk.green('\n✅ Initialization complete!\n'));
  console.log(chalk.bold('Next steps:'));
  console.log('  1. Review and customize CLAUDE.md');
  console.log('  2. Review .agent-context.json configuration');
  if (withMemory) {
    console.log('  3. Start memory services: agent-context memory start');
  }
  if (withWorktrees) {
    console.log('  4. Create your first worktree: agent-context worktree create <slug>');
  }
  console.log('');
}

async function setupPlatform(
  cwd: string,
  platform: Platform,
  _config: AgentContextConfig
): Promise<void> {
  const platformDirs: Record<Platform, string[]> = {
    claudeCode: ['.claude/agents', '.claude/commands'],
    factory: ['.factory/droids', '.factory/commands', '.factory/skills', '.factory/scripts', '.factory/templates'],
    vscode: ['.vscode'],
    opencode: ['.opencode/agent', '.opencode/command'],
    claudeWeb: [], // Web platforms don't need local directories
    factoryWeb: [],
  };

  const dirs = platformDirs[platform] || [];
  for (const dir of dirs) {
    const fullPath = join(cwd, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }
}
