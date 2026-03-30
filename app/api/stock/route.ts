// app/api/stock/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) return NextResponse.json({ error: 'No ticker' }, { status: 400 });

  try {
    // Yahoo Finance의 공개 API 활용 (브라우저가 아닌 서버에서 호출하므로 차단 안 됨)
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`);
    const data = await response.json();
    
    // 현재가 추출
    const price = data.chart.result[0].meta.regularMarketPrice;
    return NextResponse.json({ price });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}