/**
 * Fails if the current git branch does not follow the convention in CONTRIBUTING.md:
 *   <type>/<short-description>   type = feature | fix | docs | chore | test | refactor
 *   lowercase letters, digits and dashes; whole name at most 50 characters. main is allowed.
 */
import { execSync } from 'node:child_process';

export const BRANCH_PATTERN = /^(feature|fix|docs|chore|test|refactor)\/[a-z0-9]+(-[a-z0-9]+)*$/;

const branch =
  process.argv[2] || execSync('git branch --show-current', { encoding: 'utf8' }).trim();
const ok = branch === 'main' || (BRANCH_PATTERN.test(branch) && branch.length <= 50);
console.log(`${ok ? 'OK  ' : 'FAIL'} branch "${branch}"`);
process.exit(ok ? 0 : 1);
