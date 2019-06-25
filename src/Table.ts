import styled from 'styled-components';

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
