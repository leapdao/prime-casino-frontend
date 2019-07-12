import Web3 from 'web3';
import { observable, computed, action } from 'mobx';
import { Contract, EventData } from 'web3-eth-contract';
import autobind from 'autobind-decorator';
import BigNumber from 'bignumber.js';

import primeCasinoABI from './primeCasinoABI.json';
import enforcerMockABI from './enforcerMockABI.json';
import { Prime, Status, Result } from './types';
import { EventsCache } from './eventsCache';

const RPC_URL = 'wss://goerli.infura.io/ws/v3/f039330d8fb747e48a7ce98f51400d65';
const ENFORCER_MOCK_ADDR = '0x717dcacb345bbf5a1d619da62e37b8136e389379';
const PRIME_CASINO_ADDR = '0x707c1df388d9f8889e4e882fa14b25ee7f0dd724';

class Store {
  public web3: Web3;
  public primeCasino: Contract;
  public enforcerMock: Contract;

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
  public get iEnforcerMock() {
    if (!this.iWeb3) {
      return null;
    }

    return new this.iWeb3.eth.Contract(
      enforcerMockABI as any,
      ENFORCER_MOCK_ADDR
    );
  }

  constructor() {
    this.web3 = new Web3(RPC_URL);
    this.enforcerMock = new this.web3.eth.Contract(
      enforcerMockABI as any,
      ENFORCER_MOCK_ADDR
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
    this.primeCasino.methods
      .primeTester()
      .call()
      .then(console.log);
    this.primeCasino
      .getPastEvents('allEvents', { fromBlock: this.cache.latestBlockSynced })
      .then(async events => {
        this.cache.add(events);
        await this.addPrimes(
          events.filter(({ event }) => event === 'NewCandidatePrime')
        );
        this.addBets(events.filter(({ event }) => event === 'NewBet'));
        this.loaded = true;
      });

    this.primeCasino.events.allEvents(
      { fromBlock: 'latest' },
      (err: any, event: EventData) => {
        this.cache.add([event]);
        if (event.event === 'NewCandidatePrime') {
          this.addPrimes([event]);
        }
        if (event.event === 'NewBet') {
          this.addBets([event]);
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

    this.enforcerMock.events.Registered(
      { fromBlock: 'latest' },
      (err: any, event: EventData) => {
        this.registerResults([event]);
        this.cache.latestBlockSynced = event.blockNumber;
      }
    );
  }

  @autobind
  public newPrime(prime: string) {
    if (this.iPrimeCasino && this.minBet) {
      this.iPrimeCasino.methods.request(prime).send({
        value: this.minBet,
        from: this.address
      });
    }
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

  private getResults(taskHash: string, pathRoots: string[]) {
    return Promise.all(
      pathRoots.map(pathRoot => {
        return this.enforcerMock
          .getPastEvents('Registered', {
            fromBlock: 0,
            filter: {
              _taskHash: taskHash,
              _pathRoot: pathRoot
            }
          })
          .then(([{ returnValues: { _pathRoot, result } }]) => {
            return {
              pathRoot: _pathRoot,
              result
            };
          });
      })
    );
  }

  private getStatus(number: BigNumber): Promise<Status> {
    return this.primeCasino.methods
      .getStatus(number.toString())
      .call()
      .then((status: any) => ({
        challengeEndTime: status._challengeEndTime,
        pathRoots: status._pathRoots
      }));
  }

  private async getMyBets(prime: BigNumber): Promise<BigNumber | null> {
    if (!this.address) {
      return null;
    }

    return this.primeCasino.methods
      .getBet(prime.toString(), this.address)
      .call();
  }

  @action
  private async addPrimes(events: EventData[]) {
    const updates: any[] = await Promise.all(
      events
        .filter(
          ({ returnValues: { taskHash } }) =>
            this.primes.findIndex(p => p.taskHash === taskHash) === -1
        )
        .map(
          async ({
            returnValues: { number, taskHash, sumYes, sumNo }
          }): Promise<Prime> => {
            const status = await this.getStatus(number);
            const [results, myBets]: [
              Result[],
              BigNumber | null
            ] = await Promise.all([
              this.getResults(taskHash, status.pathRoots),
              this.getMyBets(number)
            ]);

            return {
              number,
              taskHash,
              sumYes,
              sumNo,
              status,
              results,
              myBets
            };
          }
        )
    );

    this.primes.push(...updates);
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
      returnValues: { _taskHash, result, _pathRoot }
    } of events) {
      const index = this.primes.findIndex(
        prime => prime.taskHash === _taskHash
      );
      this.primes[index].results.push(result);
      this.primes[index].status.pathRoots.push(_pathRoot);
    }
  }
}

export const store = new Store();
