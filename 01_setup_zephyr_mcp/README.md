# 01: Setup Zephyr MCP Tool

## ขั้นตอนการติดตั้ง Zephyr MCP Tool

1. ทำการ unzip "zephyr-mcp-module.zip"

3. ไปที่ .vscode/mcp.json
   **วิธีหา path ของไฟล์สำหรับแต่ละระบบปฏิบัติการ**
   - **Windows:**  
      - เปิดโฟลเดอร์ที่มีไฟล์ `zephyr-mcp-module`
      - คลิกขวาที่ไฟล์ `index.js` ในโฟลเดอร์ `dist`
      - เลือก "Copy as path" หรือ "คัดลอกเป็นเส้นทาง"
      - นำ path ที่ได้ไปวางในไฟล์ `mcp.json`

   - **macOS:**  
      - เปิด Finder ไปยังโฟลเดอร์ `zephyr-mcp-module/dist`
      - กดปุ่ม `Control` ค้างไว้แล้วคลิกที่ไฟล์ `index.js`
      - เลือก "Get Info" หรือ "Copy (ชื่อไฟล์) as Pathname" (ถ้ามี)
      - หรือเปิด Terminal แล้วลากไฟล์ `index.js` ลงในหน้าต่าง Terminal เพื่อดู path
      - นำ path ที่ได้ไปวางในไฟล์ `mcp.json`

   ```json
   "jira-zephyr": {
      "command": "node",
      "args": ["{ใส่ path ที่อยู่}/zephyr-mcp-module/dist/index.js"], // แก้ไข location file ให้ถูกต้อง
      "env": {
        "JIRA_BASE_URL": "https://paknarathip.atlassian.net",
        "JIRA_USERNAME": "<Jira Username>", // ชื่อผู้ใช้งาน Jira
        "JIRA_API_TOKEN": "<Jira Api Token>", // สามารถสร้างใหม่ได้ตามคู่มือนี้ หรือใช้ของเดิมที่มีอยู่
        "ZEPHYR_API_TOKEN": "<Zephyr Api Token>"
      }
    }
   ```
   > ตรวจสอบว่า Zephyr MCP ติดตั้งสำเร็จ