import { DrNewShell } from "../dr-new/components/dr-new-shell";
import { getDiscoveryPageData } from "./discovery-data";
import { DiscoveryThemeSectionView } from "./components/discovery-theme-section";

export const metadata = {
  title: "Discover DR Stories",
  description: "Explore Thai DR ideas by business theme using the existing story repository"
};

export default function DiscoverPage() {
  const discovery = getDiscoveryPageData();

  return (
    <DrNewShell
      active="discover"
      title="Discover DR Stories"
      subtitle="สำรวจหุ้นต่างประเทศผ่านธีมธุรกิจ โดยใช้ story repository เดิมที่ทีม curate ไว้แล้ว"
    >
      <section className="drDiscoveryHero">
        <div>
          <span className="drDiscoveryBadge">Phase 1 · Theme-first discovery</span>
          <h2>เริ่มจากธีม แล้วค่อยเลือก DR ที่อยากศึกษา</h2>
          <p>
            หน้านี้ช่วยให้ผู้ใช้ค้นเจอบริษัทน่าสนใจแม้ยังไม่รู้ ticker โดยใช้ business summary และ story insight ที่มีอยู่แล้วใน repository เดิม
          </p>
        </div>
        <div className="drDiscoveryHeroStats" aria-label="Discovery coverage">
          <article>
            <strong>{discovery.totalThemes}</strong>
            <span>Themes</span>
          </article>
          <article>
            <strong>{discovery.totalStories}</strong>
            <span>Story cards</span>
          </article>
          <article>
            <strong>{discovery.totalMissingSymbols}</strong>
            <span>Coverage gaps</span>
          </article>
        </div>
      </section>

      <div className="drDiscoveryThemeStack">
        {discovery.themes.map((theme) => <DiscoveryThemeSectionView key={theme.slug} section={theme} />)}
      </div>
    </DrNewShell>
  );
}
