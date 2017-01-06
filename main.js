const block = (label, value) => `<div class="block"><span class="label">${label}</span><span class="value">${value}</span></div>`;
const template = (data) => `
  ${block('BTC/EUR', data.btceur)}
  ${block('BTC/KRW', data.btckrw)}
  ${block('EUR/BTC/KRW', data.eurbtckrw)}
  ${block('EUR/KRW (' + data.eurkrwupdate + ')', data.eurkrw)}
  ${block('Arbitrage margin', data.arb + '%')}
`; 

const update = () => {
  let data = {};
  console.log('Updating data');

  Promise.all([
    fetch('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC&tsyms=EUR,KRW')
      .then(resp => resp.json())
      .then(json => {
        data.btceur = json.RAW.BTC.EUR.PRICE;
        data.btckrw = json.RAW.BTC.KRW.PRICE;
      }),

    fetch('http://api.fixer.io/latest?symbols=KRW&base=EUR')
      .then(resp => resp.json())
      .then(json => {
        data.eurkrw = json.rates.KRW;
        data.eurkrwupdate = json.date;
      })

  ]).then(() => {
    console.log(data);
    data.eurbtckrw = Math.round(data.btckrw / data.btceur *100)/100;
    data.arb = Math.round((data.eurbtckrw/data.eurkrw - 1) * 1000000)/10000;
    document.getElementById('content').innerHTML = template(data);
  });
};

setInterval(update, 60000); // Update every 60 seconds
update();