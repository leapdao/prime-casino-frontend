import React from 'react';
import './App.css';
import primeCasinoABI from './primeCasinoABI.json';
import enforcerMockABI from './enforcerMockABI.json';
import { Box, Heading, Button, Text } from 'rebass';
import styled from 'styled-components';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';

const injectedProvider = (window as any).ethereum;

const RPC_URL = 'https://rpc.slock.it/goerli';
const web3 = new Web3(RPC_URL);
const primeCasino = new web3.eth.Contract(
  primeCasinoABI as any,
  '0xbeb4839e0c53e24b6ae1e00a2f83a0bfa921b0da'
);
const enforcerMock = new web3.eth.Contract(
  enforcerMockABI as any,
  '0x49e1c2a52c845c3943182df3ad827a907e3a10b9'
);

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

type Prime = {
  prime: BigNumber;
  taskHash: string;
};

type Status = {
  _challengeEndTime: BigNumber;
  _pathRoots: string[];
};

const App: React.FC = () => {
  const [address, setAddress] = React.useState<string | null>(null);
  const [minBet, setMinBet] = React.useState<BigNumber | null>(null);
  const [primes, setPrimes] = React.useState<Prime[] | null>(null);

  React.useEffect(() => {
    if (injectedProvider) {
      injectedProvider
        .enable()
        .then((addrs: string[]) => addrs[0])
        .then(setAddress);
    }
  }, []);

  React.useEffect(() => {
    primeCasino
      .getPastEvents('NewPrime', { fromBlock: 0 })
      .then(newPrimes =>
        newPrimes.map(newPrime => {
          return {
            prime: newPrime.returnValues.prime,
            taskHash: newPrime.returnValues.taskHash
          };
        })
      )
      .then(setPrimes);
    primeCasino.methods
      .minBet()
      .call()
      .then((minBet: BigNumber) => {
        setMinBet(minBet); // ToDo: do not be sorry, be better
      });
  }, [setPrimes, setMinBet]);

  React.useEffect(() => {
    if (primes) {
      primes.forEach(prime => {
        primeCasino.methods
          .getStatus(prime.prime)
          .call()
          .then((status: Status) => {
            const primeStatus = {
              challengeEndTime: status._challengeEndTime.toString(),
              pathRoots: status._pathRoots
            };

            if (primeStatus.pathRoots) {
              primeStatus.pathRoots.forEach((pathRoot: any) => {
                enforcerMock
                  .getPastEvents('Registered', {
                    fromBlock: 0,
                    filter: {
                      _taskHash: prime.taskHash,
                      _pathRoot: pathRoot
                    }
                  })
                  .then(events => {
                    console.log(prime.prime.toString(), primeStatus, events);
                  });
              });
            }
          });
      });
    }
  }, [primes]);

  const bet = (prime: Prime, isPrime: boolean) => {
    const iWeb3 = new Web3(injectedProvider);
    const iPrimeCasino = new iWeb3.eth.Contract(
      primeCasinoABI as any,
      '0xbeb4839e0c53e24b6ae1e00a2f83a0bfa921b0da'
    );
    iPrimeCasino.methods.bet(prime.prime, isPrime).send({
      value: minBet,
      from: address
    });
  };

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
          A bet takes 0.1 ETH. You can either propose a new probably prime
          or&nbsp;stake yes/no on an existing one.
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
          <Form>
            <PrimeInput placeholder="Number" />
            <Button>New prime</Button>
          </Form>
          <Divider />
          <Heading>Temp table</Heading>
          <Table>
            <thead>
              <tr>
                <th>Prime?</th>
                <th>Bet</th>
              </tr>
            </thead>
            <tbody>
              {primes &&
                primes.map(prime => (
                  <tr key={prime.prime.toString()}>
                    <td>{prime.prime.toString()}</td>
                    <td>
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
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
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
              <tr>
                <td>1234</td>
                <td>2 ETH</td>
                <td>1 ETH</td>
                <td>Requested</td>
                <td>
                  <StakeButton>
                    <span role="img" aria-label="Yes">
                      👍
                    </span>
                  </StakeButton>
                  <StakeButton>
                    <span role="img" aria-label="No">
                      👎
                    </span>
                  </StakeButton>
                </td>
              </tr>
              <tr>
                <td>1234</td>
                <td>2 ETH</td>
                <td>1 ETH</td>
                <td>Solved</td>
                <td>
                  <StakeButton>
                    <span role="img" aria-label="Yes">
                      👍
                    </span>
                  </StakeButton>
                  <StakeButton>
                    <span role="img" aria-label="No">
                      👎
                    </span>
                  </StakeButton>
                </td>
              </tr>
              <tr>
                <td>1234</td>
                <td>2 ETH</td>
                <td>1 ETH</td>
                <td>Challenged</td>
                <td>
                  <StakeButton>
                    <span role="img" aria-label="Yes">
                      👍
                    </span>
                  </StakeButton>
                  <StakeButton>
                    <span role="img" aria-label="No">
                      👎
                    </span>
                  </StakeButton>
                </td>
              </tr>
              <tr>
                <td>1234</td>
                <td>2 ETH</td>
                <td>1 ETH</td>
                <td>
                  <Button>Payout</Button>
                </td>
                <td />
              </tr>
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
              <tr>
                <td>1234</td>
                <td>
                  <span role="img" aria-label="Yes">
                    👍
                  </span>
                </td>
              </tr>
              <tr>
                <td>4567</td>
                <td>
                  <span role="img" aria-label="No">
                    👎
                  </span>
                </td>
              </tr>
              <tr>
                <td>5647</td>
                <td>
                  <span role="img" aria-label="Undecided">
                    ¯\_(ツ)_/¯
                  </span>
                </td>
              </tr>
            </tbody>
          </Table>
        </>
      )}
    </Container>
  );
};

export default App;
