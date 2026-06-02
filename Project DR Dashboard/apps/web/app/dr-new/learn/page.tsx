import Link from "next/link";
import { DrNewShell } from "../components/dr-new-shell";

export const metadata = {
  title: "Thai DR Learn",
  description: "คู่มือ DR ไทยแบบเข้าใจง่าย ครอบคลุมหุ้นแม่ อัตราแปลงสภาพ ปันผล Trading Activity ความเสี่ยง และ EOD data"
};

const quickNav = [
  ["DR คืออะไร", "#start-here"],
  ["ราคา DR", "#understanding-dr"],
  ["Conversion Ratio", "#understanding-dr"],
  ["ปันผล", "#dividend"],
  ["Trading Activity", "#trading-activity"],
  ["ความเสี่ยง", "#risks"],
  ["FAQ", "#faq"],
  ["คำศัพท์", "#glossary"]
];

const topicGroups = [
  {
    id: "start-here",
    kicker: "Start Here",
    title: "เริ่มจากพื้นฐาน",
    intro: "เข้าใจว่า DR คืออะไร และทำไมควรแยกข้อมูล DR ไทยออกจากข้อมูลหุ้นแม่",
    topics: [
      {
        title: "DR คืออะไร",
        body: "DR หรือ Depositary Receipt คือหลักทรัพย์ที่อ้างอิงหุ้นหรือ ETF ต่างประเทศ ทำให้นักลงทุนไทยสามารถซื้อขายผ่านตลาดหุ้นไทยและใช้เงินบาทได้"
      },
      {
        title: "DR ต่างจากหุ้นแม่อย่างไร",
        body: "หุ้นแม่ซื้อขายในตลาดต่างประเทศ เช่น Nasdaq, Hong Kong หรือ Tokyo ส่วน DR ซื้อขายในตลาดไทยเป็นเงินบาท ราคาของ DR จึงอาจไม่เคลื่อนไหวเหมือนหุ้นแม่ทุกเวลา"
      },
      {
        title: "ราคา DR มาจากอะไร",
        body: "ราคา DR เกี่ยวข้องกับราคาหุ้นแม่ ค่าเงิน อัตราแปลงสภาพ และ Trading Activity ของ DR ในตลาดไทย ดังนั้นราคา DR จึงไม่จำเป็นต้องเท่ากับราคาหุ้นแม่โดยตรง"
      }
    ]
  },
  {
    id: "understanding-dr",
    kicker: "Understanding DR",
    title: "เข้าใจโครงสร้าง DR",
    intro: "หัวใจคือหุ้นแม่, อัตราแปลงสภาพ, ค่าเงิน และเวลาตลาดที่ไม่ตรงกัน",
    topics: [
      {
        title: "อัตราแปลงสภาพ (Conversion Ratio)",
        body: "Conversion Ratio คืออัตราที่บอกว่า DR กี่หน่วยเทียบเท่ากับหุ้นแม่ 1 หุ้น เช่น 2,500 DR = 1 MSFT หมายความว่า DR 1 หน่วยเป็นเพียงส่วนย่อยของหุ้น MSFT"
      },
      {
        title: "ทำไมราคา DR ไม่เท่าหุ้นแม่",
        body: "เพราะ DR มีอัตราแปลงสภาพ ซื้อขายเป็นเงินบาท และตลาดไทยกับตลาดต่างประเทศเปิดปิดไม่พร้อมกัน ราคาของ DR จึงอาจต่างจากราคาหุ้นแม่ที่เห็นในตลาดต้นทาง"
      },
      {
        title: "หุ้นแม่คืออะไร",
        body: "หุ้นแม่ หรือ Underlying คือหุ้นหรือ ETF ต่างประเทศที่ DR อ้างอิง เช่น NVDA80 อาจอ้างอิงหุ้น NVIDIA Corporation หรือ MSFT80 อาจอ้างอิงหุ้น Microsoft Corporation"
      }
    ]
  },
  {
    id: "dividend",
    kicker: "Dividend",
    title: "เงินปันผลของ DR",
    intro: "ปันผล DR ควรดูแยกจากปันผลหุ้นแม่ เพราะวันที่และจำนวนเงินอาจไม่ตรงกัน",
    topics: [
      {
        title: "เงินปันผลของ DR",
        body: "DR บางตัวอาจมีการจ่ายเงินปันผล หากหุ้นแม่หรือ ETF อ้างอิงมีการจ่ายปันผล และเป็นไปตามเงื่อนไขของผู้ออก DR จำนวนเงิน วันที่ XD และวันจ่ายเงินอาจแตกต่างจากหุ้นแม่"
      },
      {
        title: "XD Date",
        body: "XD Date คือวันที่ผู้ซื้อหลักทรัพย์จะไม่ได้รับสิทธิรับเงินปันผลรอบนั้น หากต้องการมีสิทธิรับปันผล ผู้ลงทุนต้องถือหลักทรัพย์ก่อนวัน XD ตามเงื่อนไขของตลาด"
      },
      {
        title: "Payment Date",
        body: "Payment Date คือวันที่มีการจ่ายเงินปันผลให้ผู้ถือ DR โดยจำนวนเงินที่ได้รับอาจถูกแปลงเป็นเงินบาทและอาจมีเงื่อนไขจากผู้ออก DR"
      },
      {
        title: "ปันผล DR ต่างจากปันผลหุ้นแม่อย่างไร",
        body: "หุ้นแม่อาจประกาศปันผลเป็นสกุลเงินต่างประเทศ เช่น USD หรือ HKD ส่วนผู้ถือ DR ในไทยอาจได้รับเป็นเงินบาท วัน XD วันจ่ายเงิน และจำนวนเงินต่อหน่วยอาจไม่ตรงกับหุ้นแม่โดยตรง"
      }
    ]
  },
  {
    id: "trading-activity",
    kicker: "Trading Activity",
    title: "การซื้อขายและมูลค่าซื้อขาย",
    intro: "DR ที่อ้างอิงหุ้นใหญ่ไม่ได้แปลว่ามูลค่าซื้อขายในไทยสูงเสมอไป",
    topics: [
      {
        title: "Trading Activity ของ DR",
        body: "Trading Activity สะท้อนว่ามีการซื้อขาย DR มากน้อยแค่ไหน ควรดูทั้ง Trading Value และ Volume เพราะ DR บางตัวอาจอ้างอิงหุ้นใหญ่ แต่มีการซื้อขายในไทยไม่มาก"
      },
      {
        title: "Trading Value vs Volume",
        body: "Volume คือจำนวนหน่วยที่ซื้อขาย ส่วน Trading Value คือมูลค่าการซื้อขายเป็นเงินบาท หากต้องการดูภาพรวมกิจกรรมซื้อขายเป็นมูลค่า Trading Value มักช่วยให้เห็นภาพได้ดีกว่า"
      },
      {
        title: "ถ้าหุ้นแม่เดียวกันมีหลาย DR ควรดูอะไร",
        body: "ควรเปรียบเทียบ Issuer, ราคา DR, 1D%, Trading Value, Volume และ Conversion Ratio เพื่อเข้าใจความแตกต่างของ DR แต่ละตัวที่อ้างอิงหุ้นแม่เดียวกัน"
      }
    ]
  }
];

