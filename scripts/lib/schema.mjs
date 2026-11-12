/**
 * A small OpenAPI 3.0 schema checker, enough for this contract: $ref, allOf, type, nullable,
 * required, properties, items, enum, minimum/maximum, minLength/maxLength, pattern.
 * Returns a list of human-readable problems ([] means the value matches).
 */
export function validate(spec, schema, value, at = '$') {
  if (schema.$ref) return validate(spec, resolveRef(spec, schema.$ref), value, at);
  if (schema.allOf) return schema.allOf.flatMap((s) => validate(spec, s, value, at));
  if (value === null) return schema.nullable ? [] : [`${at}: null is not allowed`];

  const problems = [];
  const type = schema.type;
  const actual = Array.isArray(value) ? 'array' : typeof value;
  if (type === 'integer') {
    if (!Number.isInteger(value)) return [`${at}: expected integer, got ${JSON.stringify(value)}`];
  } else if (type && type !== actual) {
    return [`${at}: expected ${type}, got ${actual}`];
  }
  if (schema.enum && !schema.enum.includes(value))
    problems.push(`${at}: ${JSON.stringify(value)} is not one of ${schema.enum.join(', ')}`);
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum)
      problems.push(`${at}: below minimum`);
    if (schema.maximum !== undefined && value > schema.maximum)
      problems.push(`${at}: above maximum`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength)
      problems.push(`${at}: too short`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      problems.push(`${at}: too long`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value))
      problems.push(`${at}: does not match ${schema.pattern}`);
  }
  if (actual === 'array' && schema.items)
    value.forEach((item, i) => problems.push(...validate(spec, schema.items, item, `${at}[${i}]`)));
  if (actual === 'object') {
    for (const key of schema.required || [])
      if (!(key in value)) problems.push(`${at}.${key}: required property missing`);
    for (const [key, sub] of Object.entries(schema.properties || {}))
      if (key in value) problems.push(...validate(spec, sub, value[key], `${at}.${key}`));
  }
  return problems;
}

export function resolveRef(spec, ref) {
  return ref
    .replace(/^#\//, '')
    .split('/')
    .reduce((node, key) => node[key], spec);
}

/** Describes a JSON value's shape compactly, e.g. { data: [ { id: string } ], meta: {...} }. */
export function shapeOf(value, depth = 0) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.length ? [shapeOf(value[0], depth + 1)] : [];
  if (typeof value === 'object') {
    if (depth > 3) return 'object';
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shapeOf(v, depth + 1)]));
  }
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}
