import Web3 from 'web3';
import { observable, computed, action, autorun, toJS } from 'mobx';
import { Contract, EventData } from 'web3-eth-contract';
import autobind from 'autobind-decorator';
import BigNumber from 'bignumber.js';

import primeCasinoABI from './primeCasinoABI.json';
import enforcerMockABI from './enforcerMockABI.json';
import { Prime, Status, Result } from './types.js';

const RPC_URL = 'wss://goerli.infura.io/ws/v3/f039330d8fb747e48a7ce98f51400d65';
const ENFORCER_MOCK_ADDR = '0x5861278f6cfda2aaa7642b1246e2661835f1287a';
const PRIME_CASINO_ADDR = '0x9e9466e7d739242d342d094b8f061df9106809af';

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

  @observable
  public latestBlockSynced = 0;

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
    this.restore();

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

    autorun(this.autosave);
  }

  private restore() {
    const cache = JSON.parse(
      localStorage.getItem(`cache_${this.primeCasino.address}`) || '{}'
    );
    if (cache.primes) {
      this.primes = cache.primes.map(
        ({ prime, status, sumYes, sumNo, myBets, ...rest }: any) => ({
          ...rest,
          prime: new BigNumber(prime),
          status: {
            challengeEndTime: new BigNumber(status.challengeEndTime),
            pathRoots: status.pathRoots
          },
          sumYes: new BigNumber(sumYes),
          sumNo: new BigNumber(sumNo),
          myBets: myBets && new BigNumber(myBets)
        })
      );
      this.latestBlockSynced = cache.latestBlockSynced;
    }
  }

  @autobind
  private autosave() {
    localStorage.setItem(
      `cache_${this.primeCasino.address}`,
      JSON.stringify({
        primes: toJS(
          this.primes.map(
            ({ number, status, sumYes, sumNo, myBets, ...rest }) => ({
              ...rest,
              number: number.toString(),
              status: {
                challengeEndTime: status.challengeEndTime.toString(),
                pathRoots: status.pathRoots
              },
              sumYes: sumYes.toString(),
              sumNo: sumNo.toString(),
              myBets: myBets && myBets.toString()
            })
          )
        ),
        latestBlockSynced: this.latestBlockSynced
      })
    );
  }

  private contractsSubscribe() {
    this.primeCasino
      .getPastEvents('allEvents', { fromBlock: this.latestBlockSynced })
      .then(async events => {
        await this.addPrimes(
          events.filter(({ event }) => event === 'NewCandidatePrime')
        );
        this.addBets(events.filter(({ event }) => event === 'NewBet'));
        this.latestBlockSynced =
          events.length > 0 ? events[events.length - 1].blockNumber : 0;
        this.loaded = true;
      });

    this.primeCasino.events.allEvents(
      { fromBlock: 'latest' },
      (err: any, event: EventData) => {
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
        this.latestBlockSynced = event.blockNumber;
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
      .getStatus(number)
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
        .map(async ({ returnValues: { number, taskHash, sumYes, sumNo } }) => {
          const status = await this.getStatus(number);
          const [results, myBets]: [
            Result[],
            BigNumber | null
          ] = await Promise.all([
            this.getResults(taskHash, status.pathRoots),
            this.getMyBets(number)
          ]);

          return {
            prime: number,
            taskHash: taskHash,
            sumYes: sumYes,
            sumNo: sumNo,
            status,
            results,
            myBets
          };
        })
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
