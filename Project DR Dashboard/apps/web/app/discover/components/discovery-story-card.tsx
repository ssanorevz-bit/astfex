import Link from "next/link";
import type { DiscoveryStoryCard } from "../discovery-data";

export function DiscoveryStoryCardView({ card }: { card: DiscoveryStoryCard }) {
  const content = (
    <>
      <div className="drDiscoveryStoryTop">
        <div>
          <span className="drDiscoveryStoryTicker">{card.ticker}</span>
          <h3>{card.companyName}</h3>
        </div>
        <div className="drDiscoveryStoryMeta">
          <span>{card.drTicker ?? "No DR route"}</span>
        </div>
      </div>
      <p className="drDiscoveryStorySummary">{card.businessOneLinerTH}</p>
      {card.signatureInsightTH ? <p className="drDiscoveryStoryInsight">{card.signatureInsightTH}</p> : null}
      <div className="drDiscoveryStoryFooter">
        <span>{card.themes[0] ?? "Story Repository"}</span>
        <strong>{card.href ? "เปิดหน้า DR Detail" : "รอเชื่อม DR Detail"}</strong>
      </div>
    </>
  );

  if (!card.href) {
    return (
      <article className="drDiscoveryStoryCard muted">
        {content}
      </article>
    );
  }

  return (
    <Link className="drDiscoveryStoryCard" href={card.href}>
      {content}
    </Link>
  );
}
