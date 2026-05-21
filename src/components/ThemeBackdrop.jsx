import { useAppStore } from '../stores/appStore'
import DarkVeil from './DarkVeil'

export default function ThemeBackdrop() {
  const theme = useAppStore((s) => s.theme)

  if (theme !== 'dark-veil') return null

  return (
    <div className="dark-veil-backdrop" aria-hidden="true">
      <DarkVeil
        speed={0.1}
        noiseIntensity={0}
        scanlineFrequency={0}
        resolutionScale={0.85}
        warpAmount={0}
      />
      <div className="dark-veil-scrim" />
    </div>
  )
}
