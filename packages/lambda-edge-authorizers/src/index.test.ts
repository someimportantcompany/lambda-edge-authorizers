import { expect, test } from '@jest/globals';
import * as index from './index';

test('should export a collection of functions', () => {
  expect(typeof index).toBe('object');
  expect(typeof index.createOauthProvider).toBe('function');
  expect(typeof index.createAuth0Provider).toBe('function');
});
