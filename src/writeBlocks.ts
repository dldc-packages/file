import type { IWriteBlock, IWriteBlockFixed, IWriteBlockVariable } from './types';
import { calcStringSize } from './utils/strings';

const tmpbuf = new ArrayBuffer(8);
const f64arr = new Float64Array(tmpbuf);
const u8arr = new Uint8Array(tmpbuf);
const encoder = new TextEncoder();

export const writeUint8: IWriteBlockFixed<number> = {
  size: 1,
  write: (buf, pos, val) => {
    buf.writeByte(pos, val & 0xff);
  },
};

export const writeUint16BigEndian: IWriteBlockFixed<number> = {
  size: 2,
  write: (buf, pos, val) => {
    buf.writeByte(pos, (val >> 8) & 0xff);
    buf.writeByte(pos + 1, val & 0xff);
  },
};

export const writeUint16SmallEndian: IWriteBlockFixed<number> = {
  size: 2,
  write: (buf, pos, val) => {
    buf.writeByte(pos, val & 0xff);
    buf.writeByte(pos + 1, (val >> 8) & 0xff);
  },
};

export const writeUint16 = writeUint16BigEndian;

export const writeUint32BigEndian: IWriteBlockFixed<number> = {
  size: 4,
  write: (buf, pos, val) => {
    buf.writeByte(pos, (val >> 24) & 0xff);
    buf.writeByte(pos + 1, (val >> 16) & 0xff);
    buf.writeByte(pos + 2, (val >> 8) & 0xff);
    buf.writeByte(pos + 3, val & 0xff);
  },
};

export const writeUint32SmallEndian: IWriteBlockFixed<number> = {
  size: 4,
  write: (buf, pos, val) => {
    buf.writeByte(pos, val & 0xff);
    buf.writeByte(pos + 1, (val >> 8) & 0xff);
    buf.writeByte(pos + 2, (val >> 16) & 0xff);
    buf.writeByte(pos + 3, (val >> 24) & 0xff);
  },
};

export const writeUint32 = writeUint32BigEndian;

export const writeFloat64: IWriteBlockFixed<number> = {
  size: 8,
  write: (buf, pos, val) => {
    f64arr[0] = val;
    buf.write(u8arr.subarray(0, 8), pos);
  },
};

export const writeBuffer: IWriteBlockVariable<Uint8Array> = {
  size: (val) => val.byteLength,
  write: (buf, pos, val) => buf.write(val, pos),
};

export function writeBufferFixed(size: number): IWriteBlockFixed<Uint8Array> {
  return {
    size,
    write: (buf, pos, val) => buf.write(val, pos),
  };
}

export const writeEncodedBoolean: IWriteBlockFixed<boolean> = transformFixedWrite(writeUint8, (val) => Number(val));

export const writeEncodedUint: IWriteBlockVariable<number> = {
  size: (val) => {
    return val < 254 ? writeUint8.size : writeUint8.size + (val < 65536 ? writeUint16.size : writeUint32.size);
  },
  write(buf, pos, val) {
    if (val < 254) {
      writeUint8.write(buf, pos, val);
      return;
    }
    if (val < 65536) {
      writeUint8.write(buf, pos, 254);
      writeUint16.write(buf, pos + writeUint8.size, val);
      return;
    }
    writeUint8.write(buf, pos, 255);
    writeUint32.write(buf, pos + writeUint8.size, val);
  },
};

export const writeString: IWriteBlockVariable<string> = {
  size: (val) => calcStringSize(val),
  write: (buf, pos, val) => {
    buf.write(encoder.encode(val), pos);
  },
};

export function writeFixedString(length: number): IWriteBlockFixed<string> {
  return {
    size: length,
    write: (buf, pos, val) => {
      if (calcStringSize(val) > length) {
        throw new Error(`String too long`);
      }
      buf.write(encoder.encode(val), pos);
    },
  };
}

export const writeEncodedString: IWriteBlockVariable<string> = {
  size(val) {
    const len = calcStringSize(val);
    const sizeLen = writeEncodedUint.size(len);
    return sizeLen + len;
  },
  write: (buf, pos, val) => {
    const len = calcStringSize(val);
    const sizeLen = writeEncodedUint.size(len);
    writeEncodedUint.write(buf, pos, len);
    buf.write(encoder.encode(val), pos + sizeLen);
  },
};

