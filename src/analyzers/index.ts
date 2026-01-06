import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';
import type { ProjectAnalysis } from '../types/index.js';

export async function analyzeProject(cwd: string): Promise<ProjectAnalysis> {
  const analysis: ProjectAnalysis = {
    projectName: basename(cwd),
    description: '',
    defaultBranch: 'main',
    languages: [],
    frameworks: [],
    packageManagers: [],
    directories: {
      source: [],
      tests: [],
      infrastructure: [],
      docs: [],
      workflows: [],
    },
    urls: [],
    components: [],
    commands: {},
    databases: [],
    infrastructure: {
      cloud: [],
    },
    existingDroids: [],
    existingSkills: [],
    existingCommands: [],
    troubleshootingHints: [],
    keyFiles: [],
    securityNotes: [],
  };

  // Detect git info
  try {
    analysis.defaultBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
    }).trim();
  } catch {
    // Not a git repo or git not available
  }

  // Analyze package files
  await analyzePackageFiles(cwd, analysis);

  // Analyze directory structure
  analyzeDirectoryStructure(cwd, analysis);

  // Analyze CI/CD
  analyzeCiCd(cwd, analysis);

  // Analyze existing droids/agents
  analyzeExistingAgents(cwd, analysis);

  // Analyze README for description and URLs
  analyzeReadme(cwd, analysis);

  // Detect databases
  detectDatabases(cwd, analysis);

  // Detect infrastructure
  detectInfrastructure(cwd, analysis);

  // Detect MCP plugins
  detectMcpPlugins(cwd, analysis);

  // Detect key configuration files
  detectKeyConfigFiles(cwd, analysis);

  return analysis;
}

async function analyzePackageFiles(cwd: string, analysis: ProjectAnalysis): Promise<void> {
  // package.json (Node.js)
  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      analysis.projectName = pkg.name || analysis.projectName;
      analysis.description = pkg.description || '';
      analysis.packageManagers.push('npm');
      analysis.languages.push('JavaScript');

      // Detect TypeScript
      if (pkg.devDependencies?.typescript || existsSync(join(cwd, 'tsconfig.json'))) {
        analysis.languages.push('TypeScript');
      }

      // Detect frameworks
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.react) analysis.frameworks.push('React');
      if (deps.next) analysis.frameworks.push('Next.js');
      if (deps.vue) analysis.frameworks.push('Vue');
      if (deps.express) analysis.frameworks.push('Express');
      if (deps.fastify) analysis.frameworks.push('Fastify');
      if (deps.nest) analysis.frameworks.push('NestJS');

      // Extract commands
      if (pkg.scripts) {
        if (pkg.scripts.test) analysis.commands.test = `npm test`;
        if (pkg.scripts.lint) analysis.commands.lint = `npm run lint`;
        if (pkg.scripts.build) analysis.commands.build = `npm run build`;
        if (pkg.scripts.dev) analysis.commands.dev = `npm run dev`;
      }
    } catch {
      // Invalid package.json
    }
  }

  // pyproject.toml (Python)
  const pyprojectPath = join(cwd, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    analysis.languages.push('Python');
    analysis.packageManagers.push('pip');

    const content = readFileSync(pyprojectPath, 'utf-8');
    if (content.includes('fastapi')) analysis.frameworks.push('FastAPI');
    if (content.includes('django')) analysis.frameworks.push('Django');
    if (content.includes('flask')) analysis.frameworks.push('Flask');

    analysis.commands.test = analysis.commands.test || 'pytest';
  }

  // requirements.txt
  if (existsSync(join(cwd, 'requirements.txt'))) {
    if (!analysis.languages.includes('Python')) {
      analysis.languages.push('Python');
    }
    if (!analysis.packageManagers.includes('pip')) {
      analysis.packageManagers.push('pip');
    }
  }

  // Cargo.toml (Rust)
  if (existsSync(join(cwd, 'Cargo.toml'))) {
    analysis.languages.push('Rust');
    analysis.packageManagers.push('cargo');
  }

  // go.mod (Go)
  if (existsSync(join(cwd, 'go.mod'))) {
    analysis.languages.push('Go');
    analysis.packageManagers.push('go mod');
  }

  // CMakeLists.txt (C/C++)
  if (existsSync(join(cwd, 'CMakeLists.txt'))) {
    analysis.languages.push('C++');
    analysis.packageManagers.push('cmake');
  }

  // pom.xml (Java/Maven)
  if (existsSync(join(cwd, 'pom.xml'))) {
    analysis.languages.push('Java');
    analysis.packageManagers.push('maven');
  }
}

