#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' 

# ตรวจสอบว่าไฟล์ openssl.cnf อยู่ในโฟลเดอร์ปัจจุบัน
OPENSSL_CNF="openssl.cnf"
if [ ! -f "$OPENSSL_CNF" ]; then
    echo -e "${RED}Error: $OPENSSL_CNF not found in the current directory.${NC}"
    exit 1
fi

# สร้าง Root CA
echo -e "${BLUE}Creating Root CA...${NC}"
openssl req -x509 -nodes -new -sha256 -days 1024 -newkey rsa:4096 \
-keyout RootCA.key -out RootCA.pem -subj "/C=TH/CN=Abdulloh-Root-CA" || { echo -e "${RED}Failed to create Root CA.${NC}"; exit 1; }

# แปลง Root CA เป็น .crt
echo -e "${BLUE}Exporting Root CA to CRT format...${NC}"
openssl x509 -outform pem -in RootCA.pem -out RootCA.crt || { echo -e "${RED}Failed to export Root CA to .crt format.${NC}"; exit 1; }

# สร้าง CSR และ Private Key สำหรับ localhost โดยใช้ openssl.cnf
echo -e "${BLUE}Creating localhost CSR and Private Key...${NC}"
openssl req -new -nodes -newkey rsa:4096 -keyout localhost.key -out localhost.csr \
-config "$OPENSSL_CNF" -reqexts req_ext || { echo -e "${RED}Failed to create localhost CSR.${NC}"; exit 1; }

# เซ็นใบรับรอง localhost ด้วย Root CA โดยใช้ openssl.cnf
echo -e "${BLUE}Signing localhost certificate with Root CA...${NC}"
openssl x509 -req -sha256 -days 1024 -in localhost.csr -CA RootCA.pem -CAkey RootCA.key -CAcreateserial \
-extfile "$OPENSSL_CNF" -extensions req_ext -out localhost.crt || { echo -e "${RED}Failed to sign localhost certificate.${NC}"; exit 1; }

# ตั้งค่าสิทธิ์ให้ไฟล์
echo -e "${BLUE}Setting file permissions...${NC}"
chmod 600 RootCA.key localhost.key localhost.csr
chmod 644 RootCA.crt localhost.crt

# แสดงข้อมูลของ localhost.crt
echo -e "${BLUE}Displaying localhost certificate details...${NC}"
openssl x509 -in localhost.crt -text -noout || { echo -e "${RED}Failed to display localhost certificate details.${NC}"; exit 1; }

# แสดงข้อความสำเร็จ
echo -e "${GREEN}Certificates created successfully.${NC}"
