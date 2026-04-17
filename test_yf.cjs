const yahooFinance = require('yahoo-finance2').default;
async function test() {
  const quote = await yahooFinance.quote('005930.KS');
  console.log('shortName:', quote.shortName);
  console.log('longName:', quote.longName);
}
test();
