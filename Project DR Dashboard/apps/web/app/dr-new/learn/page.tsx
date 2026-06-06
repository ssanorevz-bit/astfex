import Link from "next/link";
import { DrNewShell } from "../components/dr-new-shell";

export const metadata = {
  title: "Thai DR Academy",
  description: "คู่มือ DR ไทยแบบเข้าใจง่าย ครอบคลุมหุ้นแม่ Conversion Ratio ภาษี ปันผล Trading Activity ความเสี่ยง และวิธีใช้ Thai DR Desk"
};

const quickNav = [
  ["จุดเด่น", "#benefits"],
  ["DR คืออะไร", "#what-is-dr"],
  ["ต่างจากหุ้นแม่", "#comparison"],
  ["ราคา DR", "#price"],
  ["Conversion Ratio", "#conversion-ratio"],
  ["ภาษี", "#tax"],
  ["ปันผล", "#dividend"],
  ["Trading Activity", "#trading-activity"],
  ["ความเสี่ยง", "#risks"],
  ["ตัวอย่าง", "#examples"],
  ["ใช้เมนูไหน", "#how-to-use"],
  ["FAQ", "#faq"],
  ["คำศัพท์", "#glossary"]
];

const benefits = [
  {
    label: "01",
    title: "ลงทุนหุ้นโลกผ่านตลาดไทย",
    body: "เข้าถึงหุ้นหรือ ETF ต่างประเทศผ่าน DR ที่ซื้อขายในตลาดหลักทรัพย์ไทย"
  },
  {
    label: "02",
    title: "ซื้อขายเป็นเงินบาท",
    body: "ซื้อขาย DR เป็นเงินบาท โดยไม่ต้องแลกเงินเพื่อซื้อหุ้นต่างประเทศโดยตรง"
  },
  {
    label: "03",
    title: "ใช้บัญชีหุ้นไทย",
    body: "ใช้บัญชีซื้อขายหลักทรัพย์ไทยที่มีอยู่ในการซื้อขาย DR ได้"
  },
  {
    label: "Tax",
    title: "Capital Gain ได้รับยกเว้นภาษี",
    body: "กำไรจากการขาย DR ได้รับยกเว้นภาษี Capital Gain สำหรับผู้ลงทุนบุคคลธรรมดา เช่นเดียวกับหลักทรัพย์ที่ซื้อขายในตลาดหลักทรัพย์ไทย"
  }
];

const drConceptCards = [
  {
    title: "DR คือหลักทรัพย์ไทยที่อ้างอิงสินทรัพย์ต่างประเทศ",
    body: "DR ซื้อขายในตลาดหลักทรัพย์ไทย แต่ราคาและมูลค่าจะเกี่ยวข้องกับหลักทรัพย์ต่างประเทศที่เป็นสินทรัพย์อ้างอิง"
  },
  {
    title: "หุ้นแม่คืออะไร",
    body: "หุ้นแม่ หรือ Underlying คือหลักทรัพย์ต่างประเทศที่ DR อ้างอิง เช่น NVDA80 อาจอ้างอิงหุ้น NVIDIA หรือ MSFT80 อาจอ้างอิงหุ้น Microsoft"
  },
  {
    title: "Issuer คือใคร",
    body: "Issuer คือผู้ออก DR ในประเทศไทย เช่น ธนาคารหรือบริษัทหลักทรัพย์ที่ได้รับอนุญาตให้ออก DR"
  }
];

