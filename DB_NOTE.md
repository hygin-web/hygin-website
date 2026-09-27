\#DB\_Notes





|Field|ชนิดข้อมูล (Type)|Constraint (จาก DB)|แสดงบน UI ที่ไหน|Error State ที่ต้องมี|ตรงกับ R-xx (Heuristic / Design)|
|-|-|-|-|-|-|
|username|varchar(100)|NOT NULL, Unique (โดยพฤติกรรมระบบ)|หน้า Login (Input), หน้า Register (Input)|• ค่าว่าง: "กรุณากรอกชื่อผู้ใช้"<br /><br /><br />• ความยาวเกิน 100 ตัวอักษร<br /><br /><br />• ซ้ำกับระบบ (Register): "Username นี้ถูกใช้งานแล้ว"<br /><br /><br />• ไม่พบในระบบ (Login): "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง"|R-01 (Input Validation) / R-05 (Duplicate Check)|
|password\_hash|varchar(255)|NOT NULL (เก็บค่าที่ผ่านการ Hash แล้ว)|หน้า Login (Password Input), หน้า Register (Password \& Confirm Password)|• ค่าว่าง: "กรุณากรอกรหัสผ่าน"<br /><br /><br />• รหัสผ่านไม่ตรงกัน (Register)<br /><br /><br />• ความยาวต่ำกว่าเกณฑ์ความปลอดภัย|R-01 / ยังไม่มี R-xx รองรับความซับซ้อนของ Password (ต้องเพิ่มใน design.md)|
---
|role|enum('admin','officer')|NOT NULL, Default 'officer'|หน้า Register (Input), หน้า Profile (Display / Edit)|• ค่าว่าง: "กรุณาระบุชื่อ-นามสกุล"<br /><br /><br />• ความยาวเกิน 200 ตัวอักษร|R-01 (Input Validation)|
---
|linked\_staff\_id|bigint(20)|-|หน้า Profile (แสดงข้อมูลเชื่อมโยงบุคลากร)|• อ้างอิง ID ที่ไม่มีอยู่จริงในระบบบุคลากร: "ไม่พบข้อมูลบุคลากรที่เชื่อมโยง|ยังไม่มี R-xx รองรับความสัมพันธ์ตารางบุคลากร (ต้องเพิ่มใน design.md)|

