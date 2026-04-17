'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTrade(formData: FormData) {
  const supabase = await createClient()

  // Get user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be logged in to add a trade.')
  }

  const type = formData.get('type') as string
  let ticker = formData.get('ticker') as string || 'CASH'
  const currency = formData.get('currency') as string
  const price = parseFloat(formData.get('price') as string)
  let quantity = parseFloat(formData.get('quantity') as string) || 1
  const date = formData.get('date') as string
  const notes = formData.get('notes') as string
  let sector = (formData.get('sector') as string) || 'Uncategorized'
  const account = (formData.get('account') as string) || 'Default'
  let fee = parseFloat(formData.get('fee') as string) || 0

  if (type === 'DEPOSIT' || type === 'WITHDRAWAL') {
    ticker = 'CASH'
    quantity = 1
    sector = 'Cash'
    fee = 0
  } else {
    if (/^\d{6}$/.test(ticker)) {
      ticker = ticker + '.KS'
    }
  }

  const { error } = await supabase
    .from('trades')
    .insert([
      {
        id: user.id, // Supabase RLS expects this to match auth.uid()
        ticker: ticker.toUpperCase(),
        type,
        currency,
        price,
        quantity,
        fee,
        trade_date: date,
        notes,
        sector,
        account,
      }
    ])

  if (error) {
    console.error('Error adding trade: ', error)
    throw new Error('Failed to add trade')
  }

  revalidatePath('/trades')
  revalidatePath('/')
}

export async function updateTrade(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be logged in to update a trade.')
  }

  const trade_id = formData.get('trade_id') as string
  const type = formData.get('type') as string
  let ticker = formData.get('ticker') as string || 'CASH'
  const currency = formData.get('currency') as string
  const price = parseFloat(formData.get('price') as string)
  let quantity = parseFloat(formData.get('quantity') as string) || 1
  const date = formData.get('date') as string
  const notes = formData.get('notes') as string
  let sector = (formData.get('sector') as string) || 'Uncategorized'
  const account = (formData.get('account') as string) || 'Default'
  let fee = parseFloat(formData.get('fee') as string) || 0

  if (type === 'DEPOSIT' || type === 'WITHDRAWAL') {
    ticker = 'CASH'
    quantity = 1
    sector = 'Cash'
    fee = 0
  } else {
    if (/^\d{6}$/.test(ticker)) {
      ticker = ticker + '.KS'
    }
  }

  const { error } = await supabase
    .from('trades')
    .update({
      ticker: ticker.toUpperCase(),
      type,
      currency,
      price,
      quantity,
      fee,
      trade_date: date,
      notes,
      sector,
      account,
    })
    .eq('trade_id', trade_id)

  if (error) {
    console.error('Error updating trade: ', error)
    throw new Error('Failed to update trade')
  }

  revalidatePath('/trades')
  revalidatePath('/')
}

export async function deleteTrade(trade_id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be logged in to delete a trade.')
  }

  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('trade_id', trade_id)

  if (error) {
    console.error('Error deleting trade: ', error)
    throw new Error('Failed to delete trade')
  }

  revalidatePath('/trades')
  revalidatePath('/')
}
