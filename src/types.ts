import BigNumber from 'bignumber.js';

export type Prime = {
  prime: BigNumber;
  taskHash: string;
  challengeEndTime: BigNumber;
  pathRoots: string[];
};

export type Status = {
  _challengeEndTime: BigNumber;
  _pathRoots: string[];
};
