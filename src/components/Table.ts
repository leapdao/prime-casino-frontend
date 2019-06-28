import styled from 'styled-components';

export const Table = styled.table`
  border-collapse: collapse;

  th {
    text-align: left;
  }

  th,
  td {
    padding: 10px;
    padding-left: 0;
  }

  td {
    border-top: 1px solid #ccc;
  }
`;
