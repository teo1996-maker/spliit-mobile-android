package expo.modules.spliitmtls

import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class InvalidCertificateException(cause: Throwable?) :
  CodedException("ERR_MTLS_INVALID_CERT", "Could not load the certificate. Check that the file is a valid PKCS#12 (.p12/.pfx) and the password is correct.", cause)

class SpliitMtlsModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("SpliitMtls")

    /**
     * Import a PKCS#12 client certificate from a content:// or file:// URI
     * (as returned by a document picker). Validates the password before
     * persisting. Returns { subject, issuer, notAfter }.
     */
    AsyncFunction("importCertificate") { uri: String, password: String ->
      val bytes = context.contentResolver.openInputStream(Uri.parse(uri))?.use { it.readBytes() }
        ?: throw InvalidCertificateException(null)
      try {
        ClientCertStore.importCertificate(context, bytes, password)
      } catch (e: Exception) {
        throw InvalidCertificateException(e)
      }
    }

    /** Remove the stored client certificate and disable mTLS. */
    AsyncFunction("removeCertificate") {
      ClientCertStore.removeCertificate(context)
    }

    /** Info about the installed certificate, or null when none is set. */
    AsyncFunction("getCertificateInfo") {
      ClientCertStore.certificateInfo(context)
    }
  }
}
