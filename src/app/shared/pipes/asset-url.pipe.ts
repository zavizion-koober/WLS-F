import { Pipe, PipeTransform } from '@angular/core';
import { env } from '@environments/environment';

@Pipe({
  name: 'assetUrl',
  standalone: true,
})
export class AssetUrlPipe implements PipeTransform {
  transform(url?: string | null, fallback = '/images/witchlab_hero.png'): string {
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/uploads')) {
      return url;
    }
    if (url.startsWith('/')) {
      return url;
    }
    return `/${url}`;
  }
}
