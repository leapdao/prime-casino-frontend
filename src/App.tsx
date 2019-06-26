import React from 'react';
import { observer } from 'mobx-react-lite';
import { Heading, Text, Box } from 'rebass';
import partition from 'lodash/partition';
import { store } from './store';
import { PendingBets } from './PendingBets';
import { CompletedBets } from './CompletedBets';
import { PrimeForm } from './PrimeForm';
import styled, { createGlobalStyle } from 'styled-components';

export const Global = createGlobalStyle`
  * {
    box-sizing: border-box;
  }
`;

const Container = styled(Box)`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled(Box)`
  width: 70%;
  margin-bottom: 20px;
`;

const IntroText = styled(Text)`
  & + & {
    margin-top: 10px;
  }
`;

const Title = styled(Heading)`
  font-size: 36px;
  margin-bottom: 10px;
`;

const Divider = styled.hr`
  border: 0;
  border-bottom: 1px solid #ccc;
  margin: 30px 0;
`;

const LoadingMessage = styled(Text)`
  font-size: 20px;
`;

export const App: React.FC = observer(() => {
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
        <Title>Prime Casino</Title>
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
      {!store.address && <LoadingMessage>Unlock your wallet</LoadingMessage>}
      {store.address && !store.loaded && (
        <LoadingMessage>Loading...</LoadingMessage>
      )}
      {store.address && store.loaded && (
        <>
          <PrimeForm onSubmit={store.newPrime} />
          <Divider />
          <PendingBets primes={pending} />

          {completed.length > 0 && (
            <>
              <Divider />
              <CompletedBets primes={completed} />
            </>
          )}
        </>
      )}
      <Global />
    </Container>
  );
});
