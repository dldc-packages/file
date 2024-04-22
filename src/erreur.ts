import { createErreurStore } from '@dldc/erreur';

export type TFileErreurData = { kind: 'UnexpectedEofKey' } | { kind: 'ExpectedEofKey' };

const FileErreurInternal = createErreurStore<TFileErreurData>();

export const FileErreur = FileErreurInternal.asReadonly;

export function throwUnexpectedEof() {
  return FileErreurInternal.setAndThrow('Unexpected end of file', { kind: 'UnexpectedEofKey' });
}

export function throwExpectedEof() {
  return FileErreurInternal.setAndThrow('Expected end of file but found more data', { kind: 'ExpectedEofKey' });
}
