import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('test harness', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('can read repo files, which twelve StoneCraft specs rely on', () => {
    const pkg = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    expect(JSON.parse(pkg).name).toBe('wls-f');
  });
});
