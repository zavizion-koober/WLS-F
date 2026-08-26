import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'price',
  standalone: true,
})
export class PricePipe implements PipeTransform {
  transform(amount?: number | string | null, currency = '₾'): string {
    if (amount === undefined || amount === null || amount === '') return `0.00 ${currency}`;
    const num = Number(amount);
    if (isNaN(num)) return `0.00 ${currency}`;
    return `${num.toFixed(2)} ${currency}`;
  }
}
