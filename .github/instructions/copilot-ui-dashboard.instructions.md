# Copilot Instructions: UI Dashboard (Figma 12-488)

## Objective
- สร้างหรือพัฒนา UI Dashboard ตามสเปกที่อ้างอิงจาก Figma node 12-488 และ Confluence page

## Reference
- Figma: https://www.figma.com/design/pkCT6YDfcnEVOOTS2HIDOg/POC-FIGMA-MCP?node-id=12-488&t=jeTsk8zEsa7Vkwp7-4
- Confluence: [UI Dashboard Spec (Figma 12-488)](https://paknarathip.atlassian.net/wiki/spaces/SD/pages/1179677/UI+Dashboard+Spec+Figma+12-488)

## Feature Details
- แสดงข้อมูล Emission Factors ในรูปแบบ Table (ID, Name, Category, Value, Unit, Source, Last Updated, Status, Usage, Actions)
- มีเมนูนำทาง (Dashboard, Emission Factors, Data Query, Currency, Account Management, Notifications, Settings)
- ปุ่ม Import, Export, Save changes, Logout
- ระบบ Tab และ Pagination
- ช่องค้นหาและ Combobox สำหรับกรองข้อมูล

## Flow การใช้งาน
1. ผู้ใช้เข้าสู่หน้า Dashboard จะเห็นเมนูนำทางด้านซ้ายและข้อมูล Emission Factors ตรงกลาง
2. สามารถค้นหา/กรองข้อมูล Emission Factors ได้
3. สามารถ Import/Export ข้อมูล หรือ Save changes ได้
4. เปลี่ยน Tab เพื่อดูข้อมูลหรือจัดการ Source อื่น ๆ
5. มี Pagination สำหรับเปลี่ยนหน้าข้อมูล

## Validation/เงื่อนไข
- Table ต้องแสดงข้อมูลถูกต้อง
- ปุ่มและ Action ต้องตอบสนองต่อการคลิก
- รองรับการค้นหา/กรอง, Import/Export, Tab, Pagination