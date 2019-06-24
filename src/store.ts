import Web3 from 'web3';
import { observable, computed, action, runInAction } from 'mobx';
import { Contract, EventData } from 'web3-eth-contract';

import primeCasinoABI from './primeCasinoABI.json';
import enforcerMockABI from './enforcerMockABI.json';
import { Prime, Status } from './types.js';
import BigNumber from 'bignumber.js';

const RPC_URL = 'wss://goerli.infura.io/ws/v3/f039330d8fb747e48a7ce98f51400d65';
const ENFORCER_MOCK_ADDR = '0x3339e0bde0170b7e49f55ef93460f2c7cad7469c';
const PRIME_CASINO_ADDR = '0x67e39702669b74bb3d5cb5b2c9f17b3c45f14d56';

class Store {
  public web3: Web3;
  public primeCasino: Contract;
  public enforcerMock: Contract;

  @observable.deep
  public primes: Prime[] = [];

  @observable
  public iWeb3: Web3 | null = null;

  @observable
  public minBet: BigNumber | null = null;

  @observable
  public address: string | null = null;

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

    this.primeCasino
      .getPastEvents('allEvents', { fromBlock: 0 })
      .then(async events => {
        await this.addPrimes(
          events.filter(({ event }) => event === 'NewCandidatePrime')
        );
        this.addBets(events.filter(({ event }) => event === 'NewBet'));
      });

    this.primeCasino.events.allEvents(
      { fromBlock: 'latest' },
      (err: any, event: EventData) => {
        if (event.event === 'NewCandidatePrime') {
          this.addPrimes([event]);
        }
        if (event.event === 'NewBet') {
          this.addBets([event]);
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
      }
    );

    const injectedProvider = (window as any).ethereum;
    if (injectedProvider) {
      injectedProvider.enable().then((addrs: string[]) => {
        this.iWeb3 = new Web3(injectedProvider);
        this.address = addrs[0];
      });
    }
  }

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
      this.iPrimeCasino.methods.bet(prime.prime, isPrime).send({
        value: this.minBet,
        from: this.address
      });
    }
  }

  public registerResult(prime: Prime) {
    if (this.iEnforcerMock) {
      const path =
        '0x1100000000000000000000000000000000000000000000000000000000000011';
      this.iEnforcerMock.methods
        .registerResult(prime.taskHash, path, '0x00')
        .send({ from: this.address });
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
          .then(events => {
            return {
              pathRoot: events[0].returnValues._taskHash,
              result: events[0].returnValues.result
            };
          });
      })
    );
  }

  private getStatus(number: BigNumber): Promise<Status> {
    return this.primeCasino.methods
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
  }

  @action
  private async addPrimes(events: EventData[]) {
    const updates: any[] = [];
    for (const event of events) {
      const status = await this.getStatus(event.returnValues.number);
      const results = await this.getResults(
        event.returnValues.taskHash,
        status.pathRoots
      );
      updates.push([event, status, results]);
    }
    runInAction(() => {
      for (const [event, status, results] of updates) {
        this.primes.push({
          prime: event.returnValues.number,
          taskHash: event.returnValues.taskHash,
          sumYes: event.returnValues.sumYes,
          sumNo: event.returnValues.sumNo,
          status,
          results
        });
      }
    });
  }

  @action
  private addBets(events: EventData[]) {
    for (const event of events) {
      const index = this.primes.findIndex(prime =>
        prime.prime.eq(event.returnValues.number)
      );
      if (index !== -1) {
        this.primes[index].sumYes = event.returnValues.sumYes;
        this.primes[index].sumNo = event.returnValues.sumNo;
      }
    }
  }

  @action
  private registerResults(events: EventData[]) {
    for (const event of events) {
      const index = this.primes.findIndex(
        prime => prime.taskHash === event.returnValues._taskHash
      );
      this.primes[index].results.push(event.returnValues.result);
      this.primes[index].status.pathRoots.push(event.returnValues._pathRoot);
    }
  }
}

export const store = new Store();
