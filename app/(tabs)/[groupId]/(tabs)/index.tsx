import { TrackScreen } from '@/components/analytics'
import { cn } from '@/utils/cn'
import { bgBrand, textBrand } from '@/utils/colors'
import { formatCurrency } from '@/utils/formatCurrency'
import { updateRecentGroup } from '@/utils/recentGroups'
import { Expense, trpc } from '@/utils/trpc'
import { FontAwesome6 } from '@expo/vector-icons'
import { MenuView } from '@react-native-menu/menu'
import dayjs from 'dayjs'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AppRouterOutput } from 'spliit-api'
import { match } from 'ts-pattern'

export default function GroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const { data } = trpc.groups.get.useQuery({ groupId })

  useEffect(() => {
    if (data?.group) {
      updateRecentGroup(data.group)
    }
  }, [data])

  if (!data?.group) return null

  return (
    <>
      <TrackScreen screenName="group-expenses" eventProps={{ groupId }} />
      <ExpenseList group={data.group} />
    </>
  )
}

const PAGE_SIZE = 20
const ALL_MONTHS = '__all__'

function ExpenseList({
  group,
}: {
  group: NonNullable<AppRouterOutput['groups']['get']['group']>
}) {
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [monthKey, setMonthKey] = useState<string | null>(null)

  // Debounce the title search so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, fetchNextPage, isFetchingNextPage, isInitialLoading } =
    trpc.groups.expenses.list.useInfiniteQuery(
      {
        groupId: group.id,
        limit: PAGE_SIZE,
        filter: debouncedSearch || undefined,
      },
      { getNextPageParam: ({ nextCursor }) => nextCursor }
    )
  const { mutateAsync: deleteAsync } = trpc.groups.expenses.delete.useMutation()
  const utils = trpc.useUtils()

  const expenses = useMemo(
    () => data?.pages.flatMap((page) => page.expenses) ?? [],
    [data]
  )
  const hasMore = data?.pages.at(-1)?.hasMore ?? false

  // Month filtering is done client-side, so when a month is selected we need
  // every matching expense loaded (expenses are ordered newest-first).
  useEffect(() => {
    if (monthKey && hasMore && !isFetchingNextPage) fetchNextPage()
  }, [monthKey, hasMore, isFetchingNextPage, expenses.length, fetchNextPage])

  // Distinct months present in the loaded expenses (newest first).
  const monthOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const e of expenses) {
      const d = dayjs(e.expenseDate)
      const key = d.format('YYYY-MM')
      if (!seen.has(key)) seen.set(key, d.format('MMMM YYYY'))
    }
    return Array.from(seen, ([key, label]) => ({ key, label }))
  }, [expenses])

  const filteredExpenses = useMemo(
    () =>
      monthKey
        ? expenses.filter((e) => dayjs(e.expenseDate).format('YYYY-MM') === monthKey)
        : expenses,
    [expenses, monthKey]
  )

  const selectedMonthLabel = monthKey
    ? monthOptions.find((m) => m.key === monthKey)?.label ??
      dayjs(`${monthKey}-01`).format('MMMM YYYY')
    : 'All months'

  const hasFilters = debouncedSearch !== '' || monthKey !== null

  // Group expenses into whole-month blocks, newest month first, e.g.
  // "July 2026", "June 2026". Expenses are already ordered newest-first.
  const sections = getMonthlySections(filteredExpenses)

  const addExpense = () =>
    router.push({
      pathname: '/[groupId]/create-expense',
      params: { groupId: group.id },
    })

  const filterControls = (
    <View className="px-4 pt-4 mt-2 bg-white">
      <View className="flex-row justify-between items-baseline mb-3">
        <Text className="font-bold text-lg">Expenses</Text>
        <Pressable className="active:opacity-60" onPress={addExpense}>
          <Text className={cn(textBrand, 'text-lg')}>Add expense</Text>
        </Pressable>
      </View>
      <View className="flex-row gap-2 mb-2">
        <View className="flex-1 flex-row items-center bg-slate-100 rounded-lg px-3">
          <FontAwesome6 name="magnifying-glass" size={14} color="#64748b" />
          <TextInput
            className="flex-1 py-2 pl-2 text-base"
            placeholder="Search by title"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search !== '' && (
            <Pressable
              className="p-1 active:opacity-60"
              onPress={() => setSearch('')}
            >
              <FontAwesome6 name="xmark" size={14} color="#64748b" />
            </Pressable>
          )}
        </View>
        <MenuView
          title="Filter by month"
          onPressAction={({ nativeEvent }) =>
            setMonthKey(
              nativeEvent.event === ALL_MONTHS ? null : nativeEvent.event
            )
          }
          actions={[
            { id: ALL_MONTHS, title: 'All months' },
            ...monthOptions.map((m) => ({ id: m.key, title: m.label })),
          ]}
          shouldOpenOnLongPress={false}
        >
          <View className="flex-row items-center bg-slate-100 rounded-lg px-3 py-2 max-w-[160px]">
            <FontAwesome6 name="calendar" size={13} color="#64748b" />
            <Text
              className={cn(
                'ml-2 mr-1 text-sm',
                monthKey ? textBrand : 'text-slate-600'
              )}
              numberOfLines={1}
            >
              {selectedMonthLabel}
            </Text>
            <FontAwesome6 name="chevron-down" size={10} color="#64748b" />
          </View>
        </MenuView>
      </View>
    </View>
  )

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-white">
        {isInitialLoading ? (
          <View className="h-full flex-col justify-center items-center gap-4">
            <ActivityIndicator size="large" />
            <Text className="text-slate-700">Loading group expensees</Text>
          </View>
        ) : !hasFilters && expenses.length === 0 ? (
          <View className="h-full items-center justify-center">
            <Text className="mb-2 font-bold text-lg text-slate-950">
              Your group is ready!
            </Text>
            <Text className="mb-4 text-lg text-slate-950">
              You can now add expenses to it.
            </Text>
            <Pressable
              className={cn(
                bgBrand,
                'flex-row justify-center rounded-lg px-4 py-2 active:opacity-60'
              )}
              onPress={addExpense}
            >
              <Text className="text-white text-lg font-semibold">
                Add expense
              </Text>
            </Pressable>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(expense) => expense.id}
            ListHeaderComponent={filterControls}
            ListEmptyComponent={
              <View className="items-center px-8 py-16">
                <Text className="text-slate-500 text-center">
                  {monthKey && isFetchingNextPage
                    ? 'Loading…'
                    : 'No expenses match your filters.'}
                </Text>
              </View>
            }
            renderItem={({ item: expense }) => (
              <View className="bg-slate-100 rounded-md mb-2 mx-4 flex-row">
                <Pressable
                  className="py-4 pl-4 flex-row flex-1 active:opacity-60"
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/[groupId]/expenses/[expenseId]',
                      params: { groupId: group.id, expenseId: expense.id },
                    })
                  }
                >
                  <View className="gap-1 flex-1">
                    <Text className={cn(expense.isReimbursement && 'italic')}>
                      {expense.title}
                    </Text>
                    <Text className="text-xs text-slate-600">
                      Paid by{' '}
                      <Text className="font-bold">{expense.paidBy.name}</Text>{' '}
                      for{' '}
                      {expense.paidFor.map(({ participant }, index) => (
                        <Fragment key={index}>
                          {index > 0 && ', '}
                          <Text className="font-bold">{participant.name}</Text>
                        </Fragment>
                      ))}
                    </Text>
                  </View>
                  <View className="gap-1 items-end flex-shrink-0 justify-between">
                    <Text className="font-bold">
                      {formatCurrency(group.currency, expense.amount / 100)}
                    </Text>
                    <Text className="text-xs text-slate-600">
                      {expense.createdAt.toLocaleDateString('en-US', {
                        dateStyle: 'medium',
                      })}
                    </Text>
                  </View>
                </Pressable>

                <MenuView
                  title="Expense actions"
                  onPressAction={({ nativeEvent }) => {
                    match(nativeEvent.event)
                      .with('open', () => {
                        router.push({
                          pathname: '/(tabs)/[groupId]/expenses/[expenseId]',
                          params: { groupId: group.id, expenseId: expense.id },
                        })
                      })
                      .with('delete', () => {
                        deleteAsync({
                          groupId: group.id,
                          expenseId: expense.id,
                        }).then(() => {
                          utils.groups.invalidate()
                        })
                      })
                  }}
                  actions={[
                    {
                      id: 'open',
                      title: 'Edit expense',

                      image: Platform.select({
                        ios: 'pencil',
                      }),
                    },
                    {
                      id: 'delete',
                      title: 'Delete expense',
                      attributes: {
                        destructive: true,
                      },
                      image: Platform.select({
                        ios: 'trash',
                        android: 'ic_menu_delete',
                      }),
                    },
                  ]}
                  shouldOpenOnLongPress={false}
                  style={{ flexDirection: 'row', alignItems: 'stretch' }}
                >
                  <View className="px-4 py-4 flex-row items-center">
                    <FontAwesome6 name="ellipsis" />
                  </View>
                </MenuView>
              </View>
            )}
            renderSectionHeader={({ section: { title } }) => (
              <View className="px-4 pt-4 pb-2 bg-white">
                <Text className="font-bold text-slate-500 text-xs uppercase">
                  {title}
                </Text>
              </View>
            )}
            onEndReached={() => {
              if (hasMore && !monthKey) fetchNextPage()
            }}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

function getMonthlySections(expenses: Expense[]) {
  // Preserve the newest-first order of the input while grouping by month.
  const byMonth = new Map<string, Expense[]>()
  for (const expense of expenses) {
    const key = dayjs(expense.expenseDate).format('YYYY-MM')
    const bucket = byMonth.get(key)
    if (bucket) bucket.push(expense)
    else byMonth.set(key, [expense])
  }
  return Array.from(byMonth, ([key, data]) => ({
    title: dayjs(`${key}-01`).format('MMMM YYYY'),
    data,
  }))
}
