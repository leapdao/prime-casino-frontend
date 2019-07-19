import Web3 from 'web3';
import { observable, computed, action } from 'mobx';
import { Contract, EventData } from 'web3-eth-contract';
import autobind from 'autobind-decorator';
import BigNumber from 'bignumber.js';

import primeCasinoABI from './primeCasinoABI.json';
import enforcerABI from './enforcerABI.json';
import { Prime, Status, Result } from './types';
import { EventsCache } from './eventsCache';

const RPC_URL = 'wss://goerli.infura.io/ws/v3/f039330d8fb747e48a7ce98f51400d65';
const ENFORCER_ADDR = '0x6949a2a84C9f32C0C905C84686f129a6abC74Ea1';
const PRIME_CASINO_ADDR = '0xdcd195571746500bf0346e862abb217561a3693b';

type Statuses = { [key: string]: Status };
type Results = { [key: string]: Result };
type MyBets = { [key: string]: BigNumber | null };

class Store {
  public web3: Web3;
  public primeCasino: Contract;
  public enforcer: Contract;

  @observable
  public loaded = false;

  @observable.deep
  public primes: Prime[] = [];

  @observable
  public iWeb3: Web3 | null = null;

  @observable
  public minBet: BigNumber | null = null;

  @observable
  public address: string | null = null;

  @observable
  public myBets: { [key: string]: BigNumber } = {};

  private cache: EventsCache;

  @computed
  public get iPrimeCasino() {
    if (!this.iWeb3) {
      return null;
    }

    return new this.iWeb3.eth.Contract(
      primeCasinoABI as any,
      PRIME_CASINO_ADDR
    );
  }

  @computed
  public get iEnforcer() {
    if (!this.iWeb3) {
      return null;
    }

    return new this.iWeb3.eth.Contract(enforcerABI as any, ENFORCER_ADDR);
  }

  constructor() {
    this.web3 = new Web3(RPC_URL);
    this.enforcer = new this.web3.eth.Contract(
      enforcerABI as any,
      ENFORCER_ADDR
    );
    this.primeCasino = new this.web3.eth.Contract(
      primeCasinoABI as any,
      PRIME_CASINO_ADDR
    );
    this.cache = new EventsCache(`events_${this.primeCasino.address}`);

    const injectedProvider = (window as any).ethereum;
    if (injectedProvider) {
      injectedProvider
        .enable()
        .then((addrs: string[]) => {
          this.iWeb3 = new Web3(injectedProvider);
          this.address = addrs[0];
        })
        .finally(() => {
          this.contractsSubscribe();
        });
    } else {
      this.contractsSubscribe();
    }
  }

  private async contractsSubscribe() {
    if (this.cache.events.length > 0) {
      await this.addPrimes(
        this.cache.events.filter(({ event }) => event === 'NewCandidatePrime')
      );
      this.addBets(this.cache.events.filter(({ event }) => event === 'NewBet'));
    }

    this.primeCasino
      .getPastEvents('allEvents', { fromBlock: this.cache.latestBlockSynced })
      .then(async events => {
        const addedEvents = this.cache.add(events);
        await this.addPrimes(
          addedEvents.filter(({ event }) => event === 'NewCandidatePrime')
        );
        this.addBets(addedEvents.filter(({ event }) => event === 'NewBet'));
        this.loaded = true;
      });

    this.primeCasino.events.allEvents(
      { fromBlock: 'latest' },
      (err: any, event: EventData) => {
        const addedEvents = this.cache.add([event]);
        if (event.event === 'NewCandidatePrime') {
          this.addPrimes(addedEvents);
        }
        if (event.event === 'NewBet') {
          this.addBets(addedEvents);
          const index = this.primes.findIndex(prime =>
            prime.number.eq(event.returnValues.number)
          );
          if (index) {
            this.getMyBets(this.primes[index].number).then(myBets => {
              this.primes[index].myBets = myBets;
            });
          }
        }
      }
    );
    this.primeCasino.methods
      .minBet()
      .call()
      .then((minBet: BigNumber) => {
        this.minBet = minBet;
      });

    this.enforcer.events.Registered(
      { fromBlock: 'latest' },
      (err: any, event: EventData) => {
        this.registerResults([event]);
        this.cache.latestBlockSynced = event.blockNumber;
      }
    );
  }

  @autobind
  public newPrime(prime: string): Promise<void> {
    if (this.iPrimeCasino && this.minBet) {
      return this.iPrimeCasino.methods.request(prime).send({
        value: this.minBet,
        from: this.address
      });
    }

    return Promise.reject('Not ready yet');
  }

  public bet(prime: Prime, isPrime: boolean) {
    if (this.iPrimeCasino && this.minBet) {
      this.iPrimeCasino.methods.bet(prime.number.toString(), isPrime).send({
        value: this.minBet,
        from: this.address
      });
    }
  }