const comparisonRows = [
  ["ตลาดซื้อขาย", "ตลาดต่างประเทศ", "ตลาดหลักทรัพย์ไทย"],
  ["สกุลเงิน", "USD, HKD, JPY หรือสกุลอื่น", "THB"],
  ["บัญชีที่ใช้", "บัญชีต่างประเทศ / global trading", "บัญชีหุ้นไทย"],
  ["เวลาเปิดตลาด", "ตามประเทศของหุ้นแม่", "ตามเวลาตลาดไทย"],
  ["ราคา", "ราคาหุ้นแม่ในตลาดต้นทาง", "ราคา DR ในตลาดไทย"],
  ["ปันผล", "ตามหุ้นแม่", "ขึ้นอยู่กับเงื่อนไขของ DR และ issuer"],
  ["ภาษี", "ตามประเทศและช่องทางลงทุน", "Capital Gain ได้รับยกเว้นสำหรับบุคคลธรรมดา แต่ปันผลอาจถูกหักภาษี"]
];

const priceFactors = [
  ["ราคาหุ้นแม่", "ถ้าหุ้นแม่ในต่างประเทศขึ้นหรือลง ราคา DR มักได้รับผลกระทบตามทิศทางของหุ้นแม่"],
  ["ค่าเงิน", "DR ซื้อขายเป็นเงินบาท แต่หุ้นแม่อาจซื้อขายเป็น USD, HKD, JPY หรือสกุลอื่น ค่าเงินจึงมีผลต่อราคา DR"],
  ["Conversion Ratio", "Conversion Ratio คืออัตราที่บอกว่า DR กี่หน่วยเทียบเท่าหุ้นแม่ 1 หุ้น"],
  ["Trading Activity", "ราคา DR ในตลาดไทยอาจได้รับผลจากความคึกคักของการซื้อขาย ปริมาณคำสั่งซื้อขาย และส่วนต่าง Bid / Ask"],
  ["เวลาตลาดที่ต่างกัน", "ตลาดไทยและตลาดต่างประเทศอาจเปิดไม่พร้อมกัน ทำให้ราคา DR บางช่วงสะท้อนข้อมูลล่าสุดไม่เท่ากับหุ้นแม่"]
];

const taxCards = [
  {
    title: "ขายมีกำไร",
    value: "Capital Gain",
    body: "กำไรจากการขาย DR ได้รับยกเว้นภาษี Capital Gain สำหรับผู้ลงทุนบุคคลธรรมดา เช่นเดียวกับหลักทรัพย์ที่ซื้อขายผ่านตลาดหลักทรัพย์ไทย"
  },
  {
    title: "ได้เงินปันผล",
    value: "Withholding Tax",
    body: "เงินปันผลหรือเงินเทียบเท่าเงินปันผลจาก DR อาจถูกหักภาษี ณ ที่จ่ายตามเงื่อนไขที่เกี่ยวข้อง"
  },
  {
    title: "ควรตรวจสอบ",
    value: "Issuer Docs",
    body: "ผู้ลงทุนควรตรวจสอบข้อกำหนดสิทธิ เอกสารจากผู้ออก DR และข้อมูลภาษีที่เกี่ยวข้องก่อนลงทุน"
  }
];

const dividendCards = [
  ["เงินปันผลของ DR", "DR บางตัวอาจมีการจ่ายเงินปันผล หากหุ้นแม่หรือ ETF อ้างอิงมีการจ่ายปันผล และเป็นไปตามเงื่อนไขของ DR นั้น"],
  ["XD Date", "XD Date คือวันที่ผู้ซื้อ DR หลังจากวันดังกล่าวจะไม่ได้รับสิทธิเงินปันผลรอบนั้น ผู้ลงทุนที่ต้องการรับปันผลควรถือ DR ก่อนวัน XD ตามเงื่อนไขของตลาด"],
  ["Payment Date", "Payment Date คือวันที่จ่ายเงินปันผลให้ผู้ถือ DR โดยจำนวนเงินที่ได้รับอาจถูกแปลงเป็นเงินบาทและอาจมีค่าใช้จ่ายหรือภาษีที่เกี่ยวข้อง"],
  ["ทำไมเงินปันผล DR อาจต่างจากหุ้นแม่", "เพราะมีปัจจัยเรื่อง Conversion Ratio ค่าเงิน ค่าใช้จ่าย ภาษี และเงื่อนไขของผู้ออก DR"]
];

