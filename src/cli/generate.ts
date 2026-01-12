import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { analyzeProject } from '../analyzers/index.js';
import { generateClaudeMd } from '../generators/claude-md.js';
import { AgentContextConfigSchema } from '../types/index.js';
import { mergeClaudeMd, validateMerge } from '../utils/merge-claude-md.js';
import type { AgentContextConfig, Platform } from '../types/index.js';

interface GenerateOptions {
  force?: boolean;
  dryRun?: boolean;
  platform?: string;
  web?: boolean;
}

interface DependencyStatus {
  git: boolean;
  docker: boolean;
  node: boolean;
  qdrant: boolean;
}

function checkDependencies(): DependencyStatus {
  const status: DependencyStatus = {
    git: false,
    docker: false,
    node: true, // We're running, so Node exists
    qdrant: false,
  };

  try {
    execSync('git --version', { stdio: 'pipe' });
    status.git = true;
  } catch {
    // git not found
  }

  try {
    execSync('docker --version', { stdio: 'pipe' });
    status.docker = true;
    
    // Check if Qdrant container is running
    try {
      const output = execSync('docker ps --filter "name=qdrant" --format "{{.Names}}"', { stdio: 'pipe' }).toString();
      status.qdrant = output.includes('qdrant');
    } catch {
      // docker ps failed
    }
  } catch {
    // docker not found
  }

  return status;
}

