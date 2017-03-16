const block = (label, value, extraClass='') => `<div class="block ${extraClass}"><span class="label">${label}</span><span class="value">${value}</span></div>`;
const template = (data) => `
  <div>
  ${block('BTC/EUR', data.btceur)}
  ${block('BTC/KRW', data.btckrw)}
  ${block('EUR/BTC/KRW', data.eurbtckrw)}
  ${block('EUR/KRW (' + data.eurkrwupdate + ')', data.eurkrw)}
  ${block('Margin', data.btcarb + '%', 'result')}
  </div>
  <div>
  ${block('ETH/EUR', data.etheur)}
  ${block('ETH/KRW', data.ethkrw)}
  ${block('EUR/ETH/KRW', data.eurethkrw)}
  ${block('EUR/KRW (' + data.eurkrwupdate + ')', data.eurkrw)}
  ${block('Margin', data.etharb + '%', 'result')}
  </div>
`; 

const update = () => {
  let data = {};
  console.log('Updating data');

  // BTC
  Promise.all([
    fetch('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC,ETH&tsyms=EUR,KRW')
      .then(resp => resp.json())
      .then(json => {
        data.btceur = json.RAW.BTC.EUR.PRICE;
        data.btckrw = json.RAW.BTC.KRW.PRICE;
        data.etheur = json.RAW.ETH.EUR.PRICE;
        data.ethkrw = json.RAW.ETH.KRW.PRICE;
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
    data.btcarb = Math.round((data.eurbtckrw/data.eurkrw - 1) * 1000000)/10000;
    data.eurethkrw = Math.round(data.ethkrw / data.etheur *100)/100;
    data.etharb = Math.round((data.eurethkrw/data.eurkrw - 1) * 1000000)/10000;
    document.getElementById('content').innerHTML = template(data);
  });
};

setInterval(update, 60000); // Update every 60 seconds
update();