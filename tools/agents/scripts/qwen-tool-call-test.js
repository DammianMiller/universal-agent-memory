#!/usr/bin/env node
/**
 * Qwen3.5 Tool Call Test - Node.js Wrapper
 * 
 * This wrapper script allows the Python CLI to be executed
 * reliably across all platforms and installation methods.
 */

'use strict';

const { execFileSync } = await import('child_process');
const path = await import('path');
const os = await import('os');

// Determine Python executable based on platform
const getPythonExecutable = () => {
  if (os.platform === 'win32') {
    return 'python';
  }
  // Try python3 first, then fall back to python
  try {
    execFileSync('python3', ['--version'], { stdio: 'ignore' });
    return 'python3';
  } catch (e) {
    return 'python';
  }
};

// Get the directory where this script is located
const scriptDir = path.default.dirname(new URL(import.meta.url).pathname);

// Build the path to the Python script
const pythonScript = path.default.join(scriptDir, 'qwen_tool_call_test.py');

// Get command line arguments (skip first two: node, script path)
const args = process.argv.slice(2);

try {
  // Execute the Python script with all arguments passed through
  execFileSync(getPythonExecutable(), [pythonScript, ...args], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  // Exit with the same code as the Python script
  process.exit(error.status || 1);
}
