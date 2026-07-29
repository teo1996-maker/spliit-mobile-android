import { Expense } from '@/utils/trpc'
import dayjs from 'dayjs'

/**
 * Client-side analytics computed from the group's expense list.
 * All amounts are in cents (as returned by the API). Reimbursements are
 * excluded from spending stats, consistent with the API's getTotalGroupSpending.
 */

const realExpenses = (expenses: Expense[]) =>
  expenses.filter((e) => !e.isReimbursement)

export type Summary = {
  total: number
  count: number
  average: number
  currentMonthTotal: number
}

export function getSummary(expenses: Expense[]): Summary {
  const real = realExpenses(expenses)
  const total = real.reduce((sum, e) => sum + e.amount, 0)
  const count = real.length
  const average = count > 0 ? Math.round(total / count) : 0

  const startOfMonth = dayjs().startOf('month')
  const currentMonthTotal = real
    .filter((e) => dayjs(e.expenseDate).isAfter(startOfMonth))
    .reduce((sum, e) => sum + e.amount, 0)

  return { total, count, average, currentMonthTotal }
}

export type MonthlyPoint = { label: string; value: number }

/**
 * Total spending per month for the last `months` months (including the
 * current one), oldest first. Months with no expenses are included as 0.
 */
export function getMonthlySpending(
  expenses: Expense[],
  months = 6,
): MonthlyPoint[] {
  const real = realExpenses(expenses)
  const buckets: MonthlyPoint[] = []
  const totalsByKey = new Map<string, number>()

  for (const e of real) {
    const key = dayjs(e.expenseDate).format('YYYY-MM')
    totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + e.amount)
  }

  for (let i = months - 1; i >= 0; i--) {
    const m = dayjs().subtract(i, 'month')
    const key = m.format('YYYY-MM')
    buckets.push({
      label: m.format('MMM'),
      value: totalsByKey.get(key) ?? 0,
    })
  }

  return buckets
}

export type CategorySlice = { name: string; value: number }

/** Total spending grouped by category, largest first. */
export function getSpendingByCategory(expenses: Expense[]): CategorySlice[] {
  const real = realExpenses(expenses)
  const totals = new Map<string, number>()

  for (const e of real) {
    const name = e.category?.name ?? 'Uncategorized'
    totals.set(name, (totals.get(name) ?? 0) + e.amount)
  }

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export type PayerTotal = { participantId: string; name: string; value: number }

/** How much each participant paid (advanced), largest first. */
export function getSpendingByPayer(expenses: Expense[]): PayerTotal[] {
  const real = realExpenses(expenses)
  const totals = new Map<string, { name: string; value: number }>()

  for (const e of real) {
    const prev = totals.get(e.paidBy.id) ?? { name: e.paidBy.name, value: 0 }
    totals.set(e.paidBy.id, { name: e.paidBy.name, value: prev.value + e.amount })
  }

  return Array.from(totals.entries())
    .map(([participantId, { name, value }]) => ({ participantId, name, value }))
    .sort((a, b) => b.value - a.value)
}
