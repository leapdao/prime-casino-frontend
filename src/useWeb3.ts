import { useEffect, useState } from 'react';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract/types';

export const useWeb3 = (provider: any) => {
  const [web3, setWeb3] = useState<Web3>(new Web3(provider));
  useEffect(() => {
    setWeb3(new Web3(provider));
  }, [provider]);

  return web3;
};

export const useInjectedWeb3 = (): [Web3 | null, string | null] => {
  const [iWeb3, setiWeb3] = useState<Web3 | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => {
    const injectedProvider = (window as any).ethereum;
    if (injectedProvider) {
      injectedProvider.enable().then((addrs: string[]) => {
        setiWeb3(new Web3(injectedProvider));
        setAddress(addrs[0]);
      });
    }
  }, []);

  return [iWeb3, address];
};

export const useInjectedContract = (
  iWeb3: Web3 | null,
  abi: any,
  address: string
) => {
  const [contract, setContract] = useState<Contract | null>(null);
  useEffect(() => {
    if (iWeb3) {
      setContract(new iWeb3.eth.Contract(abi, address));
    }
  }, [iWeb3, abi, address]);

  return contract;
};

export const useContract = (web3: Web3, abi: any, address: string) => {
  const [contract, setContract] = useState<Contract>(
    new web3.eth.Contract(abi, address)
  );
  useEffect(() => {
    setContract(new web3.eth.Contract(abi, address));
  }, [web3, abi, address]);

  return contract;
};
