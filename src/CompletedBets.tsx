import React from 'react';
import { Heading } from 'rebass';
import { Table } from './Table';
import { Prime } from './types';

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
          {primes.map(({ number, results }) => (
            <tr key={number.toString()}>
              <td>{number.toString()}</td>
              <td>
                <span role="img" aria-label="Yes">
                  {results[0].result === '0x00' && '👎'}
                  {results[0].result === '0x01' && '👍'}
                  {results[0].result === '0x02' && '¯\\_(ツ)_/¯'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
};
