import chalk from 'chalk';
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type HooksAction = 'install' | 'status';

interface HooksOptions {
  projectDir?: string;
}

export async function hooksCommand(action: HooksAction, options: HooksOptions = {}): Promise<void> {
  const cwd = options.projectDir || process.cwd();

  switch (action) {
    case 'install':
      await installHooks(cwd);
      break;
    case 'status':
      await showHooksStatus(cwd);
      break;
  }
}

async function installHooks(cwd: string): Promise<void> {
  console.log(chalk.bold('\n  Installing UAM Session Hooks\n'));

  // Resolve template hooks directory
  const templateHooksDir = join(__dirname, '../../templates/hooks');
  if (!existsSync(templateHooksDir)) {
    console.log(chalk.red('  Template hooks not found. Ensure templates/hooks/ exists.'));
    return;
  }

  // Create .claude directory structure
  const claudeDir = join(cwd, '.claude');
  const claudeHooksDir = join(claudeDir, 'hooks');
  if (!existsSync(claudeHooksDir)) {
    mkdirSync(claudeHooksDir, { recursive: true });
    console.log(chalk.dim(`  Created ${claudeHooksDir}`));
  }

  // Copy hook scripts
  const hookFiles = ['session-start.sh', 'pre-compact.sh'];
  for (const file of hookFiles) {
    const src = join(templateHooksDir, file);
    const dest = join(claudeHooksDir, file);
    if (existsSync(src)) {
      copyFileSync(src, dest);
      chmodSync(dest, 0o755);
      console.log(chalk.green(`  + ${file}`));
    } else {
      console.log(chalk.yellow(`  - ${file} (template not found)`));
    }
  }

  // Create or update settings.local.json with hooks config
  const settingsPath = join(claudeDir, 'settings.local.json');
  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch {
      // Start fresh if parse fails
    }
  }

  const hooksConfig = {
    hooks: {
      SessionStart: {
        hooks: [
          {
            type: 'command',
            command: 'bash .claude/hooks/session-start.sh',
          },
        ],
      },
      PreCompact: {
        hooks: [
          {
            type: 'command',
            command: 'bash .claude/hooks/pre-compact.sh',
          },
        ],
      },
    },
  };

  // Merge hooks into existing settings (preserve other keys)
  const existingHooks = (settings.hooks || {}) as Record<string, unknown>;
  settings.hooks = { ...existingHooks, ...hooksConfig.hooks };

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  console.log(chalk.green(`  + settings.local.json (hooks configured)`));

  // Ensure .gitignore includes settings.local.json
  const gitignorePath = join(cwd, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('settings.local.json')) {
      writeFileSync(gitignorePath, gitignore.trimEnd() + '\n.claude/settings.local.json\n');
      console.log(chalk.dim('  Updated .gitignore to exclude settings.local.json'));
    }
  }

  console.log(chalk.bold.green('\n  Hooks installed successfully!'));
  console.log(chalk.dim('  Restart Claude Code or run /hooks to activate.\n'));
}

async function showHooksStatus(cwd: string): Promise<void> {
  console.log(chalk.bold('\n  UAM Hooks Status\n'));

  const claudeHooksDir = join(cwd, '.claude', 'hooks');
  const settingsPath = join(cwd, '.claude', 'settings.local.json');

  const hookFiles = [
    { name: 'session-start.sh', event: 'SessionStart', desc: 'Injects recent memory context' },
    { name: 'pre-compact.sh', event: 'PreCompact', desc: 'Flushes compaction marker to memory' },
  ];

  for (const hook of hookFiles) {
    const path = join(claudeHooksDir, hook.name);
    const exists = existsSync(path);
    const status = exists ? chalk.green('installed') : chalk.red('missing');
    console.log(`  ${status}  ${hook.name} (${hook.event})`);
    console.log(chalk.dim(`          ${hook.desc}`));
  }

  console.log('');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      const hooks = settings.hooks || {};
      const configured = Object.keys(hooks).length;
      console.log(`  ${chalk.green('configured')}  settings.local.json (${configured} hook events)`);
    } catch {
      console.log(`  ${chalk.yellow('invalid')}  settings.local.json (parse error)`);
    }
  } else {
    console.log(`  ${chalk.red('missing')}  settings.local.json`);
  }
  console.log('');
}
