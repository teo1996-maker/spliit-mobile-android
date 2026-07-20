import { TrackScreen } from '@/components/analytics'
import {
  ErrorMessage,
  FormGroup,
  FormSection,
  HelpText,
  Label,
  TextInput,
} from '@/components/form'
import { cn } from '@/utils/cn'
import { BRAND_COLOR, bgBrand } from '@/utils/colors'
import { addRecentGroup } from '@/utils/recentGroups'
import { useSettings } from '@/utils/settings'
import { trpc } from '@/utils/trpc'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { Button, Pressable, Text, View } from 'react-native'

export default function AddGroupByUrlModal() {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const {
    settings: { baseUrl },
  } = useSettings()

  return (
    <>
      <TrackScreen screenName="add-group-by-url" />
      <Stack.Screen
        options={{
          title: 'Add group by URL',
          headerRight: () => (
            <Button
              title="Cancel"
              color={BRAND_COLOR}
              onPress={() => router.back()}
            />
          ),
        }}
      />
      <View className="pt-4 bg-white h-full">
        <FormSection>
          <FormGroup>
            <Label>Group URL</Label>
            <TextInput
              hasError={!!error}
              keyboardType="url"
              autoComplete="url"
              autoCorrect={false}
              autoCapitalize="none"
              placeholder={`${baseUrl}...`}
              value={url}
              onChangeText={(text) => setUrl(text)}
            />
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <HelpText>
              If a group was shared with you, you can paste its URL here to add
              it to your list.
            </HelpText>
          </FormGroup>
        </FormSection>
        <View className="flex-row mt-2 mb-10 px-4">
          <Pressable
            disabled={isPending}
            onPress={async () => {
              setIsPending(true)
              setError(null)
              try {
                const parsed = parseGroupUrl(url)
                if (!parsed) {
                  setError('The URL is not a valid group URL.')
                  return
                }
                if (parsed.origin !== new URL(baseUrl).origin) {
                  setError(
                    `This group is hosted on ${parsed.origin}, but the app ` +
                      `is configured for ${new URL(baseUrl).origin}. Update ` +
                      'the Base URL in the settings (About tab) first.',
                  )
                  return
                }
                const data = await utils.groups.get.fetch({
                  groupId: parsed.groupId,
                })
                if (data.group) {
                  await addRecentGroup({
                    groupId: data.group.id,
                    groupName: data.group.name,
                  })
                  router.back()
                } else {
                  setError('No group found at this URL.')
                }
              } catch (e) {
                setError(
                  'Could not reach the server. Check the Base URL in the ' +
                    'settings, your connection, and the client certificate ' +
                    'if your instance requires one.',
                )
              } finally {
                setIsPending(false)
              }
            }}
            className={cn(
              bgBrand,
              'flex-1 flex-row justify-center rounded-lg px-4 py-2 active:opacity-60',
            )}
          >
            <Text className="text-white text-lg font-semibold">
              {isPending ? 'Adding…' : 'Add'}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  )
}

function parseGroupUrl(urlString: string) {
  try {
    const url = new URL(urlString.trim())
    const [, groupId] = url.pathname.match(/^\/groups\/([^/]+)/) ?? []
    if (!groupId) return null
    return { groupId, origin: url.origin }
  } catch {
    return null
  }
}
