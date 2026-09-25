import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { it } from 'vitest';
import { buildFixture } from './fixtureCases';

/**
 * `npm run tree:fixtures` - reprints the growth v2 parity fixture for both
 * platforms after a change to the generator or the growth table.
 */

const WEB = path.resolve(__dirname, '../../tests/fixtures/levensboom-v2.json');
const APP = path.resolve(__dirname, '../../../bijbelstudie-app/bijbelstudie_mobile/test/fixtures/levensboom_v2.json');

it('writes the parity fixture', () => {
  const json = `${JSON.stringify(buildFixture(), null, 1)}\n`;
  for (const file of [WEB, APP]) {
    if (!existsSync(path.dirname(path.dirname(file)))) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, json);
  }
});
