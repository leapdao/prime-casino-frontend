import React from 'react';
import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { Box, Heading, Button, Text } from 'rebass';
import partition from 'lodash/partition';
import './App.css';
import { store } from './store';

const Container = styled(Box)`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const IntroText = styled(Text)`
  & + & {
    margin-top: 10px;
  }
`;

const Header = styled(Box)`
  width: 70%;
  margin-bottom: 20px;
`;

const Divider = styled.hr`
  border: 0;
  border-bottom: 1px solid #ccc;
  margin: 30px 0;
`;

const PrimeInput = styled.input`
  font-size: 14px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin: 0 10px 0 0;
`;

const Form = styled(Box)`
  display: flex;
`.withComponent('form');

const Table = styled.table`
  border-collapse: collapse;

  th {
    text-align: left;
  }

  th,
  td {
    padding-right: 10px;
    padding-bottom: 10px;
    padding-top: 10px;
  }

  td {
    border-top: 1px solid #ccc;
  }
`;

const StakeButton = styled(Button)`
  padding: 0 8px 0 12px;
  text-align: center;
  height: 30px;
  font-size: 14px;
  background-color: transparent;
  border: 1px solid #0000ff;
  color: #000000;

  & + & {
    margin-left: 10px;
  }
`;

const App: React.FC = observer(() => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handleNewPrimeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputRef.current) {
      store.newPrime(inputRef.current.value);
      inputRef.current.value = '';
    }
  };

  const now = Math.round(Date.now() / 1000);
  const [completed, pending] = partition(
    store.primes,
    prime =>
      prime.results.length === 1 &&
      prime.status.challengeEndTime.lte(now) &&
      prime.status.challengeEndTime.gt(0) &&
      (!prime.myBets || prime.myBets.eq(0))
  );

  return (
    <Container>
      <Header>
        <Heading fontSize={36} marginBottom={10}>
          Prime Casino
        </Heading>
        <IntroText>
          Welcome to Prime Casino. Here you can bet on whether a number
          is&nbsp;probably prime or not under the Miller-Rabin test.
        </IntroText>
        <IntroText>
          A bet takes{' '}
          {store.minBet && store.web3.utils.fromWei(store.minBet.toString())}{' '}
          ETH. You can either propose a new probably prime or&nbsp;stake yes/no
          on an existing one.
        </IntroText>
        <IntroText>Have fun!</IntroText>
      </Header>
      <Divider />
      {!store.address && <Text fontSize={20}>Unlock your wallet</Text>}
      {store.address && !store.loaded && <Text fontSize={20}>Loading...</Text>}
      {store.address && store.loaded && (
        <>
          <Form onSubmit={handleNewPrimeSubmit}>
            <PrimeInput ref={inputRef} placeholder="Number" />
            <Button type="submit" disabled={!store.address}>
              New prime
            </Button>
          </Form>
          <Divider />
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
              {pending.length === 0 && (
                <tr>
                  <td colSpan={5}>No candidates</td>
                </tr>
              )}
              {pending.map(prime => (
                <tr key={prime.prime.toString()}>
                  <td>{prime.prime.toString()}</td>
                  <td>
                    {store.web3.utils.fromWei(prime.sumYes.toString())} ETH
                  </td>
                  <td>
                    {store.web3.utils.fromWei(prime.sumNo.toString())} ETH
                  </td>
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
          {completed.length > 0 && (
            <>
              <Divider />
              <Heading>Completed bets</Heading>
              <Table>
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.map(prime => (
                    <tr key={prime.prime.toString()}>
                      <td>{prime.prime.toString()}</td>
                      <td>
                        <span role="img" aria-label="Yes">
                          {prime.results[0].result === '0x00' && '👎'}
                          {prime.results[0].result === '0x01' && '👍'}
                          {prime.results[0].result === '0x02' && '¯_(ツ)_/¯'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </>
      )}
    </Container>
  );
});

export default App;
