import { z } from 'zod';

export const PlatformSchema = z.object({
  enabled: z.boolean().default(true),
});

export const ShortTermMemorySchema = z.object({
  enabled: z.boolean().default(true),
  // Desktop: SQLite path
  path: z.string().default('./agents/data/memory/short_term.db'),
  // Web: IndexedDB database name
  webDatabase: z.string().default('agent_context_memory'),
  maxEntries: z.number().default(50),
  // Force desktop mode even if window exists (for testing)
  forceDesktop: z.boolean().default(false),
});

export const GitHubMemoryBackendSchema = z.object({
  enabled: z.boolean().default(false),
  repo: z.string().optional(), // e.g., "owner/repo"
  token: z.string().optional(), // GitHub PAT (can also use GITHUB_TOKEN env var)
  path: z.string().default('.uam/memory'), // Path in repo
  branch: z.string().default('main'),
});

export const QdrantCloudBackendSchema = z.object({
  enabled: z.boolean().default(false),
  url: z.string().optional(), // e.g., "https://xyz.qdrant.io"
  apiKey: z.string().optional(), // Can also use QDRANT_API_KEY env var
  collection: z.string().default('agent_memory'),
});

export const LongTermMemorySchema = z.object({
  enabled: z.boolean().default(true),
  // Legacy local provider (keep for backward compatibility)
  provider: z.enum(['qdrant', 'chroma', 'pinecone', 'github', 'qdrant-cloud', 'none']).default('qdrant'),
  endpoint: z.string().optional(),
  collection: z.string().default('agent_memory'),
  embeddingModel: z.string().default('all-MiniLM-L6-v2'),
  // New backend-specific configs
  github: GitHubMemoryBackendSchema.optional(),
  qdrantCloud: QdrantCloudBackendSchema.optional(),
});

export const MemorySchema = z.object({
  shortTerm: ShortTermMemorySchema.optional(),
  longTerm: LongTermMemorySchema.optional(),
});

export const WorktreeSchema = z.object({
  enabled: z.boolean().default(true),
  directory: z.string().default('.worktrees'),
  branchPrefix: z.string().default('feature/'),
  autoCleanup: z.boolean().default(true),
});

export const DroidSchema = z.object({
  name: z.string(),
  template: z.string().optional(),
  description: z.string().optional(),
  model: z.string().default('inherit'),
  tools: z.union([z.string(), z.array(z.string())]).optional(),
});

export const CommandSchema = z.object({
  name: z.string(),
  template: z.string().optional(),
  description: z.string().optional(),
  argumentHint: z.string().optional(),
});

export const TemplateSectionsSchema = z.object({
  memorySystem: z.boolean().default(true),
  browserUsage: z.boolean().default(true),
  decisionLoop: z.boolean().default(true),
  worktreeWorkflow: z.boolean().default(true),
  troubleshooting: z.boolean().default(true),
  augmentedCapabilities: z.boolean().default(true),
});

export const TemplateSchema = z.object({
  extends: z.string().default('default'),
  sections: TemplateSectionsSchema.optional(),
});

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  defaultBranch: z.string().default('main'),
});

export const AgentContextConfigSchema = z.object({
  $schema: z.string().optional(),
  version: z.string().default('1.0.0'),
  project: ProjectSchema,
  platforms: z
    .object({
      claudeCode: PlatformSchema.optional(),
      factory: PlatformSchema.optional(),
      vscode: PlatformSchema.optional(),
      opencode: PlatformSchema.optional(),
    })
    .optional(),
  memory: MemorySchema.optional(),
  worktrees: WorktreeSchema.optional(),
  droids: z.array(DroidSchema).optional(),
  commands: z.array(CommandSchema).optional(),
  template: TemplateSchema.optional(),
});

export type AgentContextConfig = z.infer<typeof AgentContextConfigSchema>;
export type Platform = 'claudeCode' | 'factory' | 'vscode' | 'opencode' | 'claudeWeb' | 'factoryWeb';
export type Droid = z.infer<typeof DroidSchema>;
export type Command = z.infer<typeof CommandSchema>;
