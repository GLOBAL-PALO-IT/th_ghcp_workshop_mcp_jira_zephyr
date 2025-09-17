### [NEW] Story: ตาราง Emission Factors
**ชื่อ Story:** แสดงตาราง Emission Factors ใน Dashboard
**user story:**
- ในฐานะผู้ใช้งาน ฉันต้องการเห็นข้อมูล Emission Factors ในรูปแบบตาราง เพื่อที่ฉันจะได้ดูรายละเอียดและเปรียบเทียบข้อมูลได้ง่าย

**Acceptance Criteria:**
- ตารางต้องแสดงข้อมูล Emission Factors (ID, Name, Category, Value, Unit, Source, Last Updated, Status, Usage, Actions) ครบถ้วน
- ตารางต้องรองรับการแสดงผลข้อมูลจำนวนมาก (scroll/pagination)
- ตารางต้องสามารถ sort ข้อมูลแต่ละ column ได้
- ตารางต้องรองรับ responsive (desktop/mobile)
- ตารางต้องแสดงข้อความ "ไม่พบข้อมูล" เมื่อไม่มีข้อมูล

| Given | When | Then |
|-------|------|------|
| มีข้อมูล Emission Factors | ผู้ใช้เปิดหน้า Dashboard | ตารางแสดงข้อมูลครบถ้วน |
| ไม่มีข้อมูล | ผู้ใช้เปิดหน้า Dashboard | ตารางแสดงข้อความ "ไม่พบข้อมูล" |
| ข้อมูลเกิน 1 หน้า | ผู้ใช้ scroll หรือเปลี่ยนหน้า | ตารางแสดงข้อมูลหน้าที่เลือก |
| ผู้ใช้คลิกหัว column |  | ตาราง sort ตาม column ที่เลือก |

**Priority:** High

**Story Points:** 3

**Notes:**
- ต้องแสดงผลข้อมูลถูกต้องตาม Figma node 12-488
- รองรับการใช้งานทั้ง desktop และ mobile


# สรุปข้อมูลสำหรับ Migration Jira/Zephyr (1:1)

---

## Epic (Jira)
**ชื่อ Epic:** UI Dashboard (Figma 12-488)

