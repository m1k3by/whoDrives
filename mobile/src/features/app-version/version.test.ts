import { isOutdated } from './version';

test.each([
  ['1.0.0', '1.0.0', false],
  ['1.0.0', '1.0.1', true],
  ['1.2.0', '1.10.0', true],
  ['2.0.0', '1.9.9', false],
  ['1.0', '1.0.0', false],
  ['1.0', '1.0.1', true],
])('isOutdated(%s, %s) = %s', (current, minimum, expected) => {
  expect(isOutdated(current, minimum)).toBe(expected);
});