const activityCards = [
  ["Trading Value คืออะไร", "Trading Value คือมูลค่าการซื้อขายรวมของ DR ในตลาดไทย เช่น มีการซื้อขายรวม 50 ล้านบาทในวันนั้น"],
  ["Volume คืออะไร", "Volume คือจำนวนหน่วย DR ที่มีการซื้อขาย เช่น ซื้อขายรวม 1,000,000 หน่วย"],
  ["Trading Value vs Volume", "Volume บอกจำนวนหน่วยที่ซื้อขาย ส่วน Trading Value บอกมูลค่าเป็นเงินบาท หากต้องการดูความคึกคักในเชิงเม็ดเงิน Trading Value มักให้ภาพที่ชัดกว่า"],
  ["ถ้าหุ้นแม่ใหญ่ แต่ DR ซื้อขายน้อย", "DR ที่อ้างอิงหุ้นใหญ่ไม่ได้แปลว่ามีการซื้อขายในไทยสูงเสมอไป ผู้ลงทุนควรดู Trading Value, Volume และ Bid / Ask Spread ก่อนตัดสินใจ"]
];

const risks = [
  ["ความเสี่ยงจากหุ้นแม่", "ราคาหุ้นแม่หรือ ETF อ้างอิงในต่างประเทศอาจผันผวนตามปัจจัยของตลาดต้นทาง"],
  ["ความเสี่ยงจากค่าเงิน", "DR ซื้อขายเป็นเงินบาท แต่หุ้นแม่อาจซื้อขายเป็น USD, HKD, JPY หรือสกุลเงินอื่น ค่าเงินจึงมีผลต่อราคา DR"],
  ["ความเสี่ยงจากเวลาตลาด", "ตลาดไทยและตลาดต่างประเทศเปิดไม่พร้อมกัน ทำให้ราคา DR และราคาอ้างอิงของหุ้นแม่อาจสะท้อนข้อมูลต่างช่วงเวลา"],
  ["ความเสี่ยงจาก Trading Activity ต่ำ", "DR บางตัวอาจมีมูลค่าซื้อขายไม่สูง ทำให้การซื้อขายจริงอาจไม่ลื่นเท่าหุ้นแม่หรือ DR ที่ active กว่า"],
  ["ความเสี่ยงจากผู้ออก DR", "เงื่อนไข สิทธิประโยชน์ ค่าใช้จ่าย และกระบวนการต่าง ๆ ขึ้นอยู่กับผู้ออก DR และเอกสารที่เกี่ยวข้อง"],
  ["ความเสี่ยงที่ราคา DR อาจต่างจากหุ้นแม่", "ในบางช่วง ราคา DR อาจไม่เคลื่อนไหวเท่ากับหุ้นแม่โดยตรง เพราะผลของค่าเงิน Conversion Ratio สภาพคล่อง และเวลาตลาด"]
];

const examples = [
  {
    title: "ตัวอย่าง Conversion Ratio",
    body: "สมมติ MSFT06 มี Conversion Ratio = 5,000 DR = 1 MSFT หมายความว่า MSFT06 จำนวน 5,000 หน่วยมีมูลค่าอ้างอิงเทียบกับหุ้น MSFT จำนวน 1 หุ้น ก่อนคำนวณค่าเงินและปัจจัยอื่น ๆ"
  },
  {
    title: "ตัวอย่าง DR กับหุ้นแม่",
    body: "หุ้นแม่ MSFT ซื้อขายที่ Nasdaq เป็น USD แต่ DR อย่าง MSFT06 ซื้อขายในตลาดไทยเป็น THB ราคาทั้งสองอาจเคลื่อนไหวไม่ตรงกันทุกเวลา เพราะตลาดเปิดคนละช่วงและมีค่าเงินเข้ามาเกี่ยวข้อง"
  },
  {
    title: "ตัวอย่างเงินปันผล DR",
    body: "หุ้นแม่อาจประกาศปันผลเป็น USD และมีวัน XD ในตลาดต่างประเทศ แต่ DR ในไทยอาจมีวัน XD และวันจ่ายเงินคนละวัน โดยผู้ลงทุนอาจได้รับเงินเป็น THB ตามเงื่อนไขของผู้ออก DR"
  }
];

