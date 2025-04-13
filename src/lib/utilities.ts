
/**
 * Retrieves the value of a nested property from a JSON object based on a dot-separated key path.
 * Converts the retrieved value into the specified return type (number, string, or boolean).
 *
 * @param {Record<string, unknown>} obj - The source object containing nested key-value pairs.
 * @param {string} key - Dot-separated path to the desired property (e.g., 'temperature.tC').
 * @param {'number' | 'string' | 'boolean'} returnType - The type to convert the retrieved value into.
 * @returns {number | string | boolean | null} - The converted value or null if the property doesn't exist.
 *
 * Example usage:
 * const value = getNestedValue(data, 'temperature.tC', 'number'); // Returns 47.1
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  key: string,
  returnType: 'number' | 'string' | 'boolean',
): number | string | boolean | null {
  const keys = key.split('.');
  let value: unknown = obj;

  for (const part of keys) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return null; // Return null if any part of the key is missing
    }
  }

  if (value === null || value === undefined) {
    return null;
  }

  switch (returnType) {
  case 'number':
    return Number(value);
  case 'string':
    return String(value);
  case 'boolean':
    return Boolean(value);
  default:
    throw new Error(`Invalid return type: ${returnType}`);
  }
}
