/** Onboarding — mockup screen 1: hero atmosphere, CTA, account link. */
import { BrandMark } from '../../shared/BrandMark'
import { Button } from '../../shared/ui'

export function OnboardingScreen({
  onContinue,
  onAccount,
}: {
  onContinue: () => void
  onAccount?: () => void
}) {
  return (
    <div className="onboarding">
      <div className="onboarding__hero" aria-hidden="true">
        <div className="onboarding__skyline" />
        <div className="onboarding__vignette" />
      </div>
      <div className="onboarding__top">
        <BrandMark size={40} />
      </div>
      <div className="onboarding__content">
        <p className="onboarding__kicker">Business Type</p>
        <h1>
          Real decisions.
          <br />
          Real consequences.
          <br />
          A better you.
        </h1>
        <p className="onboarding__sub">
          Lerne unter Unsicherheit zu entscheiden — und sieh, ob gute Prozesse auch gute Ergebnisse erzeugen.
        </p>
        <Button block variant="primary" className="onboarding__cta" onClick={onContinue}>
          Loslegen
        </Button>
        <button type="button" className="onboarding__link" onClick={onAccount ?? onContinue}>
          Ich habe bereits einen Account
        </button>
      </div>
    </div>
  )
}