**คำอธิบาย:**
- สร้างหรือพัฒนา UI Dashboard สำหรับระบบ MCP โดยอ้างอิงดีไซน์จาก Figma node 12-488 ([Figma Link](https://www.figma.com/design/pkCT6YDfcnEVOOTS2HIDOg/POC-FIGMA-MCP?node-id=12-488&t=jeTsk8zEsa7Vkwp7-4)) และรายละเอียดใน Confluence page
- Dashboard นี้จะแสดงข้อมูล Emission Factors ในรูปแบบ Table พร้อมฟีเจอร์ค้นหา กรองข้อมูล Import/Export, Tab, Pagination และเมนูนำทางสำหรับเข้าถึงฟีเจอร์ต่าง ๆ เช่น Emission Factors, Data Query, Currency, Account Management, Notifications, Settings
- รองรับการแสดงผลข้อมูลที่ถูกต้องและตอบสนองต่อการใช้งานของผู้ใช้

**Business Value:**
- เพิ่มประสิทธิภาพการบริหารจัดการข้อมูล Emission Factors
- ช่วยให้ผู้ใช้สามารถเข้าถึงและจัดการข้อมูลได้สะดวก รวดเร็ว และแม่นยำ
- รองรับการขยายฟีเจอร์ในอนาคตและปรับปรุงประสบการณ์ผู้ใช้

**Deliverables:**
- UI Dashboard ที่แสดงข้อมูล Emission Factors ตามสเปก
- ฟีเจอร์ Table, Search, Filter, Import/Export, Tab, Pagination, Navigation Menu
- เอกสารคู่มือการใช้งานเบื้องต้น

---

## Stories (Jira)

### ECS-57: ค้นหา Emission Factors ใน Dashboard
**user story:**
- ในฐานะผู้ใช้งานระบบ ฉันต้องการค้นหาข้อมูลหมวด Emission Factors ด้วยคำค้น เพื่อที่จะดึงข้อมูลที่ต้องการได้รวดเร็ว

**Acceptance Criteria:**
| Given | When | Then |
| --- | --- | --- |
| มีข้อมูล Emission Factors | ผู้ใช้กรอกคำค้นในช่องค้นหา | ตารางแสดงเฉพาะข้อมูลที่ตรงกับคำค้น |
| ไม่มีข้อมูลตรงกับคำค้น |  | ตารางแสดงข้อความ "ไม่พบข้อมูล" |
| ผู้ใช้ลบคำค้น |  | ตารางแสดงข้อมูลทั้งหมด |

**Priority:** High
**Story Points:** 2
**Notes:** รองรับการค้นหาทั้งภาษาไทยและอังกฤษ

#### Subtasks:
- ออกแบบ UI (ECS-62)
- พัฒนา backend (ECS-63)
- เขียน test (ECS-64)

---

### ECS-58: กรองข้อมูล Emission Factors ด้วย Combobox
**user story:**
- ในฐานะผู้ใช้งานระบบ ฉันต้องการกรองข้อมูล Emission Factors ตาม Category หรือ Status เพื่อให้ดูข้อมูลกลุ่มใดกลุ่มหนึ่งได้ง่ายขึ้น

**Acceptance Criteria:**
| Given | When | Then |
| --- | --- | --- |
| มี Combobox สำหรับเลือก Category/Status | ผู้ใช้เลือกค่าใน Combobox | ตารางแสดงข้อมูลที่ตรงกับเงื่อนไข |
| ไม่มีข้อมูลตรงกับเงื่อนไข |  | ตารางแสดงข้อความ "ไม่พบข้อมูล" |
| ผู้ใช้เลือก "ทั้งหมด" |  | ตารางแสดงข้อมูลทั้งหมด |

**Priority:** Medium
**Story Points:** 2
**Notes:** สามารถเลือกกรองได้มากกว่า 1 เงื่อนไขพร้อมกัน

#### Subtasks:
- ออกแบบ UI (ECS-65)
- พัฒนา backend (ECS-66)
- เขียน test (ECS-67)

---

### ECS-59: Import/Export ข้อมูล Emission Factors
**user story:**
- ในฐานะผู้ใช้งานระบบ ฉันต้องการนำเข้าและส่งออกข้อมูล Emission Factors เป็นไฟล์ .csv หรือ .xlsx เพื่อความสะดวกในการจัดการข้อมูล

**Acceptance Criteria:**
| Given | When | Then |
| --- | --- | --- |
| มีปุ่ม Import | ผู้ใช้คลิก Import และเลือกไฟล์ที่ถูกต้อง | ระบบนำเข้าข้อมูลและแสดงผลในตาราง |
| มีปุ่ม Export | ผู้ใช้คลิก Export | ระบบดาวน์โหลดไฟล์ข้อมูล Emission Factors |
| ไฟล์นำเข้าไม่ถูกต้อง |  | ระบบแจ้งเตือนข้อผิดพลาด |

**Priority:** High
**Story Points:** 3
**Notes:** รองรับไฟล์ .csv และ .xlsx

#### Subtasks:
- ออกแบบ UI (ECS-68)
- พัฒนา backend (ECS-69)
- เขียน test (ECS-70)

---

### ECS-60: เปลี่ยน Tab เพื่อดูข้อมูลหมวดอื่น
**user story:**
- ในฐานะผู้ใช้งานระบบ ฉันต้องการเปลี่ยน Tab เพื่อดูข้อมูลหมวด Emission Factors อื่น ๆ ได้อย่างรวดเร็ว

**Acceptance Criteria:**
| Given | When | Then |
| --- | --- | --- |
| มี Tab หลายหมวด | ผู้ใช้คลิกเปลี่ยน Tab | ตารางแสดงข้อมูลของ Tab ที่เลือก |

**Priority:** Medium
**Story Points:** 1
**Notes:** ต้องแสดง Tab ที่ active อย่างชัดเจน

#### Subtasks:
- ออกแบบ UI (ECS-71)
- พัฒนา backend (ECS-72)
- เขียน test (ECS-73)

---

### ECS-61: Pagination ในตาราง Emission Factors
**user story:**
- ในฐานะผู้ใช้งานระบบ ฉันต้องการดูข้อมูล Emission Factors แบบแบ่งหน้า (Pagination) เพื่อให้ดูข้อมูลจำนวนมากได้สะดวก

**Acceptance Criteria:**
| Given | When | Then |
| --- | --- | --- |
| ข้อมูลมีมากกว่า 1 หน้า | ผู้ใช้คลิกเปลี่ยนหน้า | ตารางแสดงข้อมูลหน้าที่เลือก |

**Priority:** Medium
**Story Points:** 1
**Notes:** ต้องแสดงจำนวนหน้าทั้งหมดและหน้าปัจจุบัน

#### Subtasks:
- ออกแบบ UI (ECS-74)
- พัฒนา backend (ECS-75)
- เขียน test (ECS-76)

---

## ลิงก์อ้างอิง
- Figma: https://www.figma.com/design/pkCT6YDfcnEVOOTS2HIDOg/POC-FIGMA-MCP?node-id=12-488&t=jeTsk8zEsa7Vkwp7-4
- Confluence: [ใส่ลิงก์ Confluence ที่เกี่ยวข้อง]
- Zephyr: [ใส่ลิงก์ Zephyr Test Case ที่เกี่ยวข้อง]

