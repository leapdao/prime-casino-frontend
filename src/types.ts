import BigNumber from 'bignumber.js';

export type Prime = {
  prime: BigNumber;
  taskHash: string;
  status: Status;
  results: Result[];
  sumYes: BigNumber;
  sumNo: BigNumber;
  myBets: BigNumber | null;
};

export type Status = {
  challengeEndTime: BigNumber;
  pathRoots: string[];
};

export type Result = {
  result: string;
  pathRoot: string;
};
