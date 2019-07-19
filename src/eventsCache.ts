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
    // this.restore();
    autorun(this.autosave);
  }

  @action
  public add(events: EventData[]) {
    const addedEvents = events
      .filter(
        (e1: any) => this.events.findIndex((e2: any) => e2.id === e1.id) === -1
      )
      .map(this.prepareEvent)
      .map(this.restoreEvent);
    console.log(addedEvents);
    this.events.push(...addedEvents);
    if (events.length > 0) {
      this.latestBlockSynced = this.events[this.events.length - 1].blockNumber;
    }

    return addedEvents;
  }

  @autobind
  private restoreEvent(event: EventData) {
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
  }

  @autobind
  private prepareEvent(event: EventData): EventData {
    if (event.event === 'NewCandidatePrime' || event.event === 'NewBet') {
      const {
        returnValues: { number, sumYes, sumNo, ...returnValues }
      } = event;
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

  @action
  private restore() {
    const cache = JSON.parse(localStorage.getItem(this.key) || '{}');
    if (cache.events) {
      this.latestBlockSynced = cache.latestBlockSynced;
      this.events = cache.events.map(this.restoreEvent);
    }
  }

  @autobind
  private autosave() {
    localStorage.setItem(
      this.key,
      JSON.stringify({
        events: toJS(this.events).map(this.prepareEvent),
        latestBlockSynced: this.latestBlockSynced
      })
    );
  }
}
