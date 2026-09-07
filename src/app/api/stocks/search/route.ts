import { NextRequest, NextResponse } from 'next/server'
import { searchStocks } from '@/utils/stockSearch'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '25', 10)

  const results = searchStocks(q, limit)
  return NextResponse.json({ results })
}
