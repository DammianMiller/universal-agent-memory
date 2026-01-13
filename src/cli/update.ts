import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';
import { analyzeProject } from '../analyzers/index.js';
import { generateClaudeMd } from '../generators/claude-md.js';
import { mergeClaudeMd, validateMerge } from '../utils/merge-claude-md.js';
import { AgentContextConfigSchema } from '../types/index.js';
import type { AgentContextConfig } from '../types/index.js';

interface UpdateOptions {
  dryRun?: boolean;
}

export async function updateCommand(options: UpdateOptions): Promise<void> {
  const cwd = process.cwd();
  const configPath = join(cwd, '.uam.json');
  const claudeMdPath = join(cwd, 'CLAUDE.md');
  const agentMdPath = join(cwd, 'AGENT.md');

  console.log(chalk.bold('\n🔄 UAM Update - Preserving All Customizations\n'));

  // Check for existing config
  if (!existsSync(configPath)) {
    console.log(chalk.yellow('No .uam.json found. Run `uam init` first.'));
    return;
  }

  // Load config
  let config: AgentContextConfig;
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    config = AgentContextConfigSchema.parse(raw);
  } catch (error) {
    console.error(chalk.red('Invalid .uam.json configuration'));
    console.error(error);
    return;
  }

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

  // Find existing CLAUDE.md or AGENT.md
  let existingPath: string | null = null;
  let existingContent: string | null = null;

  if (existsSync(claudeMdPath)) {
    existingPath = claudeMdPath;
    existingContent = readFileSync(claudeMdPath, 'utf-8');
  } else if (existsSync(agentMdPath)) {
    existingPath = agentMdPath;
    existingContent = readFileSync(agentMdPath, 'utf-8');
  }

  if (!existingContent) {
    console.log(chalk.yellow('No CLAUDE.md or AGENT.md found. Run `uam generate` instead.'));
    return;
  }

  // Create backup before update
  const backupPath = existingPath + '.backup.' + new Date().toISOString().replace(/[:.]/g, '-');
  
  if (options.dryRun) {
    console.log(chalk.dim(`Would create backup at: ${backupPath}`));
  } else {
    copyFileSync(existingPath!, backupPath);
    console.log(chalk.dim(`Created backup: ${backupPath}`));
  }

  // Generate new content from latest template
  const genSpinner = ora('Generating updated content from latest template...').start();
  let newContent: string;
  try {
    newContent = await generateClaudeMd(analysis, config);
    genSpinner.succeed('Generated updated content');
  } catch (error) {
    genSpinner.fail('Failed to generate new content');
    console.error(chalk.red(error));
    return;
  }

  // Merge: New template structure + existing user content
  const mergeSpinner = ora('Merging with existing content (preserving all customizations)...').start();
  let mergedContent: string;
  try {
    mergedContent = mergeClaudeMd(existingContent, newContent);
    mergeSpinner.succeed('Merged content');
  } catch (error) {
    mergeSpinner.fail('Failed to merge content');
    console.error(chalk.red(error));
    return;
  }

  // Validate merge
  const validation = validateMerge(existingContent, mergedContent);
  if (!validation.valid) {
    console.log(chalk.yellow('\n  Merge validation warnings:'));
    for (const warning of validation.warnings) {
      console.log(chalk.dim(`    - ${warning}`));
    }
  }

  // Show diff summary
  const existingLines = existingContent.split('\n').length;
  const newLines = newContent.split('\n').length;
  const mergedLines = mergedContent.split('\n').length;
  
  console.log(chalk.bold('\n📊 Update Summary:\n'));
  console.log(chalk.dim(`  Existing file: ${existingLines} lines`));
  console.log(chalk.dim(`  New template:  ${newLines} lines`));
  console.log(chalk.dim(`  Merged result: ${mergedLines} lines`));

  // Count preserved sections
  const existingSections = (existingContent.match(/^## /gm) || []).length;
  const mergedSections = (mergedContent.match(/^## /gm) || []).length;
  console.log(chalk.dim(`  Sections: ${existingSections} → ${mergedSections}`));

  if (options.dryRun) {
    console.log(chalk.yellow('\n  --dry-run: No changes made\n'));
    
    // Show preview
    console.log(chalk.dim('--- Preview (first 50 lines) ---\n'));
    console.log(mergedContent.split('\n').slice(0, 50).join('\n'));
    console.log(chalk.dim('\n... [truncated] ...'));
    return;
  }

  // Write merged content
  writeFileSync(existingPath!, mergedContent);

  console.log(chalk.green(`\n✅ Updated ${existingPath}\n`));
  console.log('What was preserved:');
  console.log('  • All custom sections');
  console.log('  • URLs, kubectl contexts, workflows');
  console.log('  • Config files, gotchas, lessons');
  console.log('  • Any content not in the standard template');
  console.log('');
  console.log('What was updated:');
  console.log('  • Template structure and formatting');
  console.log('  • Standard sections (decision loop, memory system, etc.)');
  console.log('  • Code Field integration (v8.0)');
  console.log('  • Inhibition-style directives');
  console.log('');
  console.log(chalk.dim(`Backup saved at: ${backupPath}`));
  console.log(chalk.dim('If something looks wrong, restore from backup.'));
}