  public payout(prime: Prime) {
    if (this.iPrimeCasino) {
      this.iPrimeCasino.methods
        .payout(prime.number.toString())
        .send({
          from: this.address
        })
        .then(() => {
          prime.myBets = null;
        });
    }
  }

  private getResults(events: EventData[]): Promise<Results> {
    return this.enforcer
      .getPastEvents('Registered', {
        fromBlock: 0,
        filter: {
          taskHash: events.map(({ returnValues: { taskHash } }) => taskHash)
        }
      })
      .then(registeredEvents => {
        return registeredEvents.reduce<Results>(
          (results, { returnValues: { taskHash, solverPathRoot, result } }) => {
            results[`${taskHash}-${solverPathRoot}`] = {
              pathRoot: solverPathRoot,
              result
            };
            return results;
          },
          {}
        );
      });
  }

  private getStatuses(events: EventData[]): Promise<Statuses> {
    const batch = new this.web3.BatchRequest();
    events.forEach(({ returnValues: { number } }) => {
      const m = this.primeCasino.methods
        .getStatus(`0x${number.toString(16)}`)
        .call.request();
      m.callback = () => null; // stupid web3 will fail without that :facepalm:
      batch.add(m);
    });
    return batch.execute().then((result: any) => {
      const { response }: { response: any[] } = result;
      return response.reduce((statuses: Statuses, status: any, i) => {
        statuses[events[i].returnValues.number.toString(16)] = {
          challengeEndTime: status._challengeEndTime,
          pathRoots: status._pathRoots
        };

        return statuses;
      }, {});
    });
  }

  private async getMyBets(prime: BigNumber): Promise<BigNumber | null> {
    if (!this.address) {
      return null;
    }

    return this.primeCasino.methods
      .getBet(`0x${prime.toString(16)}`, this.address)
      .call();
  }

  private async getMyBetsBatch(primes: BigNumber[]): Promise<MyBets> {
    if (!this.address) {
      return {};
    }

    const batch = new this.web3.BatchRequest();
    primes.forEach(prime => {
      const m = this.primeCasino.methods
        .getBet(`0x${prime.toString(16)}`, this.address)
        .call.request();
      m.callback = () => null;
      batch.add(m);
    });

    return batch.execute().then((result: any) => {
      console.log(result);
      const { response }: { response: any[] } = result;
      return response.reduce((myBets, bet, i) => {
        myBets[primes[i].toString(16)] = bet;
        return myBets;
      });
    });
  }

  @action
  private async addPrimes(events: EventData[]) {
    const numbers: BigNumber[] = events.map(
      ({ returnValues: { number } }) => number
    );
    Promise.all([this.getStatuses(events), this.getResults(events)]).then(
      ([statuses, results]) => {
        this.getMyBetsBatch(numbers).then(myBets => {
          this.primes.push(
            ...events.map(
              ({ returnValues: { number, taskHash, sumYes, sumNo } }) => {
                const status = statuses[number.toString(16)];
                const numberResults = status.pathRoots
                  .map(pathRoot => results[`${taskHash}-${pathRoot}`])
                  .filter(a => a);
                return {
                  number,
                  taskHash,
                  sumYes,
                  sumNo,
                  status,
                  results: numberResults,
                  myBets: myBets[number.toString(16)]
                };
              }
            )
          );
        });
      }
    );
    // await Promise.all(
    //   events
    //     .filter(
    //       ({ returnValues: { taskHash } }) =>
    //         this.primes.findIndex(p => p.taskHash === taskHash) === -1
    //     )
    //     .map(
    //       async ({
    //         returnValues: { number, taskHash, sumYes, sumNo }
    //       }): Promise<Prime> => {
    //         const status = await this.getStatus(number);
    //         const [results, myBets]: [
    //           Result[],
    //           BigNumber | null
    //         ] = await Promise.all([
    //           this.getResults(taskHash, status.pathRoots),
    //           this.getMyBets(number)
    //         ]);

    //         return {
    //           number,
    //           taskHash,
    //           sumYes,
    //           sumNo,
    //           status,
    //           results,
    //           myBets
    //         };
    //       }
    //     )
    // );
  }

  @action
  private addBets(events: EventData[]) {
    for (const {
      returnValues: { number, sumYes, sumNo }
    } of events) {
      const index = this.primes.findIndex(prime => prime.number.eq(number));
      if (index !== -1) {
        this.primes[index].sumYes = sumYes;
        this.primes[index].sumNo = sumNo;
      }
    }
  }

  @action
  private registerResults(events: EventData[]) {
    for (const {
      returnValues: { solverPathRoot, taskHash, result }
    } of events) {
      console.log({ solverPathRoot, taskHash, result });
      const index = this.primes.findIndex(prime => prime.taskHash === taskHash);
      this.primes[index].results.push(result);
      this.primes[index].status.pathRoots.push(solverPathRoot);
    }
  }
}

export const store = new Store();
