import type { BufferFacade } from './bufferFacade';
import type { IReadBlock, IReadBlockFixed, IReadBlockVariable } from './types';

const tmpbuf = new ArrayBuffer(8);
const f64arr = new Float64Array(tmpbuf);
const u8arr = new Uint8Array(tmpbuf);
const u16arr = new Uint16Array(tmpbuf);
const u32arr = new Uint32Array(tmpbuf);
const decoder = new TextDecoder();

export const readUint8: IReadBlockFixed<number> = {
  size: 1,
  read: (buf, pos) => buf.readByte(pos),
};

export const readUint16: IReadBlockFixed<number> = {
  size: 2,
  read: (buf, pos) => {
    u8arr[0] = buf.readByte(pos);
    u8arr[1] = buf.readByte(pos + 1);
    return u16arr[0];
  },
};

export const readUint32: IReadBlockFixed<number> = {
  size: 4,
  read: (buf, pos) => {
    u8arr[0] = buf.readByte(pos);
    u8arr[1] = buf.readByte(pos + 1);
    u8arr[2] = buf.readByte(pos + 2);
    u8arr[3] = buf.readByte(pos + 3);
    return u32arr[0];
  },
};

export const readFloat64: IReadBlockFixed<number> = {
  size: 8,
  read: (buf, pos) => {
    for (let i = 0; i < 8; i++) {
      u8arr[i] = buf.readByte(pos + i);
    }
    return f64arr[0];
  },
};

export function readBufferFixed(size: number): IReadBlockFixed<Uint8Array> {
  return {
    size,
    read: (buf, pos) => buf.read(pos, size),
  };
}

export const readEncodedBoolean: IReadBlockFixed<boolean> = transformFixedRead(readUint8, (v) => v > 0);

export const readEncodedUint: IReadBlockVariable<number> = {
  size(buf, pos) {
    const val = readUint8.read(buf, pos);
    return val < 254 ? readUint8.size : readUint8.size + (val == 254 ? readUint16.size : readUint32.size);
  },
  read(buf, pos) {
    const val = readUint8.read(buf, pos);
    if (val < 254) {
      return val;
    }
    if (val == 254) {
      return readUint16.read(buf, pos + readUint8.size);
    }
    return readUint32.read(buf, pos + readUint8.size);
  },
};

export const readEncodedString: IReadBlockVariable<string> = {
  size(buf, pos) {
    const len = readEncodedUint.read(buf, pos);
    return readEncodedUint.size(buf, pos) + len;
  },
  read(buf, pos) {
    const len = readEncodedUint.read(buf, pos);
    return decoder.decode(buf.read(pos + readEncodedUint.size(buf, pos), len));
  },
};

export function readFixedString(length: number): IReadBlockFixed<string> {
  return {
    size: length,
    read: (buf, pos) => {
      return decoder.decode(buf.read(pos, length));
    },
  };
}

export function readArrayOf<T>(itemBlock: IReadBlock<T>): IReadBlock<Array<T>> {
  return dynamicRead((buf, pos) => {
    const length = readUint16.read(buf, pos);
    return transformRead(seqRead(readUint16, repeatRead(length, itemBlock)), ([_len, items]) => items);
  });
}

export function transformFixedRead<Inner, Outer>(
  block: IReadBlockFixed<Inner>,
  transform: (val: Inner) => Outer,
): IReadBlockFixed<Outer> {
  return {
    size: block.size,
    read: (buf, pos) => transform(block.read(buf, pos)),
  };
}

// prettier-ignore
export function seqRead<V1>(b1: IReadBlock<V1>): IReadBlockVariable<[V1]>;
// prettier-ignore
export function seqRead<V1, V2>(b1: IReadBlock<V1>, b2: IReadBlock<V2>): IReadBlockVariable<[V1, V2]>;
// prettier-ignore
export function seqRead<V1, V2, V3>(b1: IReadBlock<V1>, b2: IReadBlock<V2>, b3: IReadBlock<V3>): IReadBlockVariable<[V1, V2, V3]>;
// prettier-ignore
export function seqRead<V1, V2, V3, V4>(b1: IReadBlock<V1>, b2: IReadBlock<V2>, b3: IReadBlock<V3>, b4: IReadBlock<V4>): IReadBlockVariable<[V1, V2, V3, V4]>;
// prettier-ignore
export function seqRead<V1, V2, V3, V4, V5>(b1: IReadBlock<V1>, b2: IReadBlock<V2>, b3: IReadBlock<V3>, b4: IReadBlock<V4>, b5: IReadBlock<V5>): IReadBlockVariable<[V1, V2, V3, V4, V5]>;
// prettier-ignore
export function seqRead(...items: Array<IReadBlock<any>>): IReadBlockVariable<Array<any>>;
export function seqRead(...items: Array<IReadBlock<any>>): IReadBlockVariable<any> {
  return {
    size(buf, pos) {
      let size = 0;
      let offset = pos;
      items.forEach((item) => {
        const len = resolveReadSize(item, buf, offset);
        size += len;
        offset += len;
      });
      return size;
    },
    read(buf, pos) {
      let offset = pos;
      const result: Array<any> = [];
      items.forEach((item) => {
        const size = resolveReadSize(item, buf, offset);
        result.push(item.read(buf, offset));
        offset += size;
      });
      return result;
    },
  };
}

export function resolveReadSize(block: IReadBlock<any>, buffer: BufferFacade, offset: number): number {
  return typeof block.size === 'number' ? block.size : block.size(buffer, offset);
}

export function dynamicRead<Value>(getBlock: (buf: BufferFacade, pos: number) => IReadBlock<Value>): IReadBlock<Value> {
  return {
    size: (buf, pos) => resolveReadSize(getBlock(buf, pos), buf, pos),
    read: (buf, pos) => getBlock(buf, pos).read(buf, pos),
  };
}

export function transformRead<Inner, Outer>(
  block: IReadBlock<Inner>,
  transform: (val: Inner) => Outer,
): IReadBlock<Outer> {
  const size = block.size;
  if (typeof size === 'number') {
    return {
      size: size,
      read: (buf, pos) => transform(block.read(buf, pos)),
    };
  }
  return {
    size: (buf, pos) => size(buf, pos),
    read: (buf, pos) => transform(block.read(buf, pos)),
  };
}

export function repeatRead<Value>(count: number, block: IReadBlock<Value>): IReadBlock<Array<Value>> {
  return {
    size: (buf, pos) => {
      let size = 0;
      let offset = pos;
      for (let i = 0; i < count; i++) {
        const len = resolveReadSize(block, buf, offset);
        offset += len;
        size += len;
      }
      return size;
    },
    read: (buf, pos) => {
      let offset = pos;
      const result: Array<Value> = [];
      for (let i = 0; i < count; i++) {
        const element = block.read(buf, offset);
        result.push(element);
        const size = resolveReadSize(block, buf, offset);
        offset += size;
      }
      return result;
    },
  };
}
