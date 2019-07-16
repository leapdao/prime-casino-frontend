import React from 'react';
import { Heading } from 'rebass';
import { Table } from './Table';
import { Prime } from '../types';
import { ResultIcon } from './ResultIcon';

type Props = {
  primes: Prime[];
};

export const CompletedBets: React.FC<Props> = ({ primes }) => {
  return (
    <>
      <Heading>Completed bets</Heading>
      <Table>
        <thead>
          <tr>
            <th>Number</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {primes.reverse().map(({ number, results }) => (
            <tr key={number.toString()}>
              <td>{number.toString()}</td>
              <td>
                <ResultIcon result={results[0].result} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
};