// Print dependency status - used when verbose flag is enabled
export function printDependencyHelp(deps: DependencyStatus): void {
  console.log(chalk.bold('\n📦 Dependency Status:\n'));
  
  console.log(`  ${deps.git ? '✅' : '❌'} Git: ${deps.git ? 'Available' : 'Not found'}`);
  if (!deps.git) {
    console.log(chalk.dim('     Install: https://git-scm.com/downloads'));
  }
  
  console.log(`  ${deps.docker ? '✅' : '⚠️ '} Docker: ${deps.docker ? 'Available' : 'Not found (optional)'}`);
  if (!deps.docker) {
    console.log(chalk.dim('     Install for semantic memory: https://docs.docker.com/get-docker/'));
  }
  
  console.log(`  ${deps.qdrant ? '✅' : '⚠️ '} Qdrant: ${deps.qdrant ? 'Running' : 'Not running (optional)'}`);
  if (deps.docker && !deps.qdrant) {
    console.log(chalk.dim('     Start with: uam memory start'));
  } else if (!deps.docker) {
    console.log(chalk.dim('     Requires Docker - UAM works without it (no semantic memory)'));
  }
  
  console.log('');
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  const cwd = process.cwd();
  const configPath = join(cwd, '.uam.json');

  // Check dependencies
  const deps = checkDependencies();
  
  if (!deps.git) {
    console.error(chalk.red('\n❌ Git is required but not found.'));
    console.log(chalk.dim('  Install Git: https://git-scm.com/downloads\n'));
    process.exit(1);
  }

  console.log(chalk.bold('\n📝 Generate Agent Context Files\n'));

  // Load config if exists
  let config: AgentContextConfig;
  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
      config = AgentContextConfigSchema.parse(raw);
      console.log(chalk.dim(`Using config from .uam.json`));
    } catch (error) {
      console.error(chalk.red('Invalid .uam.json configuration'));
      console.error(error);
      return;
    }
  } else {
    console.log(chalk.yellow('No .uam.json found. Run `uam init` first, or generating with defaults.'));
    config = {
      version: '1.0.0',
      project: {
        name: 'Unknown Project',
        defaultBranch: 'main',
      },
      template: {
        extends: 'default',
      },
    };
  }

  // Analyze project
  const spinner = ora('Analyzing project...').start();
  let analysis;
  try {
    analysis = await analyzeProject(cwd);
    spinner.succeed(`Analyzed: ${analysis.projectName}`);
  } catch (error) {
    spinner.fail('Failed to analyze project');
    console.error(chalk.red(error));
    return;
  }

  // Determine target file based on --web flag
  const isWebPlatform = options.web === true;
  const claudeMdPath = join(cwd, 'CLAUDE.md');
  const agentMdPath = join(cwd, 'AGENT.md');
  const claudeMdExists = existsSync(claudeMdPath);
  const agentMdExists = existsSync(agentMdPath);
  
  let existingContent: string | undefined;
  // Use AGENT.md when --web flag is passed, CLAUDE.md otherwise
  let targetPath = isWebPlatform ? agentMdPath : claudeMdPath;
  let targetFileName = isWebPlatform ? 'AGENT.md' : 'CLAUDE.md';
  
  // Check if target file or alternate file exists
  const targetExists = existsSync(targetPath);
  const alternateExists = isWebPlatform ? claudeMdExists : agentMdExists;
  
  if ((targetExists || alternateExists) && !options.force && !options.dryRun) {
    // Read existing content from target or alternate file
    if (targetExists) {
      existingContent = readFileSync(targetPath, 'utf-8');
    } else if (alternateExists) {
      // Read from alternate file but will write to target
      const alternatePath = isWebPlatform ? claudeMdPath : agentMdPath;
      existingContent = readFileSync(alternatePath, 'utf-8');
      console.log(chalk.dim(`Migrating ${isWebPlatform ? 'CLAUDE.md' : 'AGENT.md'} to ${targetFileName}`));
    }
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: `${targetFileName} ${targetExists ? 'already exists' : 'will be created'}. What would you like to do?`,
        choices: [
          { name: 'Merge with existing content (recommended)', value: 'merge' },
          { name: 'Overwrite completely', value: 'overwrite' },
          { name: 'Cancel', value: 'cancel' },
        ],
        default: 'merge',
      },
    ]);
    
    if (action === 'cancel') {
      console.log(chalk.yellow('Generation cancelled.'));
      return;
    }
    
    if (action === 'overwrite') {
      existingContent = undefined;
    }
  }

  // Override config based on --web flag
  // Web mode: set webDatabase to trigger web platform detection
  // Desktop mode (default): force desktop even if config has webDatabase
  const effectiveConfig: AgentContextConfig = isWebPlatform
    ? {
        ...config,
        memory: {
          ...config.memory,
          shortTerm: {
            enabled: config.memory?.shortTerm?.enabled ?? true,
            path: config.memory?.shortTerm?.path ?? './agents/data/memory/short_term.db',
            webDatabase: 'agentContext',
            maxEntries: config.memory?.shortTerm?.maxEntries ?? 50,
            forceDesktop: false,
          },
        },
      }
    : {
        // Desktop mode: ensure forceDesktop is true to override any webDatabase in config
        ...config,
        memory: {
          ...config.memory,
          shortTerm: config.memory?.shortTerm
            ? {
                ...config.memory.shortTerm,
                forceDesktop: true, // Force desktop mode regardless of config
              }
            : undefined,
        },
      };

  const genSpinner = ora(`${existingContent ? 'Merging' : 'Generating'} ${targetFileName}...`).start();
  try {
    const newClaudeMd = await generateClaudeMd(analysis, effectiveConfig);
    const claudeMd = existingContent ? mergeClaudeMd(existingContent, newClaudeMd) : newClaudeMd;

    // Validate merge if we merged existing content
    if (existingContent) {
      const validation = validateMerge(existingContent, claudeMd);
      if (!validation.valid) {
        genSpinner.warn(`Merged with warnings`);
        console.log(chalk.yellow('\n  Merge validation warnings:'));
        for (const warning of validation.warnings) {
          console.log(chalk.dim(`    - ${warning}`));
        }
        console.log('');
      }
    }

    if (options.dryRun) {
      genSpinner.succeed(`${existingContent ? 'Merged' : 'Generated'} (dry run)`);
      console.log(chalk.dim(`\n--- ${targetFileName} Preview ---\n`));
      console.log(claudeMd.substring(0, 2000) + '\n...\n');
      console.log(chalk.dim(`Total: ${claudeMd.length} characters, ${claudeMd.split('\n').length} lines`));
    } else {
      writeFileSync(targetPath, claudeMd);
      genSpinner.succeed(`${existingContent ? 'Merged and updated' : 'Generated'} ${targetFileName}`);
      if (existingContent) {
        console.log(chalk.dim('  Preserved custom sections and extracted valuable content from existing file'));
      }
    }
  } catch (error) {
    genSpinner.fail(`Failed to ${existingContent ? 'merge' : 'generate'} ${targetFileName}`);
    console.error(chalk.red(error));
    return;
  }

  // Generate platform-specific files if requested
  if (options.platform || !options.dryRun) {
    const platforms = options.platform
      ? [options.platform as Platform]
      : Object.entries(config.platforms || {})
          .filter(([_, v]) => v?.enabled)
          .map(([k]) => k as Platform);

    for (const platform of platforms) {
      const platformSpinner = ora(`Generating ${platform} files...`).start();
      try {
        await generatePlatformFiles(cwd, platform, analysis, config, options.dryRun);
        platformSpinner.succeed(`Generated ${platform} files`);
      } catch (error) {
        platformSpinner.fail(`Failed to generate ${platform} files`);
        console.error(chalk.red(error));
      }
    }
  }

  if (!options.dryRun) {
    console.log(chalk.green('\n✅ Generation complete!\n'));
    
    // Print helpful next steps
    console.log(chalk.bold('Next Steps:\n'));
    console.log('  1. Your AI assistant will now read CLAUDE.md automatically');
    console.log('  2. The AI handles memory, tasks, and workflows autonomously');
    console.log('  3. Just talk to your AI naturally - it follows the CLAUDE.md instructions\n');
    
    // Show optional enhancements
    if (!deps.docker || !deps.qdrant) {
      console.log(chalk.dim('Optional: For persistent semantic memory across sessions:'));
      if (!deps.docker) {
        console.log(chalk.dim('  - Install Docker: https://docs.docker.com/get-docker/'));
      }
      if (deps.docker && !deps.qdrant) {
        console.log(chalk.dim('  - Start Qdrant: uam memory start'));
      }
      console.log('');
    }
  }
}

async function generatePlatformFiles(
  _cwd: string,
  platform: Platform,
  _analysis: Awaited<ReturnType<typeof analyzeProject>>,
  _config: AgentContextConfig,
  dryRun?: boolean
): Promise<void> {
  // Platform-specific generation logic
  switch (platform) {
    case 'claudeCode':
      // Generate .claude/ structure
      if (!dryRun) {
        // TODO: Generate Claude Code specific files
      }
      break;
    case 'factory':
      // Generate .factory/ structure
      if (!dryRun) {
        // TODO: Generate Factory specific files
      }
      break;
    case 'vscode':
      // Generate .vscode/ settings
      if (!dryRun) {
        // TODO: Generate VSCode specific files
      }
      break;
    case 'opencode':
      // Generate opencode.json
      if (!dryRun) {
        // TODO: Generate OpenCode specific files
      }
      break;
  }
}
