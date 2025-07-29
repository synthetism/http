/**
 * Result Pattern Implementation for HTTP Operations
 * 
 * A simple, functional Result type for handling success and failure states
 * without exceptions. Enhanced with error cause tracking for better debugging.
 * 
 * @version 1.0.0
 * @author SYNET ALPHA
 */

/**
 * Result type representing either success or failure
 */
export class Result<T> {
  private constructor(
    private readonly _value: T | null,
    private readonly _error: string | null,
    private readonly _errorCause?: Error | unknown
  ) {}

  /**
   * Create a successful result
   */
  static success<T>(value: T): Result<T> {
    return new Result(value, null);
  }

  /**
   * Create a failed result
   */
  static fail<T>(error: string, cause?: Error | unknown): Result<T> {
    return new Result<T>(null, error, cause);
  }

  /**
   * Check if the result is successful
   */
  get isSuccess(): boolean {
    return this._error === null;
  }

  /**
   * Check if the result is a failure
   */
  get isFailure(): boolean {
    return this._error !== null;
  }

  /**
   * Get the success value (throws if failure)
   */
  get value(): T {
    if (this._error !== null) {
      throw new Error(`Cannot access value of failed result: ${this._error}`);
    }
    return this._value as T;
  }

  /**
   * Get the error message (throws if success)
   */
  get error(): string {
    if (this._error === null) {
      throw new Error('Cannot access error of successful result');
    }
    return this._error;
  }

  /**
   * Get the error cause (undefined if success or no cause)
   */
  get errorCause(): Error | unknown | undefined {
    return this._errorCause;
  }

  /**
   * Transform the success value if successful
   */
  map<U>(fn: (value: T) => U): Result<U> {
    if (this.isFailure) {
      return Result.fail<U>(this._error || 'Unknown error', this._errorCause);
    }
    try {
      return Result.success(fn(this._value as T));
    } catch (error) {
      return Result.fail<U>(
        `Mapping failed: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Chain operations that return Results
   */
  flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isFailure) {
      return Result.fail<U>(this._error || 'Unknown error', this._errorCause);
    }
    try {
      return fn(this._value as T);
    } catch (error) {
      return Result.fail<U>(
        `FlatMap failed: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Get the value or a default if failed
   */
  getOrElse(defaultValue: T): T {
    return this.isSuccess ? this._value as T : defaultValue;
  }

  /**
   * Execute a function based on success or failure
   */
  match<U>(onSuccess: (value: T) => U, onFailure: (error: string, cause?: Error | unknown) => U): U {
    if (this.isSuccess) {
      return onSuccess(this._value as T);
    }
    return onFailure(this._error as string, this._errorCause);
  }
}