function analyzeDirectoryStructure(cwd: string, analysis: ProjectAnalysis): void {
  const sourceDirs = ['src', 'lib', 'app', 'packages', 'platform', 'services'];
  const testDirs = ['tests', 'test', '__tests__', 'spec'];
  const infraDirs = ['infra', 'terraform', 'infrastructure', 'deploy', 'k8s', 'kubernetes'];
  const docDirs = ['docs', 'documentation', 'doc'];

  for (const dir of sourceDirs) {
    if (existsSync(join(cwd, dir))) {
      analysis.directories.source.push(dir);
    }
  }

  for (const dir of testDirs) {
    if (existsSync(join(cwd, dir))) {
      analysis.directories.tests.push(dir);
    }
  }

  for (const dir of infraDirs) {
    if (existsSync(join(cwd, dir))) {
      analysis.directories.infrastructure.push(dir);
    }
  }

  for (const dir of docDirs) {
    if (existsSync(join(cwd, dir))) {
      analysis.directories.docs.push(dir);
    }
  }

  // Check for UI directories
  if (existsSync(join(cwd, 'ui'))) {
    const uiPath = join(cwd, 'ui');
    try {
      const subdirs = readdirSync(uiPath).filter((f) =>
        statSync(join(uiPath, f)).isDirectory()
      );
      for (const subdir of subdirs) {
        analysis.components.push({
          name: `UI - ${subdir}`,
          path: `ui/${subdir}`,
          language: 'JavaScript',
          description: `Frontend component: ${subdir}`,
        });
      }
    } catch {
      // Can't read ui directory
    }
  }
}

function analyzeCiCd(cwd: string, analysis: ProjectAnalysis): void {
  // GitHub Actions
  const ghWorkflowsPath = join(cwd, '.github/workflows');
  if (existsSync(ghWorkflowsPath)) {
    analysis.directories.workflows.push('.github/workflows');

    try {
      const workflows = readdirSync(ghWorkflowsPath).filter(
        (f) => f.endsWith('.yml') || f.endsWith('.yaml')
      );

      analysis.ciCd = {
        platform: 'GitHub Actions',
        workflows: workflows.map((f) => ({
          file: f,
          purpose: inferWorkflowPurpose(f),
        })),
      };
    } catch {
      // Can't read workflows
    }
  }

  // GitLab CI
  if (existsSync(join(cwd, '.gitlab-ci.yml'))) {
    analysis.ciCd = {
      platform: 'GitLab CI',
      workflows: [{ file: '.gitlab-ci.yml', purpose: 'CI/CD pipeline' }],
    };
  }
}

function inferWorkflowPurpose(filename: string): string {
  const name = filename.toLowerCase();
  if (name.includes('test')) return 'Testing';
  if (name.includes('lint')) return 'Linting';
  if (name.includes('build')) return 'Build';
  if (name.includes('deploy') || name.includes('cd')) return 'Deployment';
  if (name.includes('security')) return 'Security scanning';
  if (name.includes('release')) return 'Release automation';
  if (name.includes('ci')) return 'Continuous Integration';
  return 'Workflow';
}

