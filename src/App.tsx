import React from 'react';
import styled from 'styled-components';
import { Box, Heading, Button, Text } from 'rebass';
import partition from 'lodash/partition';
import './App.css';
import primeCasinoABI from './primeCasinoABI.json';
import enforcerMockABI from './enforcerMockABI.json';

import {
  useInjectedWeb3,
  useInjectedContract,
  useWeb3,
  useContract
} from './useWeb3';
import { useMinBet, usePrimes } from './data';
import { Prime } from './types';

const RPC_URL = 'wss://goerli.infura.io/ws/v3/f039330d8fb747e48a7ce98f51400d65';
const PRIME_CASINO_ADDR = '0xc5c6340e8d809f54460580bbfae760757e2224df';
const ENFORCER_MOCK_ADDR = '0x779e3ad8665545ba52b454b1f7e8fbd2512e1fd2';

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

const App: React.FC = () => {
  const web3 = useWeb3(RPC_URL);
  const primeCasino = useContract(
    web3,
    primeCasinoABI as any,
    PRIME_CASINO_ADDR
  );
  const enforcerMock = useContract(
    web3,
    enforcerMockABI as any,
    ENFORCER_MOCK_ADDR
  );

  const [iWeb3, address] = useInjectedWeb3();
  const iPrimeCasino = useInjectedContract(
    iWeb3,
    primeCasinoABI,
    PRIME_CASINO_ADDR
  );
  const iEnforcerMock = useInjectedContract(
    iWeb3,
    enforcerMockABI,
    ENFORCER_MOCK_ADDR
  );
  const minBet = useMinBet(primeCasino);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const primes = usePrimes(primeCasino, enforcerMock);

  const bet = (prime: Prime, isPrime: boolean) => {
    if (iPrimeCasino && minBet) {
      iPrimeCasino.methods.bet(prime.prime, isPrime).send({
        value: minBet,
        from: address
      });
    }
  };

  const newPrime = React.useCallback(
    (prime: string) => {
      if (iPrimeCasino && minBet) {
        iPrimeCasino.methods.request(prime).send({
          value: minBet,
          from: address
        });
      }
    },
    [address, iPrimeCasino, minBet]
  );

  const handleNewPrimeSubmit = React.useCallback(
    e => {
      e.preventDefault();
      if (minBet && inputRef.current) {
        newPrime(inputRef.current.value);
        inputRef.current.value = '';
      }
    },
    [minBet, newPrime]
  );

  const registerResult = (prime: Prime) => {
    if (iEnforcerMock) {
      const path =
        '0x1100000000000000000000000000000000000000000000000000000000000011';
      iEnforcerMock.methods
        .registerResult(prime.taskHash, path, '0x00')
        .send({ from: address });
    }
  };

  const now = Math.round(Date.now() / 1000);
  const [completed, pending] = partition(
    primes,
    prime =>
      prime.results.length === 1 &&
      prime.status.challengeEndTime.lte(now) &&
      prime.status.challengeEndTime.gt(0)
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
          A bet takes {minBet && web3.utils.fromWei(minBet.toString())} ETH. You
          can either propose a new probably prime or&nbsp;stake yes/no on an
          existing one.
        </IntroText>
        <IntroText>Have fun!</IntroText>
      </Header>
      <Divider />
      {!address && (
        <>
          <Text fontSize={20}>Unlock your wallet</Text>
        </>
      )}
      {address && (
        <>
          <Form onSubmit={handleNewPrimeSubmit}>
            <PrimeInput ref={inputRef} placeholder="Number" />
            <Button type="submit">New prime</Button>
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
              {pending.map(prime => (
                <tr key={prime.prime.toString()}>
                  <td>{prime.prime.toString()}</td>
                  <td>{web3.utils.fromWei(prime.sumYes.toString())} ETH</td>
                  <td>{web3.utils.fromWei(prime.sumNo.toString())} ETH</td>
                  <td>
                    {prime.results.length === 0 && (
                      <>
                        {prime.status.challengeEndTime.gte(now) && 'Requested'}
                        {prime.status.challengeEndTime.lte(now) &&
                          prime.status.challengeEndTime.gt(0) &&
                          'Not solved (what to do?)'}
                      </>
                    )}
                    {prime.results.length === 1 && (
                      <>{prime.status.challengeEndTime.gte(now) && 'Solved'}</>
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
                    {prime.status.challengeEndTime.gte(now) &&
                      prime.results.length > 0 && (
                        <>
                          <StakeButton
                            onClick={() => {
                              bet(prime, true);
                            }}
                          >
                            <span role="img" aria-label="Yes">
                              👍
                            </span>
                          </StakeButton>
                          <StakeButton
                            onClick={() => {
                              bet(prime, false);
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
                          registerResult(prime);
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
    </Container>
  );
};

export default App;
