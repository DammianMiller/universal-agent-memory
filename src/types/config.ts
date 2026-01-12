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

/**
 * NEW: Serverless Qdrant configuration for cost optimization.
 * Supports lazy-start local instance or cloud serverless.
 */
export const QdrantServerlessSchema = z.object({
  enabled: z.boolean().default(false),
  mode: z.enum(['lazy-local', 'cloud-serverless', 'hybrid']).default('lazy-local'),
  // Lazy-local settings
  lazyLocal: z.object({
    dockerImage: z.string().default('qdrant/qdrant:latest'),
    port: z.number().default(6333),
    dataDir: z.string().default('./agents/data/qdrant'),
    autoStart: z.boolean().default(true),
    autoStop: z.boolean().default(true),
    idleTimeoutMs: z.number().default(300000), // 5 minutes
    healthCheckIntervalMs: z.number().default(30000), // 30 seconds
  }).optional(),
  // Cloud serverless settings
  cloudServerless: z.object({
    provider: z.enum(['qdrant-cloud', 'aws-lambda', 'cloudflare-workers']).default('qdrant-cloud'),
    url: z.string().optional(),
    apiKey: z.string().optional(),
    region: z.string().default('us-east-1'),
    // Cold start optimization
    keepWarm: z.boolean().default(false),
    warmIntervalMs: z.number().default(240000), // 4 minutes
  }).optional(),
  // Hybrid mode: use local for dev, cloud for prod
  hybrid: z.object({
    useLocalInDev: z.boolean().default(true),
    useCloudInProd: z.boolean().default(true),
    envDetection: z.enum(['NODE_ENV', 'UAM_ENV', 'auto']).default('auto'),
  }).optional(),
  // Fallback to in-memory if all backends fail
  fallbackToMemory: z.boolean().default(true),
});

export const LongTermMemorySchema = z.object({
  enabled: z.boolean().default(true),
  // Legacy local provider (keep for backward compatibility)
  provider: z.enum(['qdrant', 'chroma', 'pinecone', 'github', 'qdrant-cloud', 'serverless', 'none']).default('qdrant'),
  endpoint: z.string().optional(),
  collection: z.string().default('agent_memory'),
  embeddingModel: z.string().default('all-MiniLM-L6-v2'),
  // New backend-specific configs
  github: GitHubMemoryBackendSchema.optional(),
  qdrantCloud: QdrantCloudBackendSchema.optional(),
  // NEW: Serverless config
  serverless: QdrantServerlessSchema.optional(),
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

/**
 * NEW: Cost optimization settings.
 */
export const CostOptimizationSchema = z.object({
  enabled: z.boolean().default(true),
  // Token budget management
  tokenBudget: z.object({
    maxTemplateTokens: z.number().default(8000),
    maxMemoryQueryTokens: z.number().default(2000),
    maxContextTokens: z.number().default(12000),
    warningThreshold: z.number().default(0.8), // Warn at 80% usage
  }).optional(),
  // Embedding batch optimization
  embeddingBatching: z.object({
    enabled: z.boolean().default(true),
    batchSize: z.number().default(10),
    maxDelayMs: z.number().default(5000),
  }).optional(),
  // LLM call reduction
  llmCallReduction: z.object({
    cacheResponses: z.boolean().default(true),
    cacheTtlMs: z.number().default(3600000), // 1 hour
    deduplicateQueries: z.boolean().default(true),
  }).optional(),
});

/**
 * NEW: Time optimization settings for deployments.
 */
export const TimeOptimizationSchema = z.object({
  enabled: z.boolean().default(true),
  // Dynamic batch windows
  batchWindows: z.object({
    commit: z.number().default(30000),
    push: z.number().default(5000),
    merge: z.number().default(10000),
    workflow: z.number().default(5000),
    deploy: z.number().default(60000),
  }).optional(),
  // Parallel execution
  parallelExecution: z.object({
    enabled: z.boolean().default(true),
    maxParallelDroids: z.number().default(4),
    maxParallelWorkflows: z.number().default(3),
  }).optional(),
  // Pre-warming
  prewarming: z.object({
    enabled: z.boolean().default(false),
    prewarmServices: z.array(z.string()).default(['qdrant']),
  }).optional(),
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
  // NEW: Optimization settings
  costOptimization: CostOptimizationSchema.optional(),
  timeOptimization: TimeOptimizationSchema.optional(),
});

export type AgentContextConfig = z.infer<typeof AgentContextConfigSchema>;
export type Platform = 'claudeCode' | 'factory' | 'vscode' | 'opencode' | 'claudeWeb' | 'factoryWeb';
export type Droid = z.infer<typeof DroidSchema>;
export type Command = z.infer<typeof CommandSchema>;
export type QdrantServerlessConfig = z.infer<typeof QdrantServerlessSchema>;
export type CostOptimizationConfig = z.infer<typeof CostOptimizationSchema>;
export type TimeOptimizationConfig = z.infer<typeof TimeOptimizationSchema>;