function analyzeExistingAgents(cwd: string, analysis: ProjectAnalysis): void {
  // Factory droids
  const factoryDroidsPath = join(cwd, '.factory/droids');
  if (existsSync(factoryDroidsPath)) {
    try {
      const droids = readdirSync(factoryDroidsPath)
        .filter((f) => f.endsWith('.md'))
        .map((f) => basename(f, '.md'));
      analysis.existingDroids.push(...droids);
    } catch {
      // Can't read droids
    }
  }

  // Factory skills
  const factorySkillsPath = join(cwd, '.factory/skills');
  if (existsSync(factorySkillsPath)) {
    try {
      const skills = readdirSync(factorySkillsPath)
        .filter((f) => statSync(join(factorySkillsPath, f)).isDirectory())
        .map((f) => f);
      analysis.existingSkills.push(...skills);
    } catch {
      // Can't read skills
    }
  }

  // Factory commands
  const factoryCommandsPath = join(cwd, '.factory/commands');
  if (existsSync(factoryCommandsPath)) {
    try {
      const commands = readdirSync(factoryCommandsPath)
        .filter((f) => f.endsWith('.md'))
        .map((f) => basename(f, '.md'));
      analysis.existingCommands.push(...commands);
    } catch {
      // Can't read commands
    }
  }

  // Claude Code agents
  const claudeAgentsPath = join(cwd, '.claude/agents');
  if (existsSync(claudeAgentsPath)) {
    try {
      const agents = readdirSync(claudeAgentsPath)
        .filter((f) => f.endsWith('.md'))
        .map((f) => basename(f, '.md'));
      analysis.existingDroids.push(...agents);
    } catch {
      // Can't read agents
    }
  }
}

function analyzeReadme(cwd: string, analysis: ProjectAnalysis): void {
  const readmePaths = ['README.md', 'readme.md', 'Readme.md'];

  for (const readmePath of readmePaths) {
    const fullPath = join(cwd, readmePath);
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath, 'utf-8');

        // Extract first paragraph as description
        const firstParagraph = content.split('\n\n')[1]?.trim();
        if (firstParagraph && !analysis.description) {
          analysis.description = firstParagraph.substring(0, 200);
        }

        // Extract URLs
        const urlRegex = /https?:\/\/[^\s\)]+/g;
        const urls = content.match(urlRegex) || [];
        for (const url of urls.slice(0, 5)) {
          // Limit to first 5 URLs
          if (url.includes('github.com')) continue; // Skip GitHub links
          analysis.urls.push({
            name: 'URL',
            value: url,
          });
        }

        analysis.keyFiles.push({
          file: readmePath,
          purpose: 'Project documentation',
        });
      } catch {
        // Can't read README
      }
      break;
    }
  }
}

function detectDatabases(cwd: string, analysis: ProjectAnalysis): void {
  // Check for database-related files
  if (existsSync(join(cwd, 'docker-compose.yml'))) {
    try {
      const content = readFileSync(join(cwd, 'docker-compose.yml'), 'utf-8');
      if (content.includes('postgres')) {
        analysis.databases.push({ type: 'PostgreSQL', purpose: 'Database' });
      }
      if (content.includes('mysql')) {
        analysis.databases.push({ type: 'MySQL', purpose: 'Database' });
      }
      if (content.includes('mongo')) {
        analysis.databases.push({ type: 'MongoDB', purpose: 'Database' });
      }
      if (content.includes('redis')) {
        analysis.databases.push({ type: 'Redis', purpose: 'Cache' });
      }
      if (content.includes('qdrant')) {
        analysis.databases.push({ type: 'Qdrant', purpose: 'Vector database' });
      }
    } catch {
      // Can't read docker-compose
    }
  }

  // Check for SQLite
  if (existsSync(join(cwd, 'agents/data/memory/short_term.db'))) {
    analysis.databases.push({ type: 'SQLite', purpose: 'Agent memory' });
  }
}

