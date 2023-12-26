import { BufferFacade } from './bufferFacade';
import { FileErreur } from './errors';
import { resolveReadSize } from './readBlocks';
import type { IReadBlock } from './types';

export interface IFileParser {
  read<Value>(block: IReadBlock<Value>): Value;
  readEof(): void;
}

export function reader(data: ArrayBuffer): IFileParser {
  const buffer = new Uint8Array(data);
  const facade = new BufferFacade(buffer);
  let offset = 0;

  return {
    read,
    readEof,
  };

  function read<Value>(block: IReadBlock<Value>): Value {
    const size = resolveReadSize(block, facade, offset);
    ensureRead(size);
    const result = block.read(facade, offset);
    offset += size;
    return result;
  }

  function readEof() {
    if (offset !== buffer.byteLength) {
      throw FileErreur.ExpectedEof();
    }
  }

  function ensureRead(size: number) {
    if (offset + size > buffer.byteLength) {
      throw FileErreur.UnexpectedEof();
    }
  }
}
