export enum Codes {
  USER_NOT_FOUND = 'User not found',
  THROTTLE = 'ThrottlerException: Too Many Requests',
  JWT_FAILED = 'JWT failed verification',
}

export enum AuthLogin {
  INCORRECT_PASSWORD = 'Incorrect password',
}

export enum AuthRegister {
  USERNAME_TAKEN = 'Username taken',
  EMAIL_TAKEN = 'Email taken',
}

export enum AuthPasswordChange {
  WRONG_PASSWORD = 'Wrong password',
  NO_PASSWORD_WHEN_EXPECTED = 'No password for account when expected',
}

export enum JwtErrors {
  NO_HEADER = 'No Authorization header found',
  NO_BEARER = `Authorization header does not start with 'Bearer '`,
}
