import { TrackScreen } from '@/components/analytics'
import { BRAND_COLOR, SECONDARY_BRAND_COLOR } from '@/utils/colors'
import { formatCurrency } from '@/utils/formatCurrency'
import {
  getMonthlySpending,
  getSpendingByCategory,
  getSpendingByPayer,
  getSummary,
} from '@/utils/expenseStats'
import { trpc } from '@/utils/trpc'
import { useFocusEffect, useGlobalSearchParams } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { BarChart, PieChart } from 'react-native-gifted-charts'
import { AppRouterOutput } from 'spliit-api'

const PALETTE = [
  '#059669',
  '#0ea5e9',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
]

export default function AnalyticsScreen() {
  const { groupId } = useGlobalSearchParams<{ groupId: string }>()
  const { data } = trpc.groups.get.useQuery({ groupId })

  if (!data?.group) return null

  return (
    <>
      <TrackScreen screenName="group-analytics" eventProps={{ groupId }} />
      <Analytics group={data.group} />
    </>
  )
}

function Analytics({
  group,
}: {
  group: NonNullable<AppRouterOutput['groups']['get']['group']>
}) {
  // Fetch every expense in one shot for accurate aggregates.
  const { data, isInitialLoading, refetch } =
    trpc.groups.expenses.list.useQuery({
      groupId: group.id,
      limit: 100000,
    })

  // The tab stays mounted in the background, so refetch whenever it regains
  // focus to reflect expenses added/edited/deleted from other tabs.
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
  )

  const expenses = useMemo(() => data?.expenses ?? [], [data])

  const summary = useMemo(() => getSummary(expenses), [expenses])
  const monthly = useMemo(() => getMonthlySpending(expenses, 6), [expenses])
  const byCategory = useMemo(() => getSpendingByCategory(expenses), [expenses])
  const byPayer = useMemo(() => getSpendingByPayer(expenses), [expenses])

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  const currency = group.currency
  const fmt = (cents: number) => formatCurrency(currency, cents / 100)

  const chartWidth = Dimensions.get('window').width - 32 - 24

  if (isInitialLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView edges={['top']} className="flex-1 bg-white">
          <View className="h-full flex-col justify-center items-center gap-4">
            <ActivityIndicator size="large" />
            <Text className="text-slate-700">Loading analytics</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    )
  }

  if (summary.count === 0) {
    return (
      <SafeAreaProvider>
        <SafeAreaView edges={['top']} className="flex-1 bg-white">
          <View className="h-full items-center justify-center px-8">
            <Text className="mb-2 font-bold text-lg text-slate-950">
              No data yet
            </Text>
            <Text className="text-center text-slate-600">
              Add some expenses to see spending analytics for this group.
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    )
  }

  const barData = monthly.map((m, i) => ({
    value: Math.round(m.value / 100),
    label: m.label,
    frontColor: selectedMonth === i ? SECONDARY_BRAND_COLOR : BRAND_COLOR,
    onPress: () => setSelectedMonth((prev) => (prev === i ? null : i)),
  }))

  const categoryTotal = byCategory.reduce((sum, c) => sum + c.value, 0)
  const pieData = byCategory.map((c, i) => ({
    value: c.value,
    color: PALETTE[i % PALETTE.length],
  }))

  const maxPayer = Math.max(...byPayer.map((p) => p.value), 1)

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <ScrollView className="flex-1">
          <View className="p-4 mt-2">
            <Text className="font-bold text-lg mb-0.5">Analytics</Text>
            <Text className="text-gray-500 text-sm">
              An overview of this group’s spending.
            </Text>
          </View>

          {/* Summary cards */}
          <View className="flex-row flex-wrap px-2">
            <SummaryCard label="Total spent" value={fmt(summary.total)} />
            <SummaryCard label="This month" value={fmt(summary.currentMonthTotal)} />
            <SummaryCard label="Expenses" value={String(summary.count)} />
            <SummaryCard label="Average" value={fmt(summary.average)} />
          </View>

          {/* Monthly spending */}
          <Section title="Spending per month" subtitle={`Last 6 months, in ${currency}`}>
            <View className="mb-3 min-h-[40px]">
              {selectedMonth !== null && monthly[selectedMonth] ? (
                <View className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex-row justify-between items-center">
                  <Text className="text-slate-600">
                    {monthly[selectedMonth].label}
                  </Text>
                  <Text
                    className="font-bold text-lg"
                    style={{ color: SECONDARY_BRAND_COLOR }}
                  >
                    {fmt(monthly[selectedMonth].value)}
                  </Text>
                </View>
              ) : (
                <Text className="text-slate-400 text-sm">
                  Tap a bar to see that month’s total.
                </Text>
              )}
            </View>
            <BarChart
              key={`bar-${selectedMonth}-${monthly
                .map((m) => m.value)
                .join('_')}`}
              data={barData}
              width={chartWidth}
              height={180}
              barWidth={22}
              spacing={
                barData.length > 1
                  ? Math.max(
                      8,
                      (chartWidth - barData.length * 22) / barData.length,
                    )
                  : 22
              }
              initialSpacing={12}
              noOfSections={4}
              frontColor={BRAND_COLOR}
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#64748b', fontSize: 11 }}
              rulerColor="#e2e8f0"
            />
          </Section>

          {/* Spending by category */}
          <Section title="Spending by category">
            <View className="items-center mb-4">
              <PieChart
                key={`pie-${pieData.map((d) => d.value).join('_')}`}
                data={pieData}
                donut
                radius={90}
                innerRadius={55}
                centerLabelComponent={() => (
                  <View className="items-center">
                    <Text className="text-xs text-slate-500">Total</Text>
                    <Text className="font-bold">{fmt(categoryTotal)}</Text>
                  </View>
                )}
              />
            </View>
            <View>
              {byCategory.map((c, i) => {
                const pct =
                  categoryTotal > 0
                    ? Math.round((c.value / categoryTotal) * 100)
                    : 0
                return (
                  <View
                    key={c.name}
                    className="flex-row items-center py-1.5"
                  >
                    <View
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                    />
                    <Text className="flex-1 text-slate-800" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text className="text-slate-500 text-xs mr-3">{pct}%</Text>
                    <Text className="font-semibold">{fmt(c.value)}</Text>
                  </View>
                )
              })}
            </View>
          </Section>

          {/* Spending by payer */}
          <Section
            title="Paid by participant"
            subtitle="How much each participant advanced"
          >
            {byPayer.map((p) => (
              <View key={p.participantId} className="mb-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-800" numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text className="font-semibold">{fmt(p.value)}</Text>
                </View>
                <View className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${(p.value / maxPayer) * 100}%`,
                      backgroundColor: BRAND_COLOR,
                    }}
                  />
                </View>
              </View>
            ))}
          </Section>

          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 p-2">
      <View className="bg-slate-50 border border-slate-100 rounded-lg p-3">
        <Text className="text-slate-500 text-xs mb-1">{label}</Text>
        <Text className="font-bold text-lg text-slate-900" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <View className="px-4 pt-4 mt-2">
      <Text className="font-bold text-base mb-0.5">{title}</Text>
      {subtitle && (
        <Text className="text-gray-500 text-sm mb-3">{subtitle}</Text>
      )}
      {!subtitle && <View className="mb-3" />}
      {children}
    </View>
  )
}
