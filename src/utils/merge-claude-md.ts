/**
 * Merges existing CLAUDE.md/AGENT.md content with newly generated content
 * Preserves custom sections and user modifications while updating standard sections
 */

interface Section {
  title: string;
  content: string;
  startLine: number;
  endLine: number;
}

/**
 * Parse markdown content into sections
 */
function parseSections(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = line.match(/^##\s+(.+)$/);

    if (heading) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        currentSection.endLine = i - 1;
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        title: heading[1].trim(),
        content: '',
        startLine: i,
        endLine: i,
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    currentSection.endLine = lines.length - 1;
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract preamble (content before first ## heading)
 */
function extractPreamble(content: string): string {
  const lines = content.split('\n');
  const preamble: string[] = [];

  for (const line of lines) {
    if (line.match(/^##\s+/)) {
      break;
    }
    preamble.push(line);
  }

  return preamble.join('\n').trim();
}

/**
 * Standard sections that should be updated from the generated content
 */
const STANDARD_SECTIONS = new Set([
  'MANDATORY RULES',
  'MEMORY SYSTEM',
  'BROWSER USAGE',
  'DECISION LOOP',
  'SKILLS',
  'MANDATORY WORKFLOW REQUIREMENTS',
  'GIT WORKTREE WORKFLOW',
  'GIT BRANCH WORKFLOW',
  'Quick Reference',
  'Essential Commands',
  'Core Components',
  'Architecture',
  'Data Layer',
  'Databases',
  'Authentication',
  'CI/CD',
  'Troubleshooting',
  'Required Workflow',
  'Augmented Agent Capabilities',
  'Completion Checklist',
]);

/**
 * Check if a section title matches a standard section (case-insensitive, partial match)
 */
function isStandardSection(title: string): boolean {
  const normalizedTitle = title.toUpperCase().trim();
  for (const stdSection of STANDARD_SECTIONS) {
    if (normalizedTitle.includes(stdSection.toUpperCase()) || stdSection.toUpperCase().includes(normalizedTitle)) {
      return true;
    }
  }
  return false;
}

/**
 * Merge existing CLAUDE.md content with newly generated content
 * 
 * Strategy:
 * - Update the preamble from new content (project name, description)
 * - Replace standard sections with new versions
 * - Preserve custom sections from existing content
 * - Maintain section order from new content where possible
 */
export function mergeClaudeMd(existingContent: string, newContent: string): string {
  const existingSections = parseSections(existingContent);
  const newSections = parseSections(newContent);
  const newPreamble = extractPreamble(newContent);

  // Map existing custom sections by normalized title
  const customSections = new Map<string, Section>();
  for (const section of existingSections) {
    if (!isStandardSection(section.title)) {
      customSections.set(section.title.toLowerCase().trim(), section);
    }
  }

  // Build merged content
  const merged: string[] = [];
  
  // Use new preamble
  merged.push(newPreamble);
  merged.push('');

  // Track which custom sections we've included
  const includedCustomSections = new Set<string>();

  // Process new sections in order
  for (const newSection of newSections) {
    merged.push(`## ${newSection.title}`);
    merged.push('');
    merged.push(newSection.content);
    merged.push('');
    merged.push('---');
    merged.push('');
  }

  // Append remaining custom sections at the end
  for (const [customTitle, customSection] of customSections.entries()) {
    if (!includedCustomSections.has(customTitle)) {
      merged.push(`## ${customSection.title}`);
      merged.push('');
      merged.push(customSection.content);
      merged.push('');
      merged.push('---');
      merged.push('');
    }
  }

  // Clean up: remove trailing separators and normalize spacing
  let result = merged.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  result = result.replace(/---\n*$/, ''); // Remove trailing separator
  result = result.trim();

  return result;
}
