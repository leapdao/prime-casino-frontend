import React from 'react';

type Props = {
  result: string;
};

const icons: { [key: string]: string } = {
  0: '👎',
  1: '👎',
  2: '¯\\_(ツ)_/¯',
  3: '👍',
  4: '👍'
};
const labels: { [key: string]: string } = {
  0: 'No',
  1: 'No',
  2: 'Unknown',
  3: 'Yes',
  4: 'Yes'
};

export const ResultIcon: React.FC<Props> = ({ result }) => {
  const int = parseInt(result, 16);
  return (
    <span role="img" aria-label={labels[int]}>
      {icons[int]}
    </span>
  );
};