export function writeArrayOf<T>(itemBlock: IWriteBlock<T>): IWriteBlock<Array<T>> {
  return transformWrite(seqWrite(writeUint16, writeMany(itemBlock)), (arr): [number, Array<T>] => [arr.length, arr]);
}

export function dynamicWrite<Value>(getBlock: (val: Value) => IWriteBlock<Value>): IWriteBlock<Value> {
  return {
    size: (val) => resolveWriteSize(getBlock(val), val),
    write: (buf, pos, val) => getBlock(val).write(buf, pos, val),
  };
}

export function resolveWriteSize<Value>(block: IWriteBlock<Value>, value: Value): number {
  return typeof block.size === 'number' ? block.size : block.size(value);
}

export function transformFixedWrite<Inner, Outer>(
  block: IWriteBlockFixed<Inner>,
  transform: (val: Outer) => Inner,
): IWriteBlockFixed<Outer> {
  const size = block.size;
  return {
    size,
    write: (buf, pos, val) => block.write(buf, pos, transform(val)),
  };
}

function transformWrite<Inner, Outer>(block: IWriteBlock<Inner>, transform: (val: Outer) => Inner): IWriteBlock<Outer> {
  const size = block.size;
  if (typeof size === 'number') {
    return {
      size,
      write: (buf, pos, val) => block.write(buf, pos, transform(val)),
    };
  }
  return {
    size: (val) => size(transform(val)),
    write: (buf, pos, val) => block.write(buf, pos, transform(val)),
  };
}

// prettier-ignore
export function seqWrite<V1>(b1: IWriteBlock<V1>): IWriteBlockVariable<[V1]>;
// prettier-ignore
export function seqWrite<V1, V2>(b1: IWriteBlock<V1>, b2: IWriteBlock<V2>): IWriteBlockVariable<[V1, V2]>;
// prettier-ignore
export function seqWrite<V1, V2, V3>(b1: IWriteBlock<V1>, b2: IWriteBlock<V2>, b3: IWriteBlock<V3>): IWriteBlockVariable<[V1, V2, V3]>;
// prettier-ignore
export function seqWrite<V1, V2, V3, V4>(b1: IWriteBlock<V1>, b2: IWriteBlock<V2>, b3: IWriteBlock<V3>, b4: IWriteBlock<V4>): IWriteBlockVariable<[V1, V2, V3, V4]>;
// prettier-ignore
export function seqWrite<V1, V2, V3, V4, V5>(b1: IWriteBlock<V1>, b2: IWriteBlock<V2>, b3: IWriteBlock<V3>, b4: IWriteBlock<V4>, b5: IWriteBlock<V5>): IWriteBlockVariable<[V1, V2, V3, V4, V5]>;
// prettier-ignore
export function seqWrite(...items: Array<IWriteBlock<any>>): IWriteBlockVariable<Array<any>>;
export function seqWrite(...items: Array<IWriteBlock<any>>): IWriteBlockVariable<any> {
  return {
    size(val) {
      if (val.length !== items.length) {
        throw new Error('Invalid seq array length');
      }
      let size = 0;
      items.forEach((item, index) => {
        size += resolveWriteSize(item, val[index]);
      });
      return size;
    },
    write(buf, pos, val) {
      if (val.length !== items.length) {
        throw new Error('Invalid seq array length');
      }
      let offset = pos;
      items.forEach((item, index) => {
        const size = resolveWriteSize(item, val[index]);
        item.write(buf, offset, val[index]);
        offset += size;
      });
    },
  };
}

export function writeMany<Value>(block: IWriteBlock<Value>): IWriteBlockVariable<Array<Value>> {
  return {
    size(vals) {
      let size = 0;
      vals.forEach((val) => {
        size += resolveWriteSize(block, val);
      });
      return size;
    },
    write(buf, pos, vals) {
      let offset = pos;
      vals.forEach((val) => {
        const size = resolveWriteSize(block, val);
        block.write(buf, offset, val);
        offset += size;
      });
    },
  };
}
