import gql from 'graphql-tag';

export const AuthSessionFields = gql`
  fragment AuthSessionFields on AuthSession {
    userId
    roles
    rules
    rememberMe
    exchangeToken
    exchangeTokenExpiresIn
    accessToken
    accessTokenExpiresIn
  }
`;
