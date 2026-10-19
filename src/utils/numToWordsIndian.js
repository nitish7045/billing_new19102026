const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(n) {
  if (n < 20) return ones[n];
  const unit = n % 10;
  return tens[Math.floor(n / 10)] + (unit ? ' ' + ones[unit] : '');
}

function convertThreeDigits(n) {
  let str = '';
  if (Math.floor(n / 100) > 0) {
    str += ones[Math.floor(n / 100)] + ' Hundred';
    if (n % 100 > 0) str += ' and ';
  }
  str += convertTwoDigits(n % 100);
  return str.trim();
}

export function convertNumberToWordsIndian(amount) {
  const num = Number(amount);
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';

  const [rupeePart, paisaPart] = num.toFixed(2).split('.').map(Number);

  let remaining = rupeePart;
  let words = '';

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  const hundred = remaining;

  if (crore > 0) words += convertThreeDigits(crore) + ' Crore ';
  if (lakh > 0) words += convertThreeDigits(lakh) + ' Lakh ';
  if (thousand > 0) words += convertThreeDigits(thousand) + ' Thousand ';
  if (hundred > 0) words += convertThreeDigits(hundred) + ' ';

  let result = `Rupees ${words.trim()}`;

  if (paisaPart > 0) {
    const paisaWord = paisaPart === 1 ? 'Paisa' : 'Paise';
    result += ` and ${convertTwoDigits(paisaPart)} ${paisaWord}`;
  }

  return `${result} Only`;
}