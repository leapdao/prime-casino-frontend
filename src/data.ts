import { useState, useEffect, useCallback } from 'react';
import { Contract, EventData } from 'web3-eth-contract';
import BigNumber from 'bignumber.js';
import { Prime, Status } from './types';

export const useMinBet = (primeCasino: Contract) => {
  const [minBet, setMinBet] = useState<BigNumber | null>(null);
  useEffect(() => {
    primeCasino.methods
      .minBet()
      .call()
      .then((minBet: BigNumber) => {
        setMinBet(minBet); // ToDo: do not be sorry, be better
      });
  }, [primeCasino, setMinBet]);

  return minBet;
};

export const usePrimes = (primeCasino: Contract) => {
  const [primes, setPrimes] = useState<Prime[]>([]);
  const getStatus = useCallback(
    (eventData: EventData): Promise<Prime> => {
      return primeCasino.methods
        .getStatus(eventData.returnValues.number)
        .call()
        .then((status: Status) => {
          return {
            prime: eventData.returnValues.number,
            taskHash: eventData.returnValues.taskHash,
            challengeEndTime: status._challengeEndTime,
            pathRoots: status._pathRoots
          };
        });
    },
    [primeCasino]
  );

  useEffect(() => {
    primeCasino
      .getPastEvents('NewCandidatePrime', { fromBlock: 0 })
      .then(events => {
        Promise.all(events.map(getStatus)).then(newPrimes => {
          setPrimes(newPrimes);
        });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const r = primeCasino.events.NewCandidatePrime(
      { fromBlock: 'latest' },
      (err: any, event: EventData) => {
        getStatus(event).then(prime => {
          setPrimes([...primes, prime]);
        });
      }
    );
    return () => {
      if (r.id) {
        r.unsubscribe();
      }
    };
  }, [primeCasino, primes, setPrimes, getStatus]);

  return primes;
};
