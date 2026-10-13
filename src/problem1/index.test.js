const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const test = require('node:test');
const vm = require('node:vm');

test('all sum implementations return the expected total', async () => {
  const source = await readFile(new URL('./index.js', `file://${__filename}`), 'utf8');
  const context = {};
  vm.runInNewContext(source, context);
  const implementations = [context.sum_to_n_a, context.sum_to_n_b, context.sum_to_n_c];

  for (const sumToN of implementations) {
    assert.equal(sumToN(1), 1);
    assert.equal(sumToN(5), 15);
    assert.equal(sumToN(100), 5050);
  }
});
