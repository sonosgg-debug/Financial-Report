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

  if (type === 'SELL') {
    const { data: pastTrades, error: fetchError } = await supabase
      .from('trades')
      .select('type, quantity')
      .eq('id', user.id)
      .eq('ticker', ticker.toUpperCase())
      .eq('account', account)

    if (fetchError) {
      console.error('Error fetching holdings: ', fetchError)
      return { error: '보유 수량 확인 중 오류가 발생했습니다.' }
    }

    let currentQuantity = 0
    pastTrades?.forEach(trade => {
      if (trade.type === 'BUY') currentQuantity += trade.quantity
      else if (trade.type === 'SELL') currentQuantity -= trade.quantity
    })

    if (currentQuantity < quantity) {
      return { error: `매도 수량 오류: 현재 [${account}] 계좌의 [${ticker.toUpperCase()}] 보유 수량은 ${currentQuantity}주 입니다. (입력 수량: ${quantity}주)` }
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
    return { error: 'Failed to add trade' }
  }

  revalidatePath('/trades')
  revalidatePath('/')
  return { success: true }
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
