import { trpc } from '@/utils/trpc'
import {
  Stack,
  useGlobalSearchParams,
  useLocalSearchParams,
  useRouter,
} from 'expo-router'
import { useEffect, useState } from 'react'
import { Button } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { BRAND_COLOR } from '@/utils/colors'
import { ExpenseForm } from '@/components/expense-form'
import { TrackScreen, useAnalytics } from '@/components/analytics'
import {
  ExpenseDefaults,
  getExpenseDefaults,
  saveExpenseDefaults,
} from '@/utils/expenseDefaults'

export default function ExpenseScreen() {
  const router = useRouter()
  const { groupId } = useGlobalSearchParams<{
    groupId: string
  }>()

  const params = useLocalSearchParams()

  const { data: groupData } = trpc.groups.get.useQuery({ groupId })

  const { mutateAsync } = trpc.groups.expenses.create.useMutation()
  const utils = trpc.useUtils()
  const analytics = useAnalytics()

  // Load the last-used per-group defaults before mounting the form, since
  // react-hook-form only reads defaultValues once on mount.
  const [defaults, setDefaults] = useState<ExpenseDefaults | null | undefined>(
    undefined
  )
  useEffect(() => {
    let active = true
    getExpenseDefaults(groupId).then((loaded) => {
      if (active) setDefaults(loaded)
    })
    return () => {
      active = false
    }
  }, [groupId])

  return (
    <>
      <TrackScreen screenName="group-create-expense" eventProps={{ groupId }} />
      <Stack.Screen
        options={{
          title: 'Add expense',
          headerRight: () => (
            <Button
              title="Cancel"
              color={BRAND_COLOR}
              onPress={() => router.back()}
            />
          ),
        }}
      />
      <SafeAreaProvider>
        <SafeAreaView edges={['top']} className="flex-1 bg-white">
          <KeyboardAwareScrollView bottomOffset={20}>
            {groupData?.group && defaults !== undefined && (
              <ExpenseForm
                expense={null}
                reimbursementParams={
                  params.isReimbursement
                    ? {
                        title: params.title as string,
                        paidBy: params.paidBy as string,
                        paidFor: params.paidFor as string,
                        amount: Number(params.amount),
                      }
                    : undefined
                }
                defaults={defaults}
                group={groupData.group}
                onSave={async (expenseFormValues) => {
                  await mutateAsync({ groupId, expenseFormValues })
                  // Remember the split settings for the next expense.
                  await saveExpenseDefaults(groupId, {
                    paidBy: expenseFormValues.paidBy,
                    splitMode: expenseFormValues.splitMode,
                    paidFor: expenseFormValues.paidFor,
                  })
                  await utils.groups.invalidate()
                  analytics.trackEvent({
                    eventName: 'create-expense',
                    eventProps: { groupId },
                  })
                  router.back()
                }}
              />
            )}
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </>
  )
}
