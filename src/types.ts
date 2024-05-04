import type { BufferFacade } from "./bufferFacade.ts";

export type IReadBlockFixed<Value> = {
  readonly size: number;
  readonly read: (buffer: BufferFacade, offset: number) => Value;
};

export type IReadBlockVariable<Value> = {
  readonly size: (buffer: BufferFacade, offset: number) => number;
  readonly read: (buffer: BufferFacade, offset: number) => Value;
};

export type IWriteBlockVariable<Value> = {
  readonly size: (value: Value) => number;
  readonly write: (buffer: BufferFacade, offset: number, value: Value) => void;
};

export type IWriteBlockFixed<Value> = {
  readonly size: number;
  readonly write: (buffer: BufferFacade, offset: number, value: Value) => void;
};

export type IReadBlock<Value> =
  | IReadBlockFixed<Value>
  | IReadBlockVariable<Value>;

export type IWriteBlock<Value> =
  | IWriteBlockFixed<Value>
  | IWriteBlockVariable<Value>;

export type IBlockFixed<RValue, WValue = RValue> = {
  reader: IReadBlockFixed<RValue>;
  writer: IWriteBlockFixed<WValue>;
};

export type IBlockVariable<RValue, WValue = RValue> = {
  reader: IReadBlockVariable<RValue>;
  writer: IWriteBlockVariable<WValue>;
};

export type IBlock<RValue, WValue = RValue> = {
  reader: IReadBlock<RValue>;
  writer: IWriteBlock<WValue>;
};
