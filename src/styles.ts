import styled, { createGlobalStyle } from 'styled-components';
import { Box, Button, Text } from 'rebass';

export const Global = createGlobalStyle`
  * {
    box-sizing: border-box;
  }
`;

export const Container = styled(Box)`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

export const IntroText = styled(Text)`
  & + & {
    margin-top: 10px;
  }
`;

export const Header = styled(Box)`
  width: 70%;
  margin-bottom: 20px;
`;

export const Divider = styled.hr`
  border: 0;
  border-bottom: 1px solid #ccc;
  margin: 30px 0;
`;

export const PrimeInput = styled.input`
  font-size: 14px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin: 0 10px 0 0;
`;

export const Form = styled(Box)`
  display: flex;
`.withComponent('form');

export const Table = styled.table`
  border-collapse: collapse;

  th {
    text-align: left;
  }

  th,
  td {
    padding-right: 10px;
    padding-bottom: 10px;
    padding-top: 10px;
  }

  td {
    border-top: 1px solid #ccc;
  }
`;

export const StakeButton = styled(Button)`
  padding: 0 8px 0 12px;
  text-align: center;
  height: 30px;
  font-size: 14px;
  background-color: transparent;
  border: 1px solid #0000ff;
  color: #000000;

  & + & {
    margin-left: 10px;
  }
`;
