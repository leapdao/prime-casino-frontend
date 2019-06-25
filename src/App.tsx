import React from 'react';
import { observer } from 'mobx-react-lite';
import { Heading, Button, Text } from 'rebass';
import partition from 'lodash/partition';
import { store } from './store';
import {
  Container,
  Header,
  IntroText,
  Divider,
  Form,
  PrimeInput,
  Global
} from './styles';
import { PendingBets } from './PendingBets';
import { CompletedBets } from './CompletedBets';

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

export default App;
