import React from 'react';
import { observer } from 'mobx-react-lite';
import { Heading, Button } from 'rebass';
import { store } from './store';
import { Table, StakeButton } from './styles';
import { Prime } from './types';

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
          {primes.map(prime => (
            <tr key={prime.prime.toString()}>
              <td>{prime.prime.toString()}</td>
              <td>{store.web3.utils.fromWei(prime.sumYes.toString())} ETH</td>
              <td>{store.web3.utils.fromWei(prime.sumNo.toString())} ETH</td>
              <td>
                {prime.results.length === 0 && (
                  <>
                    {prime.status.challengeEndTime.gte(now) && 'Requested'}
                    {prime.status.challengeEndTime.lte(now) &&
                      prime.status.challengeEndTime.gt(0) &&
                      'Requested'}
                  </>
                )}
                {prime.results.length === 1 && (
                  <>
                    {prime.status.challengeEndTime.gte(now) && 'Solved'}
                    {prime.status.challengeEndTime.lte(now) &&
                      prime.status.challengeEndTime.gt(0) &&
                      prime.myBets &&
                      !prime.myBets.eq(0) && (
                        <Button onClick={() => store.payout(prime)}>
                          Payout
                        </Button>
                      )}
                  </>
                )}
                {prime.results.length > 1 && (
                  <>
                    {prime.status.challengeEndTime.gte(now) && 'Challenged'}
                    {prime.status.challengeEndTime.lte(now) &&
                      prime.status.challengeEndTime.gt(0) &&
                      'Failed (what to do?)'}
                  </>
                )}
              </td>
              <td>
                {(prime.status.challengeEndTime.gte(now) ||
                  prime.status.challengeEndTime.eq(1)) && (
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

                {prime.results.length === 0 && (
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
          ))}
        </tbody>
      </Table>
    </>
  );
});
