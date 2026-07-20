package expo.modules.spliitmtls

import android.content.Context
import java.io.File
import java.net.Socket
import java.security.KeyStore
import java.security.Principal
import java.security.PrivateKey
import java.security.cert.X509Certificate
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.X509KeyManager

/**
 * Holds the client certificate (PKCS#12) used for mutual TLS.
 *
 * The certificate file and its password live in the app's private storage.
 * A [DynamicKeyManager] delegates to the currently loaded keystore, so the
 * certificate can be imported or removed at runtime without restarting the
 * app: new TLS handshakes immediately pick up the change.
 */
object ClientCertStore {
  private const val PREFS_NAME = "spliit_mtls"
  private const val PREF_PASSWORD = "p12_password"
  private const val CERT_FILE_NAME = "client-cert.p12"

  @Volatile
  private var delegate: X509KeyManager? = null

  /** Key manager installed once into the app's SSLContext. */
  val keyManager: X509KeyManager = DynamicKeyManager()

  /** Called when the certificate changes so pooled connections are not reused. */
  @Volatile
  var onCertificateChanged: (() -> Unit)? = null

  private fun certFile(context: Context) = File(context.filesDir, CERT_FILE_NAME)

  /** Load the persisted certificate at startup, if any. */
  @Synchronized
  fun initialize(context: Context) {
    val file = certFile(context)
    if (!file.exists()) return
    val password = prefs(context).getString(PREF_PASSWORD, null) ?: return
    try {
      delegate = loadKeyManager(file, password)
    } catch (e: Exception) {
      // Corrupted or stale entry: leave mTLS disabled instead of crashing startup.
      delegate = null
    }
  }

  /**
   * Validate and install a PKCS#12 certificate from [bytes].
   * Returns info about the installed certificate.
   * Throws if the file/password combination is invalid.
   */
  @Synchronized
  fun importCertificate(context: Context, bytes: ByteArray, password: String): Map<String, String?> {
    val file = certFile(context)
    file.writeBytes(bytes)
    try {
      delegate = loadKeyManager(file, password)
    } catch (e: Exception) {
      file.delete()
      throw e
    }
    prefs(context).edit().putString(PREF_PASSWORD, password).apply()
    onCertificateChanged?.invoke()
    return certificateInfo(context) ?: emptyMap()
  }

  @Synchronized
  fun removeCertificate(context: Context) {
    certFile(context).delete()
    prefs(context).edit().remove(PREF_PASSWORD).apply()
    delegate = null
    onCertificateChanged?.invoke()
  }

  @Synchronized
  fun certificateInfo(context: Context): Map<String, String?>? {
    val km = delegate ?: return null
    val alias = km.getClientAliases("RSA", null)?.firstOrNull()
      ?: km.getClientAliases("EC", null)?.firstOrNull()
      ?: return null
    val cert = km.getCertificateChain(alias)?.firstOrNull() ?: return null
    return mapOf(
      "subject" to cert.subjectX500Principal?.name,
      "issuer" to cert.issuerX500Principal?.name,
      "notAfter" to cert.notAfter?.toString(),
    )
  }

  fun isEnabled(): Boolean = delegate != null

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  private fun loadKeyManager(file: File, password: String): X509KeyManager {
    val keyStore = KeyStore.getInstance("PKCS12")
    file.inputStream().use { keyStore.load(it, password.toCharArray()) }
    val kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
    kmf.init(keyStore, password.toCharArray())
    return kmf.keyManagers.filterIsInstance<X509KeyManager>().firstOrNull()
      ?: throw IllegalStateException("No X509KeyManager for the provided PKCS#12 file")
  }

  /** Delegates every call to the currently installed key manager (if any). */
  private class DynamicKeyManager : X509KeyManager {
    override fun chooseClientAlias(keyType: Array<out String>?, issuers: Array<out Principal>?, socket: Socket?): String? =
      delegate?.chooseClientAlias(keyType, issuers, socket)

    override fun chooseServerAlias(keyType: String?, issuers: Array<out Principal>?, socket: Socket?): String? =
      delegate?.chooseServerAlias(keyType, issuers, socket)

    override fun getClientAliases(keyType: String?, issuers: Array<out Principal>?): Array<String>? =
      delegate?.getClientAliases(keyType, issuers)

    override fun getServerAliases(keyType: String?, issuers: Array<out Principal>?): Array<String>? =
      delegate?.getServerAliases(keyType, issuers)

    override fun getCertificateChain(alias: String?): Array<X509Certificate>? =
      delegate?.getCertificateChain(alias)

    override fun getPrivateKey(alias: String?): PrivateKey? =
      delegate?.getPrivateKey(alias)
  }
}
