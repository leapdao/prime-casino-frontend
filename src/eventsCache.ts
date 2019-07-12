import { observable, action, autorun, toJS } from 'mobx';
import { EventData } from 'web3-eth-contract';
import autobind from 'autobind-decorator';
import BigNumber from 'bignumber.js';

export class EventsCache {
  @observable
  public events: EventData[] = [];

  @observable
  public latestBlockSynced = 0;

  public key: string;

  constructor(key: string) {
    this.key = key;
    this.restore();
    autorun(this.autosave);
  }

  @action
  public add(events: EventData[]) {
    if (events.length > 0) {
      this.events.push(
        ...events.filter(
          (e1: any) =>
            this.events.findIndex((e2: any) => e2.id === e1.id) === -1
        )
      );
      this.latestBlockSynced = this.events[this.events.length - 1].blockNumber;
    }
  }

  @action
  private restore() {
    const cache = JSON.parse(localStorage.getItem(this.key) || '{}');
    if (cache.events) {
      this.latestBlockSynced = cache.latestBlockSynced;
      this.events = cache.events.map((event: EventData) => {
        if (event.event === 'NewCandidatePrime' || event.event === 'NewBet') {
          return {
            ...event,
            returnValues: {
              ...event.returnValues,
              number: new BigNumber(event.returnValues.number),
              sumYes: new BigNumber(event.returnValues.sumYes),
              sumNo: new BigNumber(event.returnValues.sumNo)
            }
          };
        }

        return event;
      });
    }
  }

  @autobind
  private autosave() {
    localStorage.setItem(
      this.key,
      JSON.stringify({
        events: toJS(this.events).map(
          ({
            returnValues: { number, sumYes, sumNo, ...returnValues },
            ...event
          }) => {
            if (
              event.event === 'NewCandidatePrime' ||
              event.event === 'NewBet'
            ) {
              return {
                ...event,
                returnValues: {
                  ...returnValues,
                  number: number.toString(),
                  sumYes: sumYes.toString(),
                  sumNo: sumNo.toString()
                }
              };
            }

            return event;
          }
        ),
        latestBlockSynced: this.latestBlockSynced
      })
    );
  }
}
