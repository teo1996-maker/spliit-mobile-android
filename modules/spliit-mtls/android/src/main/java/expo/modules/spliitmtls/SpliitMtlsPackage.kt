package expo.modules.spliitmtls

import android.app.Application
import android.content.Context
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package
import java.security.KeyStore
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager
import okhttp3.OkHttpClient

/**
 * Installs an OkHttp client factory that presents the imported client
 * certificate during the TLS handshake (mutual TLS), e.g. for Spliit
 * instances protected by Cloudflare mTLS.
 *
 * Registered automatically by Expo autolinking; runs before React Native
 * creates its networking client, so every fetch/tRPC request goes through it.
 */
class SpliitMtlsPackage : Package {
  override fun createApplicationLifecycleListeners(context: Context?): List<ApplicationLifecycleListener> =
    listOf(object : ApplicationLifecycleListener {
      override fun onCreate(application: Application) {
        ClientCertStore.initialize(application)
        OkHttpClientProvider.setOkHttpClientFactory(MtlsOkHttpClientFactory())
      }
    })
}

class MtlsOkHttpClientFactory : OkHttpClientFactory {
  override fun createNewNetworkModuleClient(): OkHttpClient {
    // System default trust manager (standard CA validation stays untouched).
    val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
    tmf.init(null as KeyStore?)
    val trustManager = tmf.trustManagers.filterIsInstance<X509TrustManager>().first()

    // SSLContext bound to the dynamic key manager: the client certificate is
    // only presented when the server requests one during the handshake.
    val sslContext = SSLContext.getInstance("TLS")
    sslContext.init(arrayOf(ClientCertStore.keyManager), arrayOf(trustManager), null)

    // React Native's default client configuration + our SSL socket factory.
    val client = OkHttpClientProvider.createClientBuilder()
      .sslSocketFactory(sslContext.socketFactory, trustManager)
      .build()

    // When the certificate changes, drop pooled connections so the next
    // request performs a fresh handshake with the new identity.
    ClientCertStore.onCertificateChanged = {
      client.connectionPool.evictAll()
    }

    return client
  }
}
