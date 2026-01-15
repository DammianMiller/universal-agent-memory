import { z } from 'zod';

/**
 * Custom error class for application-level errors with detailed context.
 * Extends the built-in Error class to provide additional metadata.
 */
export class AppError extends Error {
  /** Error code for programmatic handling */
  readonly code: string;
  /** Additional context about the error */
  readonly context?: Record<string, unknown>;

  /**
   * Creates a new AppError instance.
   *
   * @param message - Human-readable error message
   * @param code - Error code for programmatic handling
   * @param context - Optional additional context
   */
  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Zod schema for validating that a value is valid JSON.
 * Accepts any valid JSON value (object, array, string, number, boolean, null).
 */
const jsonSchema = z.unknown();

/**
 * Validates that a string is valid JSON and parses it.
 *
 * Uses zod for runtime validation to ensure the input is a valid string
 * before attempting to parse. The parsed result is then validated
 * against a permissive schema that accepts any valid JSON value.
 *
 * @param input - The string to validate and parse as JSON
 * @returns The parsed JSON value (object, array, string, number, boolean, or null)
 * @throws AppError with code 'INVALID_INPUT' if input is not a string
 * @throws AppError with code 'JSON_PARSE_ERROR' if the string is not valid JSON
 */
export async function validateAndParseJSON(input: string): Promise<unknown> {
  // Validate input is a string using zod
  const stringSchema = z.string({
    required_error: 'Input is required',
    invalid_type_error: 'Input must be a string',
  });

  const validationResult = stringSchema.safeParse(input);

  if (!validationResult.success) {
    throw new AppError(
      'Input must be a valid string',
      'INVALID_INPUT',
      {
        errors: validationResult.error.errors,
        receivedType: typeof input,
      }
    );
  }

  // Attempt to parse the JSON string
  let parsed: unknown;
  try {
    parsed = JSON.parse(validationResult.data);
  } catch (error) {
    throw new AppError(
      `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'JSON_PARSE_ERROR',
      {
        input: input.length > 100 ? `${input.substring(0, 100)}...` : input,
        originalError: error instanceof Error ? error.message : String(error),
      }
    );
  }

  // Validate the parsed result with zod (accepts any valid JSON value)
  const parseResult = jsonSchema.safeParse(parsed);

  if (!parseResult.success) {
    throw new AppError(
      'Parsed value failed schema validation',
      'SCHEMA_VALIDATION_ERROR',
      {
        errors: parseResult.error.errors,
      }
    );
  }

  return parseResult.data;
}
