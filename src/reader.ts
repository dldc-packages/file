import { BufferFacade } from "./bufferFacade.ts";
import { throwExpectedEof, throwUnexpectedEof } from "./erreur.ts";
import { resolveReadSize } from "./readBlocks.ts";
import type { IReadBlock } from "./types.ts";

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
      return throwExpectedEof();
    }
  }

  function ensureRead(size: number) {
    if (offset + size > buffer.byteLength) {
      return throwUnexpectedEof();
    }
  }
}
