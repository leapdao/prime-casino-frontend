import React from 'react';
import './App.css';
// import primeCasinoABI from './primeCasinoABI.json';
// import enforcerMockABI from './enforcerMockABI.json';
// import {ethers} from 'ethers';
import { Box, Heading, Button, Text } from 'rebass';
import styled from 'styled-components';
// import Web3 from 'web3';

// const web3 = new Web3();
// primeCasino.getPastEvents('allEvents', {}).then(console.log);
// enforcerMock.getPastEvents('allEvents', {}).then(console.log);

// const RPC_URL = 'https://rpc.slock.it/goerli';
// const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
// const primeCasino = new ethers.Contract('0x1dd86e3a825003c60121671437a43619e00e3c86', primeCasinoABI, provider);
// const enforcerMock = new ethers.Contract('0xa061bc4fa961f31baa76e7dffa265953615ae788', enforcerMockABI, provider);

// provider.resetEventsBlock(0);
// primeCasino.once('NewPrime', console.log);
// provider.getLogs({
//   address: primeCasino.address,
//   fromBlock: 0,
// }).then(console.log);

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
      <Form>
        <PrimeInput placeholder="Number" />
        <Button>New prime</Button>
      </Form>
      <Divider />
      <Heading>Pending bets</Heading>
      <Table>
        <thead>
          <tr>
            <th>Number</th>
            <th>👍</th>
            <th>👎</th>
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
              <StakeButton>👍</StakeButton>
              <StakeButton>👎</StakeButton>
            </td>
          </tr>
          <tr>
            <td>1234</td>
            <td>2 ETH</td>
            <td>1 ETH</td>
            <td>Solved</td>
            <td>
              <StakeButton>👍</StakeButton>
              <StakeButton>👎</StakeButton>
            </td>
          </tr>
          <tr>
            <td>1234</td>
            <td>2 ETH</td>
            <td>1 ETH</td>
            <td>Challenged</td>
            <td>
              <StakeButton>👍</StakeButton>
              <StakeButton>👎</StakeButton>
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
            <td>👍</td>
          </tr>
          <tr>
            <td>4567</td>
            <td>👎</td>
          </tr>
          <tr>
            <td>5647</td>
            <td>¯\_(ツ)_/¯</td>
          </tr>
        </tbody>
      </Table>
    </Container>
  );
};

export default App;
