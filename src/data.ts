import { useState, useEffect, useCallback, useReducer } from 'react';
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
          console.log('notFoundNumber', state, draft, action.event);
        }
      });
  }

  return state;
};

export const usePrimes = (primeCasino: Contract, enforcerMock: Contract) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const getResults = useCallback(
    (taskHash: string, pathRoots: string[]) => {
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
    },
    [enforcerMock]
  );

  const getStatus = useCallback(
    (eventData: EventData): Promise<Status> => {
      return primeCasino.methods
        .getStatus(eventData.returnValues.number)
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
    },
    [primeCasino]
  );

  const getEventAction = useCallback(
    (event: EventData) => {
      if (event.event === 'NewCandidatePrime') {
        return getStatus(event).then(status => {
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
      }

      return Promise.resolve(null);
    },
    [getStatus, getResults]
  );

  useEffect(() => {
    primeCasino.getPastEvents('allEvents', { fromBlock: 0 }).then(events => {
      Promise.all(events.map(getEventAction).filter(a => a) as any).then(
        actions => {
          actions.forEach(action => dispatch(action));
        }
      );
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const r = primeCasino.events.allEvents(
      { fromBlock: 'latest' },
      (err: any, event: EventData) => {
        (getEventAction(event) as any).then((action: any) => {
          if (action) {
            dispatch(action);
          }
        });
      }
    );
    return () => {
      if (r.id) {
        r.unsubscribe();
      }
    };
  }, [primeCasino, getEventAction]);

  return state;
};
