import React from 'react';
import { observer } from 'mobx-react-lite';
import { Heading, Button } from 'rebass';
import styled from 'styled-components';
import { store } from '../store';
import { Table } from './Table';
import { Prime } from '../types';

const StakeButton = styled(Button)`
  padding: 0 8px 0 12px;
  text-align: center;
  height: 30px;
  font-size: 14px;
  background-color: transparent;
  border: 1px solid #0000ff;
  color: #000000;

  margin-right: 10px;
  &:last-of-type {
    margin-right: 0;
  }
`;

type Props = {
  primes: Prime[];
};

export const PendingBets: React.FC<Props> = observer(({ primes }) => {
  const now = Math.round(Date.now() / 1000);

  return (
    <>
      <Heading>Pending bets</Heading>
      <Table>
        <thead>
          <tr>
            <th>Number</th>
            <th>
              <span role="img" aria-label="Yes">
                👍
              </span>
            </th>
            <th>
              <span role="img" aria-label="No">
                👎
              </span>
            </th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {primes.length === 0 && (
            <tr>
              <td colSpan={5}>No candidates</td>
            </tr>
          )}
          {primes.map(prime => {
            const { number, results, sumYes, sumNo, status, myBets } = prime;
            const timePassed =
              status.challengeEndTime.lte(now) &&
              status.challengeEndTime.gt(0) &&
              !status.challengeEndTime.eq(1);
            return (
              <tr key={number.toString()}>
                <td>{number.toString()}</td>
                <td>{store.web3.utils.fromWei(sumYes.toString())} ETH</td>
                <td>{store.web3.utils.fromWei(sumNo.toString())} ETH</td>
                <td>
                  {results.length === 0 && (
                    <>
                      {status.challengeEndTime.gte(now) ||
                        (status.challengeEndTime.eq(1) && 'Requested')}
                      {timePassed && (
                        <>
                          Not solved{' '}
                          {myBets && !myBets.eq(0) && (
                            <Button onClick={() => store.payout(prime)}>
                              Payout
                            </Button>
                          )}
                        </>
                      )}
                    </>
                  )}
                  {results.length === 1 && (
                    <>
                      {status.challengeEndTime.gte(now) && 'Solved'}
                      {timePassed && myBets && !myBets.eq(0) && (
                        <Button onClick={() => store.payout(prime)}>
                          Payout
                        </Button>
                      )}
                    </>
                  )}
                  {results.length > 1 && (
                    <>
                      {status.challengeEndTime.gte(now) && 'Challenged'}
                      {timePassed && (
                        <>
                          Undetermined,
                          <br />
                          contact support
                        </>
                      )}
                    </>
                  )}
                </td>
                <td>
                  {(status.challengeEndTime.gte(now) ||
                    status.challengeEndTime.eq(1)) && (
                    <>
                      <StakeButton
                        onClick={() => {
                          store.bet(prime, true);
                        }}
                      >
                        <span role="img" aria-label="Yes">
                          👍
                        </span>
                      </StakeButton>
                      <StakeButton
                        onClick={() => {
                          store.bet(prime, false);
                        }}
                      >
                        <span role="img" aria-label="No">
                          👎
                        </span>
                      </StakeButton>
                    </>
                  )}

                  {results.length === 0 && (
                    <StakeButton
                      borderColor="red"
                      onClick={() => {
                        store.registerResult(prime);
                      }}
                    >
                      registerResult
                    </StakeButton>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
});
