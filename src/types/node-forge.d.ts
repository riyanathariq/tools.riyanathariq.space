declare module "node-forge" {
  namespace pki {
    interface CertificateField {
      shortName?: string;
      name?: string;
      value: string;
    }

    interface Certificate {
      subject: { attributes: CertificateField[] };
      issuer: { attributes: CertificateField[] };
      serialNumber: string;
      validity: { notBefore: Date; notAfter: Date };
      getExtension(name: string): unknown;
    }

    function certificateFromPem(pem: string): Certificate;
    function certificateToAsn1(cert: Certificate): unknown;
  }

  namespace asn1 {
    function toDer(obj: unknown): { getBytes(): string };
  }

  namespace md {
    namespace sha256 {
      function create(): { update(bytes: string): void; digest(): { toHex(): string } };
    }
  }

  const pki: typeof pki;
  const asn1: typeof asn1;
  const md: typeof md;

  export default { pki, asn1, md };
}