const risks = [
  ["ความเสี่ยงจากหุ้นแม่", "ราคาหุ้นแม่เปลี่ยนแปลงตามตลาดต่างประเทศ"],
  ["ความเสี่ยงจากค่าเงิน", "DR ซื้อขายเป็นเงินบาท แต่หุ้นแม่อาจซื้อขายเป็น USD, HKD, JPY หรือสกุลเงินอื่น"],
  ["ความเสี่ยงจากเวลาตลาด", "ตลาดไทยและตลาดต้นทางเปิดปิดไม่พร้อมกัน ทำให้ราคาหรือ 1D% อาจอ้างอิงคนละช่วงเวลา"],
  ["ความเสี่ยงจาก Trading Activity ต่ำ", "DR บางตัวอาจมีมูลค่าซื้อขายน้อย ทำให้การซื้อขายจริงอาจไม่ลื่นเท่าหุ้นแม่หรือ DR ที่ active กว่า"],
  ["ความเสี่ยงจากผู้ออก DR", "เงื่อนไขของ DR ขึ้นอยู่กับ issuer และเอกสารที่เกี่ยวข้อง"]
];

const examples = [
  {
    title: "ตัวอย่าง Conversion Ratio",
    body: "สมมติ MSFT06 มี Conversion Ratio = 5,000 DR = 1 MSFT หมายความว่า MSFT06 จำนวน 5,000 หน่วยมีมูลค่าอ้างอิงเทียบกับหุ้น MSFT จำนวน 1 หุ้น ก่อนคำนวณค่าเงินและปัจจัยอื่น ๆ"
  },
  {
    title: "ตัวอย่าง DR กับหุ้นแม่",
    body: "หุ้นแม่ MSFT ซื้อขายที่ Nasdaq เป็น USD แต่ DR อย่าง MSFT06 ซื้อขายในตลาดไทยเป็น THB ราคาทั้งสองจึงอาจเคลื่อนไหวไม่ตรงกันทุกเวลา"
  },
  {
    title: "ตัวอย่างเงินปันผล DR",
    body: "หุ้นแม่อาจประกาศปันผลเป็น USD และมีวัน XD ในตลาดต่างประเทศ แต่ DR ในไทยอาจมีวัน XD และวันจ่ายเงินคนละวัน โดยผู้ลงทุนไทยอาจได้รับเป็น THB ตามเงื่อนไขของ issuer"
  }
];

