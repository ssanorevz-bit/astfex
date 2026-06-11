import type { DiscoveryThemeSection } from "../discovery-data";
import { DiscoveryStoryCardView } from "./discovery-story-card";

export function DiscoveryThemeSectionView({ section }: { section: DiscoveryThemeSection }) {
  return (
    <section className="drDiscoveryThemeSection" id={section.slug} aria-labelledby={`${section.slug}-title`}>
      <div className="drDiscoveryThemeHead">
        <div>
          <span className="drDiscoveryThemeKicker">Theme</span>
          <h2 id={`${section.slug}-title`}>{section.title}</h2>
          <p>{section.description}</p>
        </div>
        <div className="drDiscoveryThemeStats">
          <strong>{section.cards.length}</strong>
          <span>stories ready</span>
        </div>
      </div>
      <div className="drDiscoveryStoryGrid">
        {section.cards.map((card) => <DiscoveryStoryCardView key={`${section.slug}-${card.symbol}`} card={card} />)}
      </div>
      {section.missingSymbols.length ? (
        <p className="drDiscoveryThemeMissing">
          Coverage pending: {section.missingSymbols.join(", ")}
        </p>
      ) : null}
    </section>
  );
}
