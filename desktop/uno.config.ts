import {
  defineConfig,
  presetMini,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss';

export default defineConfig({
  presets: [presetMini(), presetWind3({ preflight: false })],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    colors: {
      primary: 'rgb(var(--primary-6))',
      success: 'rgb(var(--success-6))',
      warning: 'rgb(var(--warning-6))',
      danger: 'rgb(var(--danger-6))',
      info: 'rgb(var(--arcoblue-6))',
      'bg-base': 'var(--color-bg-1)',
      'bg-card': 'var(--color-bg-2)',
      'bg-pop': 'var(--color-bg-popup)',
      'fill-1': 'var(--color-fill-1)',
      'fill-2': 'var(--color-fill-2)',
      'fill-3': 'var(--color-fill-3)',
      'fill-4': 'var(--color-fill-4)',
      'text-1': 'var(--color-text-1)',
      'text-2': 'var(--color-text-2)',
      'text-3': 'var(--color-text-3)',
      'border-1': 'var(--color-border-2)',
      'border-2': 'var(--color-border-3)'
    }
  },
  shortcuts: {
    card: 'bg-bg-card border border-border-1 rounded-lg',
    'page-title': 'text-15px font-600 text-text-1',
    mono: 'font-mono text-12px'
  }
});