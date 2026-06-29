import { Component } from '@angular/core';

interface TokenSwatch {
  name: string;
  variable: string;
}

@Component({
  selector: 'app-styleguide-tokens',
  standalone: true,
  imports: [],
  templateUrl: './styleguide-tokens.component.html',
  styleUrls: ['./styleguide-content.scss', './styleguide-tokens.component.scss']
})
export class StyleguideTokensComponent {
  readonly surfaceTokens: TokenSwatch[] = [
    { name: 'Background', variable: '--bg' },
    { name: 'Surface', variable: '--surface' },
    { name: 'Surface 2', variable: '--surface-2' },
    { name: 'Surface 3', variable: '--surface-3' },
    { name: 'Sidebar', variable: '--sidebar' },
    { name: 'Border', variable: '--border' },
    { name: 'Border Strong', variable: '--border-strong' }
  ];

  readonly textTokens: TokenSwatch[] = [
    { name: 'Text', variable: '--text' },
    { name: 'Text Secondary', variable: '--text-secondary' },
    { name: 'Text Muted', variable: '--text-muted' }
  ];

  readonly brandTokens: TokenSwatch[] = [
    { name: 'Primary', variable: '--primary' },
    { name: 'Primary Text', variable: '--primary-text' }
  ];

  readonly semanticTokens: { name: string; base: string; text: string }[] = [
    { name: 'Success', base: '--success', text: '--success-text' },
    { name: 'Danger', base: '--danger', text: '--danger-text' },
    { name: 'Warning', base: '--warning', text: '--warning-text' },
    { name: 'Info', base: '--info', text: '--info-text' }
  ];

  readonly spacingTokens = ['--spacing-1', '--spacing-2', '--spacing-3', '--spacing-4', '--spacing-5', '--spacing-6', '--spacing-8', '--spacing-10'];

  readonly radiusTokens = ['--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-2xl', '--radius-pill'];

  readonly shadowTokens = ['--shadow-elevation-sm', '--shadow-elevation-md', '--shadow-elevation-lg'];

  readonly typeScale = [
    { name: 'Caption', variable: '--font-size-caption' },
    { name: 'Label', variable: '--font-size-label' },
    { name: 'Body sm', variable: '--font-size-body-sm' },
    { name: 'Body', variable: '--font-size-body' },
    { name: 'Body lg', variable: '--font-size-body-lg' },
    { name: 'Title sm', variable: '--font-size-title-sm' },
    { name: 'Title', variable: '--font-size-title' },
    { name: 'Title lg', variable: '--font-size-title-lg' },
    { name: 'Display', variable: '--font-size-display' }
  ];

  readonly fontWeights = [
    { name: 'Regular (400)', variable: '--font-weight-regular' },
    { name: 'Medium (500)', variable: '--font-weight-medium' },
    { name: 'Semibold (600)', variable: '--font-weight-semibold' },
    { name: 'Bold (700)', variable: '--font-weight-bold' },
    { name: 'Extrabold (800)', variable: '--font-weight-extrabold' }
  ];

  readonly buttonMatrix: { label: string; cls: string; clsSm: string }[] = [
    { label: 'Primário', cls: 'btn-primary', clsSm: 'btn-primary sm' },
    { label: 'Secundário / Ghost', cls: 'btn-ghost', clsSm: 'btn-ghost sm' },
    { label: 'Destrutivo', cls: 'btn-danger', clsSm: 'btn-danger sm' }
  ];
}
