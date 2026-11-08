// Every country for the unified salary tax calculator's country picker, with its currency, and
// what the calculator can do there:
//   rules: "builtin"  one or more tax datasets in src/_data/tax/<cc>-<taxyear>.json (years listed,
//                     newest first; `current` is the default year)
//          "noTax"    no tax on salaries (src/_data/noSalaryTax.json, with the official statement)
//          "custom"   no built-in rules yet: the visitor enters their own rates (Custom Tax Mode)
// Names are English here; the browser shows them in the page language with Intl.DisplayNames.
// `page` is the country's own landing page, when it has one.
const fs = require('fs');
const path = require('path');

// ISO 3166-1 alpha-2 code: ISO 4217 currency of the country's salaries
const CURRENCIES = `AD:EUR AE:AED AF:AFN AG:XCD AI:XCD AL:ALL AM:AMD AO:AOA AR:ARS AS:USD AT:EUR AU:AUD AW:AWG
AX:EUR AZ:AZN BA:BAM BB:BBD BD:BDT BE:EUR BF:XOF BG:EUR BH:BHD BI:BIF BJ:XOF BL:EUR BM:BMD BN:BND BO:BOB
BQ:USD BR:BRL BS:BSD BT:BTN BW:BWP BY:BYN BZ:BZD CA:CAD CD:CDF CF:XAF CG:XAF CH:CHF CI:XOF CK:NZD CL:CLP
CM:XAF CN:CNY CO:COP CR:CRC CU:CUP CV:CVE CW:XCG CY:EUR CZ:CZK DE:EUR DJ:DJF DK:DKK DM:XCD DO:DOP DZ:DZD
EC:USD EE:EUR EG:EGP ER:ERN ES:EUR ET:ETB FI:EUR FJ:FJD FK:FKP FM:USD FO:DKK FR:EUR GA:XAF GB:GBP GD:XCD
GE:GEL GF:EUR GG:GBP GH:GHS GI:GIP GL:DKK GM:GMD GN:GNF GP:EUR GQ:XAF GR:EUR GT:GTQ GU:USD GW:XOF GY:GYD
HK:HKD HN:HNL HR:EUR HT:HTG HU:HUF ID:IDR IE:EUR IL:ILS IM:GBP IN:INR IQ:IQD IR:IRR IS:ISK IT:EUR JE:GBP
JM:JMD JO:JOD JP:JPY KE:KES KG:KGS KH:KHR KI:AUD KM:KMF KN:XCD KP:KPW KR:KRW KW:KWD KY:KYD KZ:KZT LA:LAK
LB:LBP LC:XCD LI:CHF LK:LKR LR:LRD LS:LSL LT:EUR LU:EUR LV:EUR LY:LYD MA:MAD MC:EUR MD:MDL ME:EUR MF:EUR
MG:MGA MH:USD MK:MKD ML:XOF MM:MMK MN:MNT MO:MOP MP:USD MQ:EUR MR:MRU MS:XCD MT:EUR MU:MUR MV:MVR MW:MWK
MX:MXN MY:MYR MZ:MZN NA:NAD NC:XPF NE:XOF NG:NGN NI:NIO NL:EUR NO:NOK NP:NPR NR:AUD NU:NZD NZ:NZD OM:OMR
PA:PAB PE:PEN PF:XPF PG:PGK PH:PHP PK:PKR PL:PLN PM:EUR PR:USD PS:ILS PT:EUR PW:USD PY:PYG QA:QAR RE:EUR
RO:RON RS:RSD RU:RUB RW:RWF SA:SAR SB:SBD SC:SCR SD:SDG SE:SEK SG:SGD SH:SHP SI:EUR SK:EUR SL:SLE SM:EUR
SN:XOF SO:SOS SR:SRD SS:SSP ST:STN SV:USD SX:XCG SY:SYP SZ:SZL TC:USD TD:XAF TG:XOF TH:THB TJ:TJS TL:USD
TM:TMT TN:TND TO:TOP TR:TRY TT:TTD TV:AUD TW:TWD TZ:TZS UA:UAH UG:UGX US:USD UY:UYU UZ:UZS VA:EUR VC:XCD
VE:VES VG:USD VI:USD VN:VND VU:VUV WF:XPF WS:WST XK:EUR YE:YER YT:EUR ZA:ZAR ZM:ZMW ZW:ZWG`;

const TAX_DIR = path.join(__dirname, 'tax');

module.exports = function () {
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  const noTax = require('./noSalaryTax.json').countries;
  const homeCountries = require('./countries.json');
  const datasets = fs.readdirSync(TAX_DIR).filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(TAX_DIR, f), 'utf8')));

  return CURRENCIES.split(/\s+/).filter(Boolean).map(pair => {
    const [code, currency] = pair.split(':');
    const own = datasets.filter(d => d.country === code).sort((a, b) => b.taxYear.localeCompare(a.taxYear));
    const home = homeCountries.find(c => c.code === code);
    const entry = { code, name: names.of(code), currency, rules: 'custom' };
    if (home) Object.assign(entry, { locale: home.locale, lakhGrouping: !!home.lakhGrouping, timeZones: home.timeZones });
    if (own.length) {
      const current = own.find(d => d.current) || own[0];
      entry.rules = 'builtin';
      entry.years = own.map(d => d.taxYear);
      entry.currentYear = current.taxYear;
      entry.page = code === 'PK' ? 'pakistan-salary-tax-calculator' : (current.page && current.page.slug);
    } else if (noTax.some(c => c.code === code)) {
      entry.rules = 'noTax';
    }
    return entry;
  }).sort((a, b) => a.name.localeCompare(b.name, 'en'));
};
