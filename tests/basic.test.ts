import { expect, test } from 'vitest';
import {
  readArrayOf,
  readEncodedString,
  readUint16,
  readUint8,
  reader,
  seqRead,
  seqWrite,
  writeArrayOf,
  writeEncodedString,
  writeUint16,
  writeUint8,
  writer,
} from '../src/mod';
import { toHex } from './utils/hex';

test('simple file', () => {
  const file = writer();
  file.write(writeUint8, 12);
  file.write(writeUint16, 3110);
  file.write(writeEncodedString, 'hello world');

  const buffer = file.getArrayBuffer();
  expect(toHex(buffer)).toEqual(['0b0c260c', '6c6c6568', '6f77206f', '72', '6c', '64']);

  const file2 = reader(buffer);
  const a = file2.read(readUint8);
  expect(a).toEqual(12);
  const b = file2.read(readUint16);
  expect(b).toEqual(3110);
  const c = file2.read(readEncodedString);
  expect(c).toEqual('hello world');
  file2.readEof();
});

test('sequence', () => {
  const writeBlock = seqWrite(writeUint8, writeUint16, writeEncodedString, writeArrayOf(writeUint8));
  const readBlock = seqRead(readUint8, readUint16, readEncodedString, readArrayOf(readUint8));

  const writeFile = writer();
  writeFile.write(writeBlock, [12, 3110, 'hello world', [1, 2, 3, 4, 5]]);
  const buffer = writeFile.getArrayBuffer();
  expect(toHex(buffer)).toEqual(['0b0c260c', '6c6c6568', '6f77206f', '05646c72', '03020100', '04', '05']);

  const readFile = reader(buffer);
  const [a, b, c, d] = readFile.read(readBlock);
  readFile.readEof();
  expect(a).toEqual(12);
  expect(b).toEqual(3110);
  expect(c).toEqual('hello world');
  expect(d).toEqual([1, 2, 3, 4, 5]);
});
