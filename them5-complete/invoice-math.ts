export function thaiBaht(amount: number): string {
  const words = ['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'];
  function number(n: number): string {
    if (n >= 1000000) return number(Math.floor(n / 1000000)) + 'ล้าน' + (n % 1000000 ? number(n % 1000000) : '');
    const digits = String(n); let out = '';
    for (let i=0;i<digits.length;i++) {
      const d = Number(digits[i]), place = digits.length - i - 1;
      if (!d) continue;
      if (place === 1) out += d === 1 ? 'สิบ' : d === 2 ? 'ยี่สิบ' : words[d] + 'สิบ';
      else if (place === 0) out += d === 1 && n > 10 ? 'เอ็ด' : words[d];
      else out += words[d] + ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'][place];
    }
    return out || 'ศูนย์';
  }
  const satang = Math.round(amount * 100), baht = Math.floor(satang / 100), fraction = satang % 100;
  return number(baht) + 'บาท' + (fraction ? number(fraction) + 'สตางค์' : 'ถ้วน');
}

export function invoiceTotals(items: any[], rate: number) {
  const grossSatang = items.reduce((total, item) => total + Math.round(Number(item.unitPrice) * 100) * Number(item.quantity), 0);
  const netSatang = Math.round(grossSatang * 100 / (100 + rate));
  return { total: grossSatang / 100, beforeVat: netSatang / 100, vat: (grossSatang - netSatang) / 100, amountText: thaiBaht(grossSatang / 100) };
}

