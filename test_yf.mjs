import yahooFinance from 'yahoo-finance2';
async function test() {
  const quote = await yahooFinance.quote('005930.KS');
  console.log('shortName:', quote.shortName);
  console.log('longName:', quote.longName);
  console.log('Keys:', Object.keys(quote));
}
test();