const productLinks = [
  ["อยากหาหุ้นโลกที่ซื้อผ่าน DR ได้", "ไปที่ DR Screener เพื่อค้นหา DR และหุ้นแม่ที่มีให้ซื้อขายในไทย กรองตามประเทศ ธีม ประเภทสินทรัพย์ และจัดเรียงตามตัวชี้วัดหลัก", "/dr-new"],
  ["อยากดูตัวที่ขึ้นลงแรง", "ไปที่ Market Map เพื่อดูภาพรวมว่าหุ้นหรือ DR underlying ตัวไหนขยับแรง กลุ่มไหนนำตลาด และตัวไหนควรตรวจสอบต่อ", "/dr-new/market-map"],
  ["อยากดูปันผล", "ไปที่ Dividends เพื่อติดตาม Upcoming XD, Payment Soon และประวัติการจ่ายเงินปันผลของ DR", "/dr-new/dividends"],
  ["อยากเทียบ DR หลายตัวของหุ้นแม่เดียวกัน", "ไปที่ Compare DRs เพื่อเปรียบเทียบ DR หลายตัวที่อ้างอิงหุ้นแม่เดียวกัน ดู issuer ราคา DR จำนวน DR ที่มี และข้อมูลสำคัญอื่น", "/dr-new/compare"],
  ["อยากดู Event สำคัญ", "ไปที่ Calendar เพื่อติดตาม XD Date, Payment Date, earnings, listings, market holidays และ event ที่เกี่ยวข้อง", "/dr-new/calendar"]
];

const faqs = [
  ["ทำไมราคา DR ไม่เท่าหุ้นแม่", "เพราะ DR ซื้อขายเป็นเงินบาท มี Conversion Ratio มีเวลาซื้อขายต่างจากตลาดต้นทาง และอาจได้รับผลจากค่าเงิน สภาพคล่อง และแรงซื้อขายในตลาดไทย"],
  ["DR ได้ปันผลไหม", "DR บางตัวอาจได้รับเงินปันผลหรือเงินเทียบเท่าเงินปันผล ถ้าหลักทรัพย์อ้างอิงมีการจ่ายปันผลและเป็นไปตามเงื่อนไขของผู้ออก DR"],
  ["กำไรจากการขาย DR เสียภาษีไหม", "สำหรับผู้ลงทุนบุคคลธรรมดา กำไรจากการขาย DR ได้รับยกเว้นภาษี Capital Gain เช่นเดียวกับหลักทรัพย์ที่ซื้อขายผ่านตลาดหลักทรัพย์ไทย"],
  ["เงินปันผล DR เสียภาษีไหม", "เงินปันผลหรือเงินเทียบเท่าเงินปันผลจาก DR อาจถูกหักภาษี ณ ที่จ่ายตามเงื่อนไขที่เกี่ยวข้อง ผู้ลงทุนควรตรวจสอบข้อมูลจากผู้ออก DR และเอกสารประกอบ"],
  ["ทำไมเว็บใช้ EOD Data", "ข้อมูล EOD หรือ End-of-Day เหมาะกับการดูภาพรวม เปรียบเทียบ และคัดกรองอย่างนิ่ง เพราะลด noise จากการเคลื่อนไหวระหว่างวัน"],
  ["ถ้าหุ้นแม่เดียวกันมีหลาย DR ควรดูอะไร", "ควรเปรียบเทียบ issuer ราคา DR จำนวน DR ที่มี Conversion Ratio Trading Activity และเงื่อนไขที่เกี่ยวข้อง เพื่อเลือก DR ที่เหมาะกับการลงทุนของตนเอง"],
  ["Volume ต่างจาก Trading Value อย่างไร", "Volume คือจำนวนหน่วยที่ซื้อขาย ส่วน Trading Value คือมูลค่าซื้อขายเป็นเงินบาท หากต้องการดูความคึกคักเชิงเม็ดเงิน Trading Value มักชัดกว่า"]
];

