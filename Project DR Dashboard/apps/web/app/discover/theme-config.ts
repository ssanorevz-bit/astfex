export type DiscoveryThemeConfig = {
  slug: string;
  title: string;
  description: string;
  symbols: string[];
};

export const discoveryThemes: DiscoveryThemeConfig[] = [
  {
    slug: "ai-infrastructure",
    title: "หุ้นหลังฉาก AI",
    description: "กลุ่มโครงสร้างพื้นฐานที่อยู่เบื้องหลัง data center, chip และเครือข่ายสำหรับ AI",
    symbols: ["NVDA", "VRT", "ANET", "SMCI", "MRVL", "AVGO"]
  },
  {
    slug: "ai-software",
    title: "AI Software",
    description: "บริษัทซอฟต์แวร์และ data platform ที่ได้อานิสงส์จากการใช้งาน AI เชิงพาณิชย์",
    symbols: ["PLTR", "CRM", "ADBE", "DDOG", "SNOW", "NOW"]
  },
  {
    slug: "consumer-winners",
    title: "Consumer Winners",
    description: "ธุรกิจ consumer brand ที่มี pricing power และฐานลูกค้าเหนียวแน่น",
    symbols: ["COSTCO", "LULU", "HERMES", "LVMH", "POPMART", "MIXUE"]
  },
  {
    slug: "china-consumer",
    title: "China Consumer",
    description: "ชื่อที่ช่วยเล่าเรื่อง consumption ของจีนผ่านแบรนด์และแพลตฟอร์มที่ผู้ใช้คุ้นเคย",
    symbols: ["POPMART", "MIXUE", "MNSO", "ANTA", "LAOPU", "MEITUAN"]
  },
  {
    slug: "japan-hidden-champions",
    title: "Japan Hidden Champions",
    description: "บริษัทญี่ปุ่นที่เด่นเฉพาะทางและมักเป็นผู้อยู่เบื้องหลัง supply chain สำคัญของโลก",
    symbols: ["KEYENCE", "DISCO", "KIOXIA", "SANRIO", "NINTENDO", "FANUC"]
  },
  {
    slug: "healthcare-innovation",
    title: "Healthcare Innovation",
    description: "ธีม healthcare ที่ขับเคลื่อนด้วยนวัตกรรมยา เครื่องมือแพทย์ และ biotech",
    symbols: ["LLY", "NOVOB", "ISRG", "CRSP", "ZAI", "WUXI"]
  },
  {
    slug: "energy-and-power",
    title: "Energy & Power",
    description: "ธีมไฟฟ้า พลังงาน และโครงสร้างพื้นฐานที่รองรับการใช้พลังงานยุคใหม่",
    symbols: ["VRT", "CEG", "CCJ", "NEE", "EOSE"]
  }
];
