import type { TKey } from '@dldc/erreur';
import { Erreur, Key } from '@dldc/erreur';

export type TFileErreurData = { kind: 'UnexpectedEofKey' } | { kind: 'ExpectedEofKey' };

export const FileErreurKey: TKey<TFileErreurData, false> = Key.create<TFileErreurData>('FileErreur');

export const FileErreur = {
  UnexpectedEof: () => {
    return Erreur.create(new Error('Unexpected end of file'))
      .with(FileErreurKey.Provider({ kind: 'UnexpectedEofKey' }))
      .withName('FileErreur');
  },
  ExpectedEof: () => {
    return Erreur.create(new Error('Expected end of file but found more data'))
      .with(FileErreurKey.Provider({ kind: 'ExpectedEofKey' }))
      .withName('FileErreur');
  },
};
