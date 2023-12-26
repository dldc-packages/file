import { BufferFacade } from './bufferFacade';
import type { IWriteBlock } from './types';
import { resolveWriteSize } from './writeBlocks';

export interface IWriter {
  write<Value>(block: IWriteBlock<Value>, value: Value): void;
  getArrayBuffer(): ArrayBuffer;
}

export function writer(initialSize: number = 32 * 4): IWriter {
  let content = new Uint8Array(initialSize);
  let facade = new BufferFacade(content);
  let offset = 0;

  return {
    write,
    getArrayBuffer,
  };

  function write<Value>(block: IWriteBlock<Value>, value: Value) {
    const size = resolveWriteSize(block, value);
    expand(offset + size);
    block.write(facade, offset, value);
    offset += size;
  }

  function getArrayBuffer() {
    return content.buffer.slice(0, offset);
  }

  /**
   * Make sure the buffer is big enough
   */
  function expand(minsize: number) {
    if (minsize < content.byteLength) {
      return;
    }
    // we don't use current facade size bacause it might not be a power of 4
    let newsize = 32 * 4;
    while (newsize < minsize) {
      newsize *= 4;
    }
    const newBuffer = new Uint8Array(newsize);
    newBuffer.set(content);
    content = newBuffer;
    facade = new BufferFacade(content);
  }
}
