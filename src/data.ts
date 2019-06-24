import { useState, useEffect, useReducer } from 'react';
import { Contract, EventData } from 'web3-eth-contract';
import BigNumber from 'bignumber.js';
import produce from 'immer';
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

type State = Prime[];

const initialState: State = [];
const reducer = (state: State, action: any): State => {
  switch (action.type) {
    case 'NewCandidatePrime':
      return produce(state, draft => {
        draft.push({
          prime: action.event.returnValues.number,
          taskHash: action.event.returnValues.taskHash,
          sumYes: action.event.returnValues.sumYes,
          sumNo: action.event.returnValues.sumNo,
          status: action.status,
          results: action.results
        });
      });
    case 'NewBet':
      return produce(state, draft => {
        const index = draft.findIndex(prime =>
          prime.prime.eq(action.event.returnValues.number)
        );
        if (index !== -1) {
          draft[index].sumYes = action.event.returnValues.sumYes;
          draft[index].sumNo = action.event.returnValues.sumNo;
        } else {
          console.log('notFoundNumber', state, draft, action);
        }
      });
    case 'Registered':
      return produce(state, draft => {
        const index = draft.findIndex(
          prime => prime.taskHash === action.event.returnValues._taskHash
        );
        if (index !== -1) {
          if (
            draft[index].status.pathRoots.indexOf(
              action.event.returnValues._pathRoot
            ) === -1
          ) {
            draft[index].results.push(action.event.returnValues.result);
            draft[index].status.pathRoots.push(
              action.event.returnValues._pathRoot
            );
          }
        } else {
          console.log('notFoundNumber', state, draft, action);
        }
      });
  }

  return state;
};

export const usePrimes = (primeCasino: Contract, enforcerMock: Contract) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const getResults = (taskHash: string, pathRoots: string[]) => {
      return Promise.all(
        pathRoots.map(pathRoot => {
          return enforcerMock
            .getPastEvents('Registered', {
              fromBlock: 0,
              filter: {
                _taskHash: taskHash,
                _pathRoot: pathRoot
              }
            })
            .then(events => {
              return {
                pathRoot: events[0].returnValues._taskHash,
                result: events[0].returnValues.result
              };
            });
        })
      );
    };

    const getStatus = (number: BigNumber): Promise<Status> => {
      return primeCasino.methods
        .getStatus(number)
        .call()
        .then(
          ({
            _challengeEndTime,
            _pathRoots
          }: {
            _challengeEndTime: BigNumber;
            _pathRoots: string[];
          }) => ({
            challengeEndTime: _challengeEndTime,
            pathRoots: _pathRoots
          })
        );
    };

    const getEventAction = (event: EventData) => {
      if (event.event === 'NewCandidatePrime') {
        return getStatus(event.returnValues.number).then(status => {
          return getResults(event.returnValues.taskHash, status.pathRoots).then(
            results => ({
              type: event.event,
              event,
              status,
              results
            })
          );
        });
      } else if (event.event === 'NewBet') {
        return Promise.resolve({
          type: event.event,
          event
        });
      } else if (event.event === 'Registered') {
        return {
          type: event.event,
          event
        };
      }

      return Promise.resolve(null);
    };

    const handleEvents = (events: EventData[]) => {
      return Promise.all(events.map(getEventAction).filter(a => a) as any).then(
        actions => {
          actions.forEach(action => dispatch(action));
        }
      );
    };

    primeCasino.getPastEvents('allEvents', { fromBlock: 0 }).then(events => {
      handleEvents(events);
    });

    const r = primeCasino.events.allEvents(
      { fromBlock: 'latest' },
      (err: any, event: EventData) => {
        handleEvents([event]);
      }
    );

    const r2 = enforcerMock.events.Registered(
      { fromBlock: 'latest' },
      (err: any, event: EventData) => {
        handleEvents([event]);
      }
    );

    return () => {
      if (r.id) {
        r.unsubscribe();
      }
      if (r2.id) {
        r2.unsubscribe();
      }
    };
  }, []); // eslint-disable-line

  return state;
};
