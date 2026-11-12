/**
 * Checks that every request the site sends to /api matches api/openapi.json: the path matches a
 * documented path template, the method is documented for it, every query parameter is declared and
 * its value fits the schema, every X-* header is declared, and path parameters fit their schema.
 * Used by tests/e2e/run.mjs on all requests made during all journeys.
 */
import { readFileSync } from 'node:fs';

const spec = JSON.parse(readFileSync(new URL('../../api/openapi.json', import.meta.url), 'utf8'));

/** Follow a $ref inside the spec. */
function resolve(node) {
  return node && node.$ref
    ? node.$ref
        .slice(2)
        .split('/')
        .reduce((n, k) => n[k], spec)
    : node;
}

/** Does a string value from a URL or header fit a parameter schema? */
export function fits(value, schemaRef) {
  const schema = resolve(schemaRef);
  if (schema.enum && !schema.enum.map(String).includes(value)) return false;
  if (schema.type === 'integer') {
    if (!/^-?\d+$/.test(value)) return false;
  } else if (schema.type === 'number') {
    if (!/^-?\d+(\.\d+)?$/.test(value)) return false;
  }
  const n = Number(value);
  if (schema.minimum !== undefined && n < schema.minimum) return false;
  if (schema.maximum !== undefined && n > schema.maximum) return false;
  if (schema.pattern && !new RegExp(schema.pattern).test(value)) return false;
  if (schema.minLength !== undefined && value.length < schema.minLength) return false;
  if (schema.maxLength !== undefined && value.length > schema.maxLength) return false;
  return true;
}

/** The operation and path parameters for a method + path, or null. */
function findOperation(method, pathname) {
  for (const [template, item] of Object.entries(spec.paths)) {
    const names = [];
    const re = new RegExp(
      `^${template.replace(/\{(\w+)\}/g, (_, n) => (names.push(n), '([^/]+)'))}$`,
    );
    const m = re.exec(pathname);
    if (m)
      return {
        template,
        op: item[method.toLowerCase()],
        values: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])])),
      };
  }
  return null;
}

/**
 * @param {{ method: string, url: string, headers: Record<string, string> }} request
 * @returns {string[]} problems (empty = matches the spec)
 */
export function auditRequest({ method, url, headers }) {
  const { pathname, searchParams } = new URL(url);
  const path = pathname.replace(/^\/api/, '');
  const found = findOperation(method, path);
  if (!found) return [`${method} ${path}: no such path in the spec`];
  if (!found.op) return [`${method} ${found.template}: method not documented`];
  const params = (found.op.parameters || []).map(resolve);
  const problems = [];
  const where = `${method} ${found.template}`;
  for (const [name, value] of searchParams) {
    const p = params.find((x) => x.in === 'query' && x.name === name);
    if (!p) problems.push(`${where}: query parameter "${name}" is not in the spec`);
    else if (!fits(value, p.schema))
      problems.push(`${where}: ${name}=${value} does not fit the schema`);
  }
  for (const [name, value] of Object.entries(found.values)) {
    const p = params.find((x) => x.in === 'path' && x.name === name);
    if (p && !fits(value, p.schema))
      problems.push(`${where}: path ${name}=${value} does not fit the schema`);
  }
  for (const [name, value] of Object.entries(headers)) {
    if (!/^x-/i.test(name)) continue;
    const p = params.find((x) => x.in === 'header' && x.name.toLowerCase() === name.toLowerCase());
    if (!p) problems.push(`${where}: header ${name} is not in the spec`);
    else if (!fits(value, p.schema))
      problems.push(`${where}: header ${name}: ${value} does not fit the schema`);
  }
  return problems;
}