const glossary = [
  ["Underlying", "หุ้นหรือ ETF ต่างประเทศที่ DR อ้างอิง"],
  ["Issuer", "ผู้ออก DR ในประเทศไทย เช่น ธนาคารหรือบริษัทหลักทรัพย์"],
  ["DR Price", "ราคาซื้อขายของ DR ในตลาดไทย เป็นเงินบาท"],
  ["Underlying Price", "ราคาของหุ้นหรือ ETF อ้างอิงในตลาดต้นทาง"],
  ["Conversion Ratio", "อัตราที่บอกว่า DR กี่หน่วยเทียบเท่ากับหุ้นแม่ 1 หุ้น"],
  ["Trading Value", "มูลค่าการซื้อขายของ DR ในตลาดไทย"],
  ["Volume", "จำนวนหน่วย DR ที่มีการซื้อขาย"],
  ["Trading Activity", "ภาพรวมความคึกคักของการซื้อขาย โดยดูจาก Trading Value, Volume และสภาพคล่อง"],
  ["XD Date", "วันที่ผู้ซื้อหลังจากวันดังกล่าวจะไม่ได้รับสิทธิเงินปันผลรอบนั้น"],
  ["Payment Date", "วันที่จ่ายเงินปันผลให้ผู้ถือ DR"],
  ["Dividend Yield", "อัตราผลตอบแทนจากเงินปันผลเมื่อเทียบกับราคา"],
  ["EOD Data", "ข้อมูลหลังตลาดปิด เหมาะกับการดูภาพรวมและเปรียบเทียบอย่างนิ่ง"],
  ["Theme", "กลุ่มการลงทุน เช่น AI & Semiconductor, Cloud & Software, China Tech, EV & Battery"],
  ["Asset Type", "ประเภทสินทรัพย์สำหรับ UI เช่น Stock, ETF, Commodity หรือ Bond"],
  ["Capital Gain", "กำไรจากส่วนต่างราคาซื้อและราคาขาย"],
  ["Withholding Tax", "ภาษีหัก ณ ที่จ่าย"]
];

const referenceLinks = [
  ["SET DR Introduction", "https://www.set.or.th/en/market/product/dr/introduction"],
  ["SEC Depositary Receipt", "https://www.sec.or.th/TH/Pages/INVESTORS/DR.aspx"],
  ["SET Tax Information", "https://www.set.or.th/th/market/information/tax"]
];

