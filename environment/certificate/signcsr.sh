#!/bin/bash

# สีสำหรับข้อความ
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # ไม่มีสี

# ตรวจสอบไฟล์ที่จำเป็น
CSR_FILE="localhost.csr"
CA_KEY="RootCA.key"
CA_CERT="RootCA.pem"
SIGNED_CERT="localhost_signed.crt"

if [ ! -f "$CSR_FILE" ]; then
    echo -e "${RED}Error: CSR file ($CSR_FILE) not found.${NC}"
    exit 1
fi

if [ ! -f "$CA_KEY" ]; then
    echo -e "${RED}Error: CA private key ($CA_KEY) not found.${NC}"
    exit 1
fi

if [ ! -f "$CA_CERT" ]; then
    echo -e "${RED}Error: CA certificate ($CA_CERT) not found.${NC}"
    exit 1
fi

# สร้างไฟล์คอนฟิกสำหรับการเซ็น CSR
echo -e "${BLUE}Creating temporary config for signing...${NC}"
EXTFILE=$(mktemp)
cat <<EOF > "$EXTFILE"
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = localhost
DNS.2 = localhost.localdomain
IP.1  = 127.0.0.1
EOF

# เซ็น CSR ด้วย CA
echo -e "${BLUE}Signing CSR with Root CA...${NC}"
openssl x509 -req -in "$CSR_FILE" -CA "$CA_CERT" -CAkey "$CA_KEY" -CAcreateserial \
-extfile "$EXTFILE" -days 365 -sha256 -out "$SIGNED_CERT" || { echo -e "${RED}Failed to sign CSR.${NC}"; exit 1; }

# ลบไฟล์ config ชั่วคราว
rm -f "$EXTFILE"

# ตั้งค่าสิทธิ์ให้ไฟล์ที่เซ็นแล้ว
chmod 644 "$SIGNED_CERT"

# แสดงข้อมูลของใบรับรองที่เซ็นแล้ว
echo -e "${BLUE}Displaying signed certificate details...${NC}"
openssl x509 -in "$SIGNED_CERT" -text -noout || { echo -e "${RED}Failed to display signed certificate.${NC}"; exit 1; }

# แสดงข้อความสำเร็จ
echo -e "${GREEN}CSR signed successfully. Signed certificate: $SIGNED_CERT${NC}"