const productLinks = [
  ["DR Screener", "ใช้ค้นหา DR และหุ้นแม่ทั้งหมดที่มีให้ซื้อขายในไทย กรองตามประเทศ ธีม ประเภทสินทรัพย์ และจัดเรียงตามตัวชี้วัดหลัก", "/dr-new"],
  ["Rankings", "ใช้ดูอันดับสำเร็จรูป เช่น หุ้นแม่ขนาดใหญ่, DR ที่เคลื่อนไหวแรง, DR ปันผล, DR ที่มี Trading Activity สูง หรือธีมยอดนิยม", "/dr-new/rankings"],
  ["Dividends", "ใช้ติดตามข้อมูลปันผล เช่น Upcoming XD, Payment Soon, Dividend Watchlist และประวัติการจ่ายปันผลของ DR", "/dr-new/dividends"],
  ["Calendar", "ใช้ติดตาม XD, payment, earnings, listing, market holiday และ event ที่ควรกลับมาดูหลังตลาดปิด", "/dr-new/calendar"],
  ["Compare", "ใช้เปรียบเทียบ DR ที่อ้างอิงหุ้นแม่เดียวกัน หรือเปรียบเทียบ DR ในธีมเดียวกัน เช่น AI, Semiconductor, China Tech หรือ ETF Income", "/dr-new/compare"],
  ["Watchlist", "ใช้เก็บ DR หรือหุ้นแม่ที่สนใจไว้ติดตาม พร้อมดูการเปลี่ยนแปลงหลัง EOD, Trading Activity, event ถัดไป และบันทึกส่วนตัว", "/dr-new/watchlist"]
];

const faqs = [
  ["DR คือหุ้นจริงไหม", "DR ไม่ใช่หุ้นแม่โดยตรง แต่เป็นหลักทรัพย์ที่อ้างอิงหุ้นหรือ ETF ต่างประเทศ ผู้ลงทุนซื้อขาย DR ในตลาดไทยเป็นเงินบาท"],
  ["ทำไมราคา DR ไม่เท่าหุ้นแม่", "เพราะ DR มีอัตราแปลงสภาพ ซื้อขายเป็นเงินบาท และอาจได้รับผลจากค่าเงิน Trading Activity และเวลาเปิดปิดตลาดที่ต่างจากหุ้นแม่"],
  ["DR ได้ปันผลไหม", "DR บางตัวอาจได้รับปันผล หากหุ้นแม่หรือ ETF อ้างอิงมีการจ่ายปันผล และเป็นไปตามเงื่อนไขของ issuer"],
  ["ทำไมปันผล DR ไม่เท่าปันผลหุ้นแม่", "เพราะต้องคำนึงถึง conversion ratio, ค่าเงิน, ภาษี, ค่าธรรมเนียม และเงื่อนไขของ issuer จำนวนเงินต่อ DR จึงอาจไม่เท่ากับปันผลต่อหุ้นแม่โดยตรง"],
  ["ถ้าหุ้นแม่เดียวกันมีหลาย DR ควรเลือกดูอะไร", "ควรดู issuer, conversion ratio, ราคา DR, 1D%, Trading Value, Volume และเอกสารทางการ เพื่อเข้าใจความต่างของแต่ละ DR"],
  ["ทำไมเว็บใช้ EOD Data", "EOD Data คือข้อมูลหลังตลาดปิด เหมาะสำหรับดูภาพรวม เปรียบเทียบ และติดตามข้อมูลแบบไม่เน้น real-time trading"],
  ["EOD Data ต่างจาก Real-time อย่างไร", "Real-time แสดงข้อมูลระหว่างวัน ส่วน EOD แสดงข้อมูลหลังตลาดปิด ทำให้เหมาะกับการวิเคราะห์ภาพรวมมากกว่าการตัดสินใจซื้อขายทันที"]
];

