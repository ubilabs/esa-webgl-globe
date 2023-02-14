export function assertNotNull<TValue>(
  value: TValue,
  message: string = 'assertion failed'
): asserts value is NonNullable<TValue> {
  if (value === null || value === undefined) {
    throw Error(message);
  }
}
