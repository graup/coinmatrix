/*** Templates ***/

const $c = (sym, value) => {
  if (sym == 'KRW') return value.toFixed(0);
  else if (sym == 'EUR' || sym == 'USD') return value.toFixed(2);
  else if (sym == 'BTC' || sym == 'BCH') return value.toFixed(4);
  else return value;
};
const $p = (value) => {
  let pct = Math.round(10000*value)/100;
  let cls = '';
  if (pct >= 0.1) cls = 'positive';
  if (pct <= -0.1) cls = 'negative'; 
  if (pct > 0) return `<span class="change ${cls}">+${pct}%</span>`;
  return `<span class="change ${cls}">${pct}%</span>`;
}
const $compare = (fsym, tsym, base, store) => {
  let pair = store[fsym + tsym];
  let base_pair = store[tsym + base];
  let invert = false;
  if (typeof base_pair == 'undefined') {
    base_pair = store[base + tsym];
    invert = true;
  }
  let direct_pair = store[fsym + base];
  if (typeof base_pair == 'undefined' || typeof direct_pair == 'undefined') return '';
  let base_pair_price = invert?1/base_pair.price:base_pair.price;
  let relative = 1 - direct_pair.price / (pair.price * base_pair_price);
  return '<span class="compare">&asymp; ' + base + ' ' + $c(base, pair.price * base_pair_price) + ' (' + $p(relative) + ')</span>';
};
const $pair = (fsym, tsym, store) => {
  //if (fsym == tsym) return '';
  let pair = store[fsym + tsym];
  let cls = '';
  if (reference_sym == tsym) cls = 'reference';
  if (typeof pair === 'undefined') return `<td class="${cls}"></td>`;
  return `<td class="${cls}">${$c(tsym, pair.price)} ${pair.change? $p(pair.change/100) : ''}<br><span class="source">${pair.source.substr(0,13)}</span><br>${$compare(fsym, tsym, reference_sym, store)}</td>`;
};
const $row = (fsym, tsyms, store) => `
  <tr>
    <th>${fsym}</th>
    ${tsyms.map(tsym => $pair(fsym, tsym, store)).join('')}
  </tr>
`;
const $th = (sym) => {
  let cls = '';
  if (sym == reference_sym) cls = 'reference';
  return `<th class="${cls}">${sym}</th>`;
};
const $template = (symbols, store) => `
  <table class="coinmatrix">
    <thead><tr>
      <th>&nbsp;</th>
      ${symbols.slice(1).map(symbol => $th(symbol)).join('')}
    </tr></thead>
    ${symbols.slice(0, -1).map(symbol => $row(symbol, symbols.slice(1), store)).join('')}
  </table>
`; 

/*** Data ***/
let store = {};

let symbols = [ // good to put them in order of absolute numerical value
  'ETH', 'BCH', 'BTC', 
  'EUR', 'USD', 'KRW'
];

let data_sources = [
  {
    source: 'cryptocompare',
    fsyms: ['BTC', 'ETH', 'BCH'],
    tsyms: ['KRW'],
    e: 'Korbit'
  },
  {
    source: 'cryptocompare',
    fsyms: ['BCH', 'ETH'],
    tsyms: ['USD', 'EUR', 'BTC'],
    e: 'Kraken'
  },
  {
    source: 'cryptocompare',
    fsyms: ['BTC', 'ETH'],
    tsyms: ['EUR', 'USD'],
    e: 'Coinbase'
  },
  {
    source: 'fixer.io',
    fsyms: ['EUR'],
    tsyms: ['EUR', 'KRW', 'USD'],
  }
];

let reference_sym = 'KRW';

/*** Fetch data ***/

const data_to_query = (data) =>
  Object.keys(data).map(function(key) {
      return [key, data[key]].map(encodeURIComponent).join("=");
  }).join("&");

const build_url = (ds) => {
  if (ds.source == 'cryptocompare') {
    let base_url = 'https://min-api.cryptocompare.com/data/pricemultifull?';
    let params = {fsyms: ds.fsyms.join(','), tsyms: ds.tsyms.join(',')};
    if (ds.e) params.e = ds.e;
    return base_url + data_to_query(params);
  }
  if (ds.source == 'fixer.io') {
    let base_url = 'http://api.fixer.io/latest?';
    return base_url + data_to_query({symbols: ds.tsyms.join(','), base: ds.fsyms[0]});
  }
};

const marshal = (ds, data) => {
  let pairs = {};
  if (ds.source == 'cryptocompare') {
    for (let fsym in data.RAW) {
      for (let tsym in data.RAW[fsym]) {
        let price = data.RAW[fsym][tsym].PRICE;
        pairs[fsym + tsym] = {
          price: price,
          source: data.DISPLAY[fsym][tsym].MARKET,
          change: data.DISPLAY[fsym][tsym].CHANGEPCT24HOUR,
          volume: data.DISPLAY[fsym][tsym].VOLUME24HOURTO,
        };
      }
    }
  }
  if (ds.source == 'fixer.io') {
    for (let tsym in data.rates) {
      pairs[data.base + tsym] = {price: data.rates[tsym], source: ds.source};
    }
  }
  return pairs;
};

const update_store = (data) => {
  store = { ...store, ...data };
}

const calculate_extra_pairs = (store) => {
  /* Calculate some pairs based on other pairs */
  store['USDKRW'] = {price: store['EURKRW'].price / store['EURUSD'].price, source: store['EURUSD'].source};
  store['ETHBCH'] = {price: store['ETHBTC'].price / store['BCHBTC'].price, source: store['BCHBTC'].source};
}

/*** Rendering, events and update ***/

const render = () => {
  document.getElementById('content').innerHTML = $template(symbols, store);

  [].forEach.call(document.querySelectorAll('.coinmatrix thead th'), function(elem) {
    elem.addEventListener( 'click', function() {
        reference_sym = this.innerHTML;
        render();
    }, false );
  });
}

const update = () => {
  console.log('Updating data');

  let promises = [];
  for (let data_source of data_sources) {
    let url = build_url(data_source);
    promises.push(
      fetch(url)
        .then(resp => resp.json())
        .then(data => marshal(data_source, data))
        .then(update_store)
    );
  }

  Promise.all(promises).then(() => {
    calculate_extra_pairs(store);
    render();
  });
};

setInterval(update, 30000); // Update every 30 seconds
update();

