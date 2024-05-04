export type IWriteValue = Uint8Array | BufferFacade;

const UNSAFE_ACCESS = Symbol("UNSAFE_ACCESS");

export class BufferFacade {
  private readonly buffer: Uint8Array;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
  }

  public get byteLength(): number {
    return this.buffer.byteLength;
  }

  public [UNSAFE_ACCESS] = (start = 0, length?: number): Uint8Array => {
    this.validateSelectParams(start, length);
    const end = length === undefined ? undefined : start + length;
    return this.buffer.subarray(start, end);
  };

  public read(start = 0, length?: number): Uint8Array {
    return this[UNSAFE_ACCESS](start, length).slice();
  }

  public readByte(index: number): number {
    this.validateSelectParams(index);
    return this.buffer[index];
  }

  public write(content: Uint8Array | BufferFacade, offset = 0): this {
    this.validateSelectParams(offset, content.byteLength);
    const rawContent = content instanceof Uint8Array
      ? content
      : content[UNSAFE_ACCESS]();
    this.buffer.set(rawContent, offset);
    return this;
  }

  public writeByte(index: number, val: number): this {
    if (index >= this.buffer.byteLength) {
      throw new Error(`Out of range write`);
    }
    this.buffer[index] = val;
    return this;
  }

  private validateSelectParams(start: number, length?: number) {
    if (start < 0) {
      throw new Error(`Out of range`);
    }
    if (length !== undefined && length < 0) {
      throw new Error(`Invalid length`);
    }
    if (length === undefined) {
      return;
    }
    const end = start + length;
    if (end > this.byteLength) {
      throw new Error(
        `Out of range: end (${end}) > length (${this.byteLength})`,
      );
    }
  }
}
