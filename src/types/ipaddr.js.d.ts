declare module "ipaddr.js" {
  export type IPv4 = {
    kind(): "ipv4";
    toString(): string;
    toByteArray(): number[];
  };
  export type IPv6 = {
    kind(): "ipv6";
    toString(): string;
    toNormalizedString(): string;
    toByteArray(): number[];
  };
  export type IP = IPv4 | IPv6;

  export function parse(input: string): IP;
  export function parseCIDR(input: string): [IP, number];
  export function subnetMaskFromPrefixLength(length: number): IPv4;
}