function detectInfrastructure(cwd: string, analysis: ProjectAnalysis): void {
  // Terraform
  const terraformPath = join(cwd, 'infra/terraform');
  if (existsSync(terraformPath) || existsSync(join(cwd, 'terraform'))) {
    analysis.infrastructure.iac = 'Terraform';
  }

  // Kubernetes
  if (existsSync(join(cwd, 'k8s')) || existsSync(join(cwd, 'kubernetes'))) {
    analysis.infrastructure.containerOrchestration = 'Kubernetes';
  }

  // Docker
  if (existsSync(join(cwd, 'Dockerfile')) || existsSync(join(cwd, 'docker-compose.yml'))) {
    if (!analysis.infrastructure.containerOrchestration) {
      analysis.infrastructure.containerOrchestration = 'Docker';
    }
  }
}

function detectMcpPlugins(cwd: string, analysis: ProjectAnalysis): void {
  const mcpPath = join(cwd, '.mcp.json');
  if (!existsSync(mcpPath)) return;

  try {
    const mcp = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    const plugins = mcp.mcpServers || mcp.plugins || {};

    analysis.mcpPlugins = [];
    for (const [name, config] of Object.entries(plugins)) {
      const cfg = config as Record<string, unknown>;
      analysis.mcpPlugins.push({
        name,
        purpose: (cfg.description as string) || (cfg.purpose as string) || 'MCP plugin',
      });
    }
  } catch {
    // Can't read or parse .mcp.json
  }
}

function detectKeyConfigFiles(cwd: string, analysis: ProjectAnalysis): void {
  // Common configuration files to detect
  const configFiles = [
    { file: '.uam.json', purpose: 'UAM agent memory configuration' },
    { file: 'package.json', purpose: 'Node.js project configuration' },
    { file: 'tsconfig.json', purpose: 'TypeScript configuration' },
    { file: '.mcp.json', purpose: 'MCP plugins configuration' },
    { file: 'docker-compose.yml', purpose: 'Docker Compose services' },
    { file: 'Dockerfile', purpose: 'Container build definition' },
    { file: '.env.example', purpose: 'Environment variable template' },
    { file: '.gitignore', purpose: 'Git ignore patterns' },
    { file: 'pyproject.toml', purpose: 'Python project configuration' },
    { file: 'Cargo.toml', purpose: 'Rust project configuration' },
    { file: 'go.mod', purpose: 'Go module definition' },
    { file: 'pom.xml', purpose: 'Maven project configuration' },
    { file: '.eslintrc.json', purpose: 'ESLint configuration' },
    { file: '.eslintrc.js', purpose: 'ESLint configuration' },
    { file: '.prettierrc', purpose: 'Prettier configuration' },
    { file: 'vitest.config.ts', purpose: 'Vitest test configuration' },
    { file: 'jest.config.js', purpose: 'Jest test configuration' },
    { file: 'vite.config.ts', purpose: 'Vite build configuration' },
    { file: 'webpack.config.js', purpose: 'Webpack build configuration' },
  ];

  for (const cfg of configFiles) {
    if (existsSync(join(cwd, cfg.file))) {
      // Check if not already added
      if (!analysis.keyFiles.some(kf => kf.file === cfg.file)) {
        analysis.keyFiles.push(cfg);
      }
    }
  }

  // Detect infrastructure-specific config files
  if (analysis.infrastructure.iac === 'Terraform') {
    const terraformConfigs = [
      { file: 'main.tf', purpose: 'Terraform main configuration' },
      { file: 'variables.tf', purpose: 'Terraform variables' },
      { file: 'outputs.tf', purpose: 'Terraform outputs' },
      { file: 'production.tfvars', purpose: 'Production environment variables' },
    ];
    
    const infraPath = analysis.directories.infrastructure[0] || 'infra/terraform';
    for (const cfg of terraformConfigs) {
      const fullPath = join(cwd, infraPath, cfg.file);
      if (existsSync(fullPath)) {
        analysis.keyFiles.push({
          file: `${infraPath}/${cfg.file}`,
          purpose: cfg.purpose,
        });
      }
    }
  }
}
