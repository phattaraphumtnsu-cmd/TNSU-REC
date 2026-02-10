
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType } from "docx";

export const generateWordManual = async () => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // TITLE PAGE
          new Paragraph({
            text: "คู่มือการใช้งานระบบสารสนเทศเพื่อการจัดการจริยธรรมการวิจัยในมนุษย์",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: "มหาวิทยาลัยการกีฬาแห่งชาติ (TNSU-REC System)",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
          }),
          new Paragraph({
            text: `ฉบับปรับปรุงล่าสุด: ${new Date().toLocaleDateString('th-TH')}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 2000 }, // Page break roughly
          }),

          // INTRODUCTION
          new Paragraph({
            text: "1. บทนำและภาพรวมระบบ (Introduction)",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
                new TextRun("ระบบ TNSU-REC พัฒนาขึ้นเพื่ออำนวยความสะดวกในการยื่นขอและพิจารณาจริยธรรมการวิจัยในมนุษย์ โดยเปลี่ยนจากรูปแบบเอกสารกระดาษ (Paper-based) มาเป็นระบบดิจิทัล (Digital Workflow) เต็มรูปแบบ ซึ่งช่วยลดระยะเวลาในการเดินเอกสาร ลดความผิดพลาด และสามารถติดตามสถานะได้แบบ Real-time")
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
          }),

          // ROLES
          new Paragraph({
            text: "2. บทบาทและสิทธิ์การใช้งาน (User Roles)",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          createBulletPoint("ผู้วิจัย (Researcher): ยื่นคำขอ, แก้ไขเอกสาร, รับใบรับรอง"),
          createBulletPoint("อาจารย์ที่ปรึกษา (Advisor): คัดกรองโครงการของนักศึกษาในที่ปรึกษา"),
          createBulletPoint("กรรมการ (Reviewer): ประเมินคุณภาพโครงการและลงมติ"),
          createBulletPoint("ผู้ดูแลระบบ (Admin): ตรวจสอบเบื้องต้น, มอบหมายกรรมการ, ออกใบรับรอง, จัดการผู้ใช้งาน"),

          // WORKFLOW DETAILED
          new Paragraph({
            text: "3. ขั้นตอนการดำเนินงานเชิงลึก (Detailed Workflow)",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          
          new Paragraph({
            text: "3.1 การลงทะเบียนและเตรียมไฟล์ (Pre-Submission)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            text: "เทคนิคสำคัญ: ระบบใช้ Google Drive Link แทนการอัปโหลดไฟล์ตรง เพื่อรองรับไฟล์ขนาดใหญ่และลดภาระ Server. สิ่งสำคัญที่สุดคือการตั้งค่า Permission.",
            spacing: { after: 200 },
          }),
          createStep("สร้าง Folder ใน Google Drive"),
          createStep("อัปโหลดไฟล์ PDF (แยกไฟล์ตามประเภท เช่น แบบคำขอ, โครงร่าง, เครื่องมือ)"),
          createStep("คลิกขวาที่ Folder > Share > เปลี่ยน General Access เป็น 'Anyone with the link' (Viewer)"),
          createStep("คัดลอกลิงก์มาวางในระบบ"),

          new Paragraph({
            text: "3.2 กระบวนการพิจารณา (Review Process)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),
          createTable([
             ["สถานะ (Status)", "ความหมาย", "สิ่งที่ต้องทำ"],
             ["รอเจ้าหน้าที่ตรวจสอบ", "Admin กำลังตรวจความครบถ้วน", "รอ 1-3 วันทำการ"],
             ["เอกสารไม่ถูกต้อง", "Admin ส่งคืนให้แก้ไขรายละเอียด", "ดูหมายเหตุและส่งใหม่"],
             ["อยู่ระหว่างพิจารณา", "ส่งให้กรรมการแล้ว", "รอผล 7-14 วัน"],
             ["แก้ไขตามข้อเสนอแนะ", "กรรมการมีมติให้แก้ไข (Minor/Major)", "แก้ไฟล์ใน Drive และกดส่ง Revision"],
             ["อนุมัติ (รอใบรับรอง)", "ผ่านการพิจารณาแล้ว รอ Admin ออกเลข", "รอ E-Certificate"],
          ]),

          // TROUBLESHOOTING
          new Paragraph({
            text: "4. การแก้ปัญหาทางเทคนิค (Troubleshooting)",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({ text: "ปัญหา: กรรมการเปิดไฟล์ไม่ได้", heading: HeadingLevel.HEADING_3 }),
          new Paragraph({ text: "วิธีแก้: กลับไปที่ Google Drive ตรวจสอบว่าแชร์แบบ Anyone with the link หรือไม่ (ห้ามแชร์เฉพาะอีเมล)", spacing: { after: 200 } }),
          
          new Paragraph({ text: "ปัญหา: ไม่ได้รับอีเมลแจ้งเตือน", heading: HeadingLevel.HEADING_3 }),
          new Paragraph({ text: "วิธีแก้: ตรวจสอบ Junk Mail / Spam หรือดูที่กระดิ่งแจ้งเตือนในระบบแทน", spacing: { after: 200 } }),

          new Paragraph({ text: "ปัญหา: ปุ่มกดไม่ได้ (สีเทา)", heading: HeadingLevel.HEADING_3 }),
          new Paragraph({ text: "วิธีแก้: ตรวจสอบว่ากรอกข้อมูลครบถ้วน หรือติ๊กถูกช่องยืนยัน (Checkbox) แล้วหรือไม่", spacing: { after: 200 } }),

          // FOOTER
          new Paragraph({
            text: "--- เอกสารนี้จัดทำโดยระบบอัตโนมัติ TNSU-REC ---",
            alignment: AlignmentType.CENTER,
            spacing: { before: 800 },
            color: "888888"
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  
  // Native download implementation to avoid module import issues with file-saver
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "TNSU_REC_User_Manual.docx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

// Helper Functions
function createBulletPoint(text: string): Paragraph {
    return new Paragraph({
        text: text,
        bullet: { level: 0 },
        spacing: { after: 100 },
    });
}

function createStep(text: string): Paragraph {
    return new Paragraph({
        text: text,
        bullet: { level: 0 }, // Using bullet logic but functionally steps
        spacing: { after: 100 },
    });
}

function createTable(rows: string[][]): Table {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows.map((row, i) => 
            new TableRow({
                children: row.map(cellText => 
                    new TableCell({
                        children: [new Paragraph({ 
                            text: cellText, 
                            indent: { left: 100 },
                            spacing: { before: 100, after: 100 }
                        })],
                        width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
                        shading: i === 0 ? { fill: "EEEEEE" } : undefined,
                    })
                ),
            })
        ),
    });
}