export default function DrNewLearnPage() {
  return (
    <DrNewShell active="learn" title="Learn" subtitle="คู่มือ DR ไทยแบบเข้าใจง่าย">
      <section className="drLearnHero">
        <div>
          <span className="drRankingBadge">DR Academy</span>
          <h2>ทางเข้าหุ้นโลกผ่านตลาดไทย</h2>
          <p>ลงทุนหุ้นโลกผ่านตลาดไทย ซื้อขายเป็นเงินบาท และเข้าใจสิ่งที่ต้องเช็กก่อนลงทุน</p>
        </div>
        <div className="drLearnHeroNote">
          <strong>ก่อนซื้อ DR ควรรู้อะไร</strong>
          <span>หุ้นแม่, ค่าเงิน, Conversion Ratio, Trading Activity, ปันผล, ภาษี และเงื่อนไขของ issuer</span>
        </div>
      </section>

      <nav className="drLearnQuickNav" aria-label="Learn quick navigation">
        {quickNav.map(([label, href]) => (
          <a href={href} key={label}>{label}</a>
        ))}
      </nav>

      <div className="drLearnSectionStack">
        <section className="drLearnSection" id="benefits">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Key Benefits</p>
            <h2>ทำไมต้องรู้จัก DR</h2>
            <span>DR ช่วยให้นักลงทุนไทยเข้าถึงหลักทรัพย์ต่างประเทศได้ง่ายขึ้น ผ่านตลาดหลักทรัพย์ไทย</span>
          </div>
          <div className="drLearnBenefitGrid">
            {benefits.map((benefit) => (
              <article key={benefit.title}>
                <span>{benefit.label}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.body}</p>
              </article>
            ))}
          </div>
          <p className="drLearnFootnote">หมายเหตุ: เงินปันผลหรือเงินเทียบเท่าเงินปันผลจาก DR อาจถูกหักภาษี ณ ที่จ่ายตามเงื่อนไขที่เกี่ยวข้อง</p>
        </section>

        <section className="drLearnSection" id="what-is-dr">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Start Here</p>
            <h2>DR คืออะไร</h2>
            <span>DR หรือ Depositary Receipt คือหลักทรัพย์ที่จดทะเบียนซื้อขายในตลาดหลักทรัพย์ไทย โดยมีหลักทรัพย์ต่างประเทศ เช่น หุ้นหรือ ETF เป็นสินทรัพย์อ้างอิง</span>
          </div>
          <div className="drLearnFlow" aria-label="DR structure flow">
            <div>หุ้นหรือ ETF ต่างประเทศ</div>
            <span>ลงมาอ้างอิง</span>
            <div>ผู้ออก DR นำหลักทรัพย์นั้นมาอ้างอิง</div>
            <span>จดทะเบียนในไทย</span>
            <div>นักลงทุนไทยซื้อขาย DR เป็นเงินบาทใน SET</div>
          </div>
          <div className="drLearnTopicGrid">
            {drConceptCards.map((card) => (
              <article key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="drLearnSection" id="comparison">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Underlying vs DR</p>
            <h2>DR ต่างจากหุ้นแม่อย่างไร</h2>
            <span>DR อ้างอิงหุ้นหรือ ETF ต่างประเทศ แต่ไม่ได้ซื้อขายในตลาดต่างประเทศโดยตรง จึงอาจมีราคา เวลาซื้อขาย สภาพคล่อง และเงื่อนไขที่ต่างจากหุ้นแม่</span>
          </div>
          <div className="drLearnCompareTable" role="table" aria-label="Underlying versus DR comparison">
            <div className="header" role="row">
              <span role="columnheader">หัวข้อ</span>
              <span role="columnheader">หุ้นแม่</span>
              <span role="columnheader">DR</span>
            </div>
            {comparisonRows.map(([topic, underlying, dr]) => (
              <div role="row" key={topic}>
                <strong role="cell">{topic}</strong>
                <span role="cell">{underlying}</span>
                <span role="cell">{dr}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="drLearnSection" id="price">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Price Mechanics</p>
            <h2>ราคา DR มาจากอะไร</h2>
            <span>ราคา DR ไม่จำเป็นต้องเท่ากับราคาหุ้นแม่โดยตรง เพราะ DR ซื้อขายเป็นเงินบาท มี Conversion Ratio และซื้อขายในตลาดไทยซึ่งมีสภาพคล่องและเวลาซื้อขายต่างจากตลาดต้นทาง</span>
          </div>
          <div className="drLearnFactorGrid">
            {priceFactors.map(([title, body], index) => (
              <article key={title}>
                <strong>{index + 1}</strong>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="drLearnSection" id="conversion-ratio">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Conversion Ratio</p>
            <h2>Conversion Ratio คืออะไร</h2>
            <span>Conversion Ratio คืออัตราที่บอกว่า DR กี่หน่วยเทียบเท่ากับหุ้นแม่ 1 หุ้น</span>
          </div>
          <div className="drLearnRatioPanel">
            <div>
              <span>ตัวอย่าง</span>
              <strong>10 DR = 1 MSFT</strong>
            </div>
            <p>ถ้าหุ้น MSFT มีราคาเทียบเป็นเงินบาทประมาณ 3,500 บาท ราคาเชิงทฤษฎีของ 1 DR อาจอยู่ประมาณ 350 บาท ก่อนพิจารณาผลของค่าเงิน สภาพคล่อง ค่าธรรมเนียม และแรงซื้อขายในตลาด</p>
            <small>Conversion Ratio ช่วยให้ราคาต่อหน่วยของ DR เข้าถึงง่ายขึ้น แต่ไม่ได้ทำให้ความเสี่ยงของหลักทรัพย์อ้างอิงหายไป</small>
          </div>
        </section>

        <section className="drLearnSection drLearnTaxSection" id="tax">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Tax</p>
            <h2>ภาษีของ DR แบบเข้าใจง่าย</h2>
            <span>จุดเด่นสำคัญของ DR คือกำไรจากการขายได้รับยกเว้นภาษี Capital Gain สำหรับผู้ลงทุนบุคคลธรรมดา แต่เงินปันผลยังมีเงื่อนไขที่ควรตรวจสอบ</span>
          </div>
          <div className="drLearnTaxGrid">
            {taxCards.map((card) => (
              <article key={card.title}>
                <span>{card.title}</span>
                <strong>{card.value}</strong>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
          <div className="drLearnTaxSummary">
            <strong>สรุปง่าย ๆ</strong>
            <span>ขายมีกำไร = ได้รับยกเว้นภาษี Capital Gain สำหรับผู้ลงทุนบุคคลธรรมดา</span>
            <span>ได้เงินปันผล = อาจมีภาษีหัก ณ ที่จ่าย</span>
          </div>
          <p className="drLearnDisclaimer">ข้อมูลภาษีอาจขึ้นอยู่กับประเภทผู้ลงทุน เงื่อนไขของ DR และกฎหมายที่เกี่ยวข้อง ข้อมูลนี้เป็นเพียงข้อมูลทั่วไป ไม่ใช่คำแนะนำด้านภาษีเฉพาะบุคคล</p>
        </section>

        <section className="drLearnSection" id="dividend">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Dividend</p>
            <h2>เงินปันผลของ DR</h2>
            <span>DR บางตัวอาจมีการจ่ายเงินปันผล ถ้าหลักทรัพย์อ้างอิงมีการจ่ายเงินปันผล และเป็นไปตามเงื่อนไขของผู้ออก DR</span>
          </div>
          <div className="drLearnTopicGrid">
            {dividendCards.map(([title, body]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="drLearnSection" id="trading-activity">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Trading Activity</p>
            <h2>การซื้อขายและมูลค่าซื้อขาย</h2>
            <span>Trading Activity คือภาพรวมความคึกคักของการซื้อขาย DR ในตลาดไทย ไม่ได้ดูแค่ราคาขึ้นลง แต่ควรดูทั้งมูลค่าซื้อขาย จำนวนหน่วยที่ซื้อขาย และส่วนต่างราคาซื้อขาย</span>
          </div>
          <div className="drLearnTopicGrid">
            {activityCards.map(([title, body]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="drLearnSection" id="risks">
          <div className="drLearnSectionHead">
            <p className="drNewKicker">Risks</p>
            <h2>ความเสี่ยงที่ควรรู้</h2>
            <span>DR ช่วยให้เข้าถึงหุ้นต่างประเทศได้ง่ายขึ้น แต่ยังมีความเสี่ยงที่ควรเข้าใจก่อนลงทุน</span>
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

        <section className="drLearnReferences" aria-label="Reference sources">
          <div>
            <strong>Reference Sources</strong>
            <span>ข้อมูลเพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุนหรือคำแนะนำภาษีเฉพาะบุคคล</span>
          </div>
          <div>
            {referenceLinks.map(([label, href]) => (
              <a href={href} key={label} target="_blank" rel="noreferrer">{label}</a>
            ))}
          </div>
        </section>
      </div>
    </DrNewShell>
  );
}
