import { AuthSessionFields } from '@zen/graphql/fields';
import gql from 'graphql-tag';

export default gql`
  query AuthRefreshSession($data: AuthRefreshSessionInput!) {
    authRefreshSession(data: $data) {
      ...AuthSessionFields
    }
  }

  ${AuthSessionFields}
`;
