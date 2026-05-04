/** Claims embedded in the access token. */
export type JwtPayload = {
  sub: string;
  email: string;
  role: string | null;
  /** Must equal `User.tokenVersion` at validation time. */
  tv: number;
};
