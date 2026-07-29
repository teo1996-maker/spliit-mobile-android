import AsyncStorage from '@react-native-async-storage/async-storage'
import * as z from 'zod'

/**
 * Per-group defaults remembered from the last created expense, so that the
 * next "Add expense" form starts pre-filled with the same choices.
 *
 * We only persist the "how it's split" settings (who paid, split mode and the
 * involved participants). Amounts and titles are always transaction-specific
 * and are intentionally not stored.
 */
const expenseDefaultsSchema = z.object({
  paidBy: z.string().optional(),
  splitMode: z
    .enum(['EVENLY', 'BY_SHARES', 'BY_PERCENTAGE', 'BY_AMOUNT'])
    .optional(),
  paidFor: z
    .array(
      z.object({
        participant: z.string(),
        shares: z.number(),
      })
    )
    .optional(),
})

export type ExpenseDefaults = z.infer<typeof expenseDefaultsSchema>

const storageKey = (groupId: string) => `spliit-expense-defaults-${groupId}`

export async function getExpenseDefaults(
  groupId: string
): Promise<ExpenseDefaults | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(groupId))
    if (!raw) return null
    return expenseDefaultsSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export async function saveExpenseDefaults(
  groupId: string,
  defaults: ExpenseDefaults
) {
  try {
    await AsyncStorage.setItem(
      storageKey(groupId),
      JSON.stringify(expenseDefaultsSchema.parse(defaults))
    )
  } catch (err) {
    console.error('Failed to save expense defaults:', err)
  }
}
