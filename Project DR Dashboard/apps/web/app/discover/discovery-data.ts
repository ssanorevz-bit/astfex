import { getUnderlyingStory, type StoryCurationLevel } from "../dr-new/data";
import { discoveryThemes, type DiscoveryThemeConfig } from "./theme-config";

export type DiscoveryStoryCard = {
  symbol: string;
  companyName: string;
  ticker: string;
  drTicker: string | null;
  curationLevel: StoryCurationLevel;
  businessOneLinerTH: string;
  whyThisCompanyMattersTH: string | null;
  signatureInsightTH: string | null;
  href: string | null;
  themes: string[];
};

export type DiscoveryThemeSection = {
  slug: string;
  title: string;
  description: string;
  cards: DiscoveryStoryCard[];
  missingSymbols: string[];
};

export type DiscoveryPageData = {
  themes: DiscoveryThemeSection[];
  totalThemes: number;
  totalStories: number;
  totalMissingSymbols: number;
};

function toStoryCard(symbol: string): DiscoveryStoryCard | null {
  const story = getUnderlyingStory(symbol);
  if (!story.businessOneLinerTH) return null;

  return {
    symbol,
    companyName: story.companyName,
    ticker: symbol,
    drTicker: story.drTicker,
    curationLevel: story.curationLevel,
    businessOneLinerTH: story.businessOneLinerTH,
    whyThisCompanyMattersTH: story.whyThisCompanyMattersTH,
    signatureInsightTH: story.signatureInsightTH,
    href: story.drRoute,
    themes: story.themes
  };
}

function buildThemeSection(theme: DiscoveryThemeConfig): DiscoveryThemeSection {
  const cards: DiscoveryStoryCard[] = [];
  const missingSymbols: string[] = [];

  for (const symbol of theme.symbols) {
    const card = toStoryCard(symbol);
    if (card) {
      cards.push(card);
    } else {
      missingSymbols.push(symbol);
    }
  }

  return {
    slug: theme.slug,
    title: theme.title,
    description: theme.description,
    cards,
    missingSymbols
  };
}

export function getDiscoveryPageData(): DiscoveryPageData {
  const themes = discoveryThemes.map(buildThemeSection);
  return {
    themes,
    totalThemes: themes.length,
    totalStories: themes.reduce((sum, theme) => sum + theme.cards.length, 0),
    totalMissingSymbols: themes.reduce((sum, theme) => sum + theme.missingSymbols.length, 0)
  };
}
