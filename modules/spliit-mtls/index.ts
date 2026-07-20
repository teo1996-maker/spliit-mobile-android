import { requireNativeModule } from 'expo-modules-core'
import { Platform } from 'react-native'

export type ClientCertificateInfo = {
  subject: string | null
  issuer: string | null
  notAfter: string | null
}

type SpliitMtlsModule = {
  importCertificate(uri: string, password: string): Promise<ClientCertificateInfo>
  removeCertificate(): Promise<void>
  getCertificateInfo(): Promise<ClientCertificateInfo | null>
}

const nativeModule: SpliitMtlsModule | null =
  Platform.OS === 'android' ? requireNativeModule<SpliitMtlsModule>('SpliitMtls') : null

/** Whether client certificate (mTLS) support is available on this platform. */
export const isMtlsSupported = nativeModule !== null

/**
 * Import a PKCS#12 (.p12/.pfx) client certificate. It will be presented
 * automatically on every request when the server (e.g. Cloudflare) asks
 * for a client certificate during the TLS handshake.
 */
export async function importCertificate(
  uri: string,
  password: string,
): Promise<ClientCertificateInfo> {
  if (!nativeModule) throw new Error('mTLS is only supported on Android')
  return nativeModule.importCertificate(uri, password)
}

/** Remove the stored client certificate. */
export async function removeCertificate(): Promise<void> {
  await nativeModule?.removeCertificate()
}

/** Currently installed certificate info, or null. */
export async function getCertificateInfo(): Promise<ClientCertificateInfo | null> {
  if (!nativeModule) return null
  return nativeModule.getCertificateInfo()
}
