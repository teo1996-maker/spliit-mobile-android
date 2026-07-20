import {
  ErrorMessage,
  FormGroup,
  FormSection,
  FormSectionTitle,
  HelpText,
  Label,
  TextInput,
} from '@/components/form'
import { cn } from '@/utils/cn'
import { bgBrand } from '@/utils/colors'
import {
  ClientCertificateInfo,
  getCertificateInfo,
  importCertificate,
  isMtlsSupported,
  removeCertificate,
} from '@/modules/spliit-mtls'
import * as DocumentPicker from 'expo-document-picker'
import { useEffect, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'

function certificateLabel(info: ClientCertificateInfo): string {
  const cn = info.subject?.match(/CN=([^,]+)/)?.[1]
  return cn ?? info.subject ?? 'Client certificate'
}

export function ClientCertSection() {
  const [certInfo, setCertInfo] = useState<ClientCertificateInfo | null>(null)
  const [pickedUri, setPickedUri] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    getCertificateInfo().then(setCertInfo)
  }, [])

  if (!isMtlsSupported) return null

  const pickCertificate = async () => {
    setError(null)
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    })
    const asset = result.assets?.[0]
    if (!asset) return
    setPassword('')
    setPickedUri(asset.uri)
  }

  const confirmImport = async () => {
    if (!pickedUri) return
    setIsImporting(true)
    setError(null)
    try {
      const info = await importCertificate(pickedUri, password)
      setCertInfo(info)
      setPickedUri(null)
    } catch (e) {
      setError(
        'Could not load the certificate. Check that the file is a valid ' +
          'PKCS#12 (.p12/.pfx) and the password is correct.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  const remove = async () => {
    await removeCertificate()
    setCertInfo(null)
    setError(null)
  }

  return (
    <>
      <FormSectionTitle>Client certificate (mTLS)</FormSectionTitle>
      <FormSection>
        <FormGroup>
          {certInfo ? (
            <>
              <Label>{certificateLabel(certInfo)}</Label>
              {certInfo.notAfter && (
                <HelpText>Expires: {certInfo.notAfter}</HelpText>
              )}
              <Pressable
                onPress={remove}
                className="bg-red-600 rounded-lg px-4 py-2 mt-2 flex-row justify-center active:opacity-60"
              >
                <Text className="text-white text-lg font-semibold">
                  Remove certificate
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={pickCertificate}
                className={cn(
                  bgBrand,
                  'rounded-lg px-4 py-2 flex-row justify-center active:opacity-60',
                )}
              >
                <Text className="text-white text-lg font-semibold">
                  Import certificate (.p12)
                </Text>
              </Pressable>
              <HelpText>
                If your self-hosted instance requires a client certificate
                (e.g. Cloudflare mTLS), import a PKCS#12 file here. It will be
                presented automatically when the server requests it.
              </HelpText>
            </>
          )}
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </FormGroup>
      </FormSection>

      <Modal
        animationType="fade"
        transparent
        visible={pickedUri !== null}
        onRequestClose={() => setPickedUri(null)}
      >
        <View className="h-full relative justify-center p-2">
          <Pressable
            onPress={() => setPickedUri(null)}
            className="absolute top-0 bottom-0 right-0 left-0 bg-gray-500 opacity-80"
          />
          <View className="p-4 bg-white border border-gray-200 rounded-lg gap-2">
            <Label>Certificate password</Label>
            <TextInput
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
              placeholder="PKCS#12 password"
            />
            <View className="flex-row gap-4 justify-end mt-2">
              <Pressable
                className="px-4 py-2 rounded-lg active:opacity-60"
                onPress={() => setPickedUri(null)}
              >
                <Text className="text-lg font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                disabled={isImporting}
                style={{ opacity: isImporting ? 0.5 : undefined }}
                className={cn(bgBrand, 'px-4 py-2 rounded-lg active:opacity-60')}
                onPress={confirmImport}
              >
                <Text className="text-white text-lg font-semibold">
                  {isImporting ? 'Importing…' : 'Import'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}