const glossary = [
  ["Underlying", "หุ้นหรือ ETF ต่างประเทศที่ DR อ้างอิง"],
  ["Issuer", "ผู้ออก DR ในไทย เช่น ธนาคารหรือบริษัทหลักทรัพย์"],
  ["DR Price", "ราคาซื้อขายของ DR ในตลาดไทย เป็นเงินบาท"],
  ["Underlying Price", "ราคาของหุ้นแม่หรือ ETF อ้างอิงในตลาดต้นทาง"],
  ["Conversion Ratio", "อัตราที่บอกว่า DR กี่หน่วยเทียบเท่ากับหุ้นแม่ 1 หุ้น"],
  ["Trading Value", "มูลค่าการซื้อขายของ DR ในตลาดไทย ใช้ดู activity เชิงมูลค่า"],
  ["Trading Activity", "ภาพรวมความคึกคักในการซื้อขาย DR โดยดูจาก Trading Value และ Volume ร่วมกัน"],
  ["Volume", "จำนวนหน่วย DR ที่มีการซื้อขาย"],
  ["XD Date", "วันที่ผู้ซื้อจะไม่ได้รับสิทธิรับปันผลรอบนั้น"],
  ["Payment Date", "วันที่จ่ายเงินปันผลให้ผู้ถือ DR"],
  ["Dividend Yield", "อัตราผลตอบแทนจากเงินปันผลเมื่อเทียบกับราคา"],
  ["EOD Data", "ข้อมูลหลังตลาดปิด เหมาะกับการดูภาพรวมและเปรียบเทียบแบบนิ่ง"],
  ["Theme", "กลุ่มการลงทุน เช่น AI, Semiconductor, China Tech, EV, Healthcare หรือ ETF Income"],
  ["Asset Type", "ประเภทของ DR เช่น Stock DR, ETF DR, Bond DR หรือ Commodity DR"]
];

export default function DrNewLearnPage() {
  return (
    <DrNewShell
      active="learn"
      title="Learn"
      subtitle="คู่มือ DR ไทยแบบเข้าใจง่าย"
    >
      <section className="drLearnHero">
        <div>
          <span className="drRankingBadge">DR Guide</span>
          <h2>คู่มือ DR ไทยแบบเข้าใจง่าย</h2>
          <p>เริ่มต้นทำความเข้าใจว่า DR คืออะไร ราคา DR เกี่ยวข้องกับหุ้นแม่อย่างไร เงินปันผลคิดแบบไหน และควรระวังอะไรบ้างก่อนลงทุน</p>
        </div>
        <div className="drLearnHeroNote">
          <strong>EOD Data</strong>
          <span>ข้อมูลหลังตลาดปิด เหมาะกับการดูภาพรวม เปรียบเทียบ และติดตามแบบไม่เน้น real-time trading</span>
        </div>
      </section>

      <nav className="drLearnQuickNav" aria-label="Learn quick navigation">
        {quickNav.map(([label, href]) => (
          <a href={href} key={label}>{label}</a>
        ))}
      </nav>

      <div className="drLearnSectionStack">
        {topicGroups.map((group) => (
          <section className="drLearnSection" id={group.id} key={group.id}>
            <div className="drLearnSectionHead">
              <p className="drNewKicker">{group.kicker}</p>
              <h2>{group.title}</h2>
              <span>{group.intro}</span>
            </div>
            <div className="drLearnTopicGrid">
              {group.topics.map((topic) => (
                <article key={topic.title}>
                  <h3>{topic.title}</h3>
                  <p>{topic.body}</p>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="drLearnSection" id="risks">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Risks</p>
            <h2>ความเสี่ยงที่ควรรู้</h2>
            <span>DR มีความเสี่ยงจากหุ้นแม่ ค่าเงิน เวลาตลาด Trading Activity ต่ำ และเงื่อนไขของผู้ออก</span>
          </div>
          <div className="drLearnRiskList">
            {risks.map(([title, body], index) => (
              <article key={title}>
                <strong>{index + 1}</strong>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="drLearnSection" id="examples">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Examples</p>
            <h2>ตัวอย่างที่เจอบ่อย</h2>
            <span>ตัวอย่างสั้น ๆ ช่วยให้เห็นภาพว่า DR ต่างจากหุ้นแม่อย่างไร</span>
          </div>
          <div className="drLearnExampleGrid">
            {examples.map((example) => (
              <article key={example.title}>
                <h3>{example.title}</h3>
                <p>{example.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="drLearnSection" id="how-to-use">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Thai DR Desk</p>
            <h2>ใช้งาน Thai DR Desk อย่างไร</h2>
            <span>เลือกเมนูให้ตรงกับคำถามที่คุณอยากตอบ</span>
          </div>
          <div className="drLearnProductGrid">
            {productLinks.map(([title, body, href]) => (
              <Link href={href} key={title}>
                <strong>{title}</strong>
                <span>{body}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="drLearnSection" id="faq">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">FAQ</p>
            <h2>คำถามที่พบบ่อย</h2>
          </div>
          <div className="drLearnFaq">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="drLearnSection" id="glossary">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Glossary</p>
            <h2>คำที่ควรรู้</h2>
          </div>
          <div className="drLearnGlossary">
            {glossary.map(([term, description]) => (
              <div key={term}>
                <strong>{term}</strong>
                <span>{description}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DrNewShell>
  );
}
