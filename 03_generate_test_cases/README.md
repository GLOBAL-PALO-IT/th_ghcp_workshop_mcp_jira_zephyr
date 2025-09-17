# 04: Generate Test Cases from Jira/Confluence

## สร้าง Test Case อัตโนมัติด้วย Copilot

1. สร้าง Confluence โดยใช้ prompt -> /jira-jira-create-confluence
2. สร้าง Epic โดยใช้ prompt -> /jira-jira-create-epic
3. สร้าง Story โดยใช้ prompt -> /jira-jira-create-story
4. เปิด Jira Epic/Story หรือ Confluence ที่มี Requirement
5. ใช้ Copilot ช่วยวิเคราะห์และแนะนำ Test Case
6. คัดลอก Test Case ที่ได้ไปสร้างใน Zephyr MCP
7. ตรวจสอบและปรับแต่ง Test Case ให้เหมาะสม

---

## ตัวอย่าง Prompt Copilot (ภาษาอังกฤษ)
> Generate test cases for the following Jira story on Zephyr: [ใส่รายละเอียด Jira Story หรือ Requirement]
