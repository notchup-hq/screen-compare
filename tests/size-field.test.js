import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSizeText, isClearKey, parseSize, stepDirection, stepSize } from '../js/size-field.js';

test('parseSize accepts a dot or a comma and rejects the rest', () => {
  assert.equal(parseSize('15,6'), 15.6);
  assert.equal(parseSize('15.6'), 15.6);
  assert.equal(parseSize(' 24 '), 24);
  assert.equal(parseSize('24.'), 24);
  assert.equal(parseSize('.5'), 0.5);
  for (const bad of ['', ' ', 'abc', '1,2,3', '1.2.3', '-5', '.', ',', '1e3', null, undefined]) {
    assert.equal(parseSize(bad), null, `${bad}`);
  }
});

test('stepSize from an empty field starts at the placeholder, not the minimum', () => {
  assert.equal(stepSize(null, 1), 24.5);
  assert.equal(stepSize(null, -1), 23.5);
  assert.equal(stepSize(null, 1, 22), 22.5);
  assert.equal(stepSize(null, -1, 22), 21.5);
});

test('stepSize moves to the next half inch in that direction', () => {
  assert.equal(stepSize(24, 1), 24.5);
  assert.equal(stepSize(24, -1), 23.5);
  assert.equal(stepSize(15.6, 1), 16);
  assert.equal(stepSize(15.6, -1), 15.5);
  assert.equal(stepSize(15.4, -1), 15);
  assert.equal(stepSize(15.4, 1), 15.5);
  assert.equal(stepSize(21.5, 1), 22);
});

test('stepSize clamps to 10-100', () => {
  assert.equal(stepSize(100, 1), 100);
  assert.equal(stepSize(99.8, 1), 100);
  assert.equal(stepSize(150, -1), 100);
  assert.equal(stepSize(10, -1), 10);
  assert.equal(stepSize(10.2, -1), 10);
  assert.equal(stepSize(5, 1), 10);
  assert.equal(stepSize(null, -1, 10), 10);
});

test('cleanSizeText keeps digits and one decimal separator only', () => {
  assert.equal(cleanSizeText('sdads'), '');
  assert.equal(cleanSizeText('2a4'), '24');
  assert.equal(cleanSizeText('15,6'), '15,6');
  assert.equal(cleanSizeText('15.6.2'), '15.62');
  assert.equal(cleanSizeText('1,5.5'), '1,55');
  assert.equal(cleanSizeText('-3 in'), '3');
  assert.equal(cleanSizeText(null), '');
});

test('stepDirection: arrows and plus/minus keys step, other keys do not', () => {
  for (const key of ['ArrowUp', 'ArrowRight', '+', '=']) assert.equal(stepDirection(key), 1, key);
  for (const key of ['ArrowDown', 'ArrowLeft', '-']) assert.equal(stepDirection(key), -1, key);
  for (const key of ['1', '.', ',', 'Backspace', 'Tab', 'Enter', 'Home', undefined]) assert.equal(stepDirection(key), 0, String(key));
});

test('only C clears the size field', () => {
  assert.equal(isClearKey('c'), true);
  assert.equal(isClearKey('C'), true);
  for (const key of ['x', 'Delete', 'Backspace', 'Escape', '1', undefined]) assert.equal(isClearKey(key), false, String(key));
});
