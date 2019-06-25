import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Text, Box } from 'rebass';
import { store } from './store';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { Prime } from './types';

const PrimeInput = styled.input`
  font-size: 14px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin: 0 10px 0 0;
`;

const Form = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  position: relative;
`.withComponent('form');

const Error = styled(Text)`
  position: absolute;
  top: 100%;
  margin-top: 5px;
  color: #d00;
`;

type Props = {
  onSubmit: (number: string) => void;
};

const MAX_NUMBER = new BigNumber(2).pow(256);

const getError = (value: string, primes: Prime[]) => {
  if (MAX_NUMBER.lt(value)) {
    return 'Too big number (> 2^256)';
  }

  if (!value) {
    return 'Required';
  }

  if (primes.findIndex(p => p.prime.eq(value)) !== -1) {
    return 'Number is proposed already';
  }

  return null;
};

export const PrimeForm: React.FC<Props> = observer(({ onSubmit }) => {
  const [value, setValue] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const error = getError(value, store.primes);

  const handleNewPrimeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!error) {
      onSubmit(value);
    } else {
      setShowErrors(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const disabled = showErrors && !!error;

  return (
    <Form onSubmit={handleNewPrimeSubmit}>
      <PrimeInput onChange={handleChange} value={value} placeholder="Number" />
      <Button
        type="submit"
        disabled={disabled}
        bg={disabled ? '#ccc' : undefined}
      >
        New prime
      </Button>

      {showErrors && <Error>{error}</Error>}
    </Form>
  );
});
