# TicTacToe (Nx Monorepo)

TicTacToe เป็นระบบตัวอย่างที่ใช้ **Nx Monorepo** รวมทั้ง **Backend (NestJS + Prisma + MySQL)** และ **Frontend (Next.js App Router)**  
รองรับการเข้าสู่ระบบด้วย Social (Google / Facebook / LINE), จัดการ Profile, Link/Unlink Social, ระบบ Ranking/Stats, History เกม และบอทเล่น Tic-Tac-Toe กับผู้ใช้

---

## 1. Build ด้วย Nx (Project + Libraries ทั้งหมด)

ทำการกำหนดตั้งค่าไฟล์ .env ให้สร็จเรียบร้อย และหลังจากนั้นทำการติดตั้ง node_module

```bash
npm install
```

สร้างไฟล์ Generate Prisma Client

```bash
npx prisma generate
```

จากนั้น build ทุก project และ libs ใน workspace (backend, frontend, shared libs ฯลฯ):

```bash
npx nx run-many --target=build --all
# หรือคล้ายกัน:
# npx nx run-many -t build --all
```

ตัวอย่าง build ทีละตัว (ถ้าชื่อโปรเจกต์ตรงตามนี้):

```bash
npx nx build backend
npx nx build frontend
```

> 💡 เวลาเพิ่ม lib ใหม่ (`@tic-tac-toe/prisma` ฯลฯ) ก็จะเข้า build pipeline ด้วยคำสั่ง `--all` นี้เลย

---

## 2. รัน Backend + Frontend แบบขนาน (Parallel)

### แบบง่ายสุด: เปิด 2 terminal

**Terminal 1 – Backend (NestJS)**

```bash
npx nx serve backend
# หรือถ้าใช้ env:
# BACKEND_URL=http://localhost:3102 npx nx serve backend
```

**Terminal 2 – Frontend (Next.js)**

```bash
npx nx serve frontend
# หรือกำหนด NEXT_PUBLIC_API_URL ให้ชี้ไป backend:
# NEXT_PUBLIC_API_URL=http://localhost:3102 npx nx serve frontend
```

จากนั้นเข้าเว็บที่:

- Frontend: `http://localhost:3101` (หรือ port ที่ Nx ตั้งให้)
- Backend REST API: `http://localhost:3102` (ตามที่คุณตั้งค่า)

---

### แบบ Nx run-many (Parallel ในคำสั่งเดียว)

```bash
npx nx run-many --target=serve --projects=backend,frontend --parallel
# หรือ
# npx nx run-many -t serve -p backend,frontend --parallel --maxParallel=2
```

> เงื่อนไข: ใน `project.json` ของ `backend` และ `frontend` ต้องมี target `serve` อยู่แล้ว (ซึ่งในโปรเจกต์นี้มีอยู่แล้วจาก generator)

---

## 3. โครงสร้างฐานข้อมูล (MySQL + Prisma)

ระบบใช้ Prisma + MySQL โดยมี entity หลัก ๆ ดังนี้ (ย่อจาก `prisma/schema.prisma`):

### 3.0 Database setup (Prisma migrate + generate)

1. ตั้งค่า `DATABASE_URL` ในไฟล์ `.env` ให้ชี้ไปที่ MySQL ของคุณ:

   ```env
   DATABASE_URL="mysql://user:pass@localhost:3306/tictactoe"
   ```

2. Apply migrations ลงฐานข้อมูล

   - สำหรับเครื่อง dev (สร้าง / อัปเดต schema แบบ interactive):

     ```bash
     npx prisma migrate dev --name init
     ```

   - สำหรับ CI / production (apply migrations ที่มีอยู่แล้วเท่านั้น):

     ```bash
     npx prisma migrate deploy
     ```

3. Generate Prisma Client (ทุกครั้งที่แก้ `schema.prisma` หรือหลัง migrate เสร็จ)

   ```bash
   npx prisma generate
   ```

   จากนั้นโค้ด backend (NestJS) จะสามารถ import Prisma Client ที่ generate แล้วมาใช้ได้ตามปกติ

---

### 3.1 Enums

```prisma
enum AuthProvider {
  GOOGLE
  FACEBOOK
  LINE
  OKTA
  AUTH0
}

enum AuthProviderType {
  OAUTH2
  OIDC
}

enum TicTacToeResult {
  WIN
  LOSS
  DRAW
}

enum TicTacToePlayer {
  HUMAN // ผู้เล่น
  BOT   // บอท
}
```

---

### 3.2 User & Authentication

#### `User` (`users`)

ตัวแทนผู้ใช้ 1 คนในระบบ

- `id: string` – primary key (cuid)
- `email: string?` – อีเมลหลัก (unique)
- `name: string?` – ชื่อ
- `lastName: string?` – นามสกุล
- `picture: string?` – avatar URL (เก็บลิงก์ดิบจาก provider, backend มี endpoint proxy cache เอง)
- `createdAt: DateTime`
- `updatedAt: DateTime`
- Relations:

  - `accounts: Account[]` – social accounts ที่ผูกอยู่ (Google/Facebook/LINE/…)
  - `sessions: Session[]` – session login ทั้งหมด
  - `loginAudits: LoginAudit[]` – log การ login
  - `ticTacToeStat: TicTacToeStat?` – สถิติรวมของ TicTacToe
  - `ticTacToeGames: TicTacToeGame[]` – history เกมทั้งหมดของผู้ใช้

---

#### `Account` (`accounts`)

1 แถว = Social Account หนึ่งตัวที่ผูกกับ User เช่น Google 1, Facebook 1, LINE 1 ฯลฯ

- `id: string`
- `userId: string` – FK → `User.id`
- `provider: AuthProvider` – `GOOGLE | FACEBOOK | LINE | OKTA | AUTH0`
- `providerType: AuthProviderType` – `OAUTH2 | OIDC`
- `providerAccountId: string` – id ของ user บน provider นั้น (เช่น `sub` ของ Google)
- `email: string?` – email ที่ provider ส่งมา (ถ้ามี)
- Tokens (optional):

  - `accessToken: string?`
  - `refreshToken: string?`
  - `tokenType: string?`
  - `scope: string?`
  - `idToken: string?`
  - `expiresAt: int?` – epoch seconds

- Metadata:

  - `sessionState: string?`
  - `rawProfileJson: string?` – เก็บ JSON profile เต็ม
  - `createdAt: DateTime`
  - `updatedAt: DateTime`

- Relations:

  - `user: User`

- Constraints:

  - `@@unique([provider, providerAccountId])` – ป้องกัน Social account เดียวกันผูกกับหลาย user
  - `@@unique([userId, provider])` – user 1 คน ต่อ 1 provider 1 account

> **Important:** เมื่อ Login ด้วย Social ถ้า `provider + providerAccountId` มีอยู่แล้ว → ใช้ user เดิมเสมอ (แม้จะ login ด้วย Facebook หลังจากเคย link กับ Google มาก่อน)

---

#### `Session` (`sessions`)

session login ของระบบเอง (ไม่ใช่ access_token ของ provider)

- `id: string`
- `sessionToken: string` – token ที่เก็บใน cookie `session_token`
- `userId: string` – user เจ้าของ session
- `createdAt: DateTime`
- `expiresAt: DateTime`
- Relations:

  - `user: User`

ใช้ร่วมกับ `SessionAuthGuard` เพื่อตรวจสอบ session ในทุก request ที่ต้อง login

---

#### `LoginAudit` (`login_audits`)

Log การ login ของผู้ใช้ (optional แต่ดีต่อ audit)

- `id: string`
- `userId: string?`
- `provider: AuthProvider?`
- `ipAddress: string?`
- `userAgent: string?`
- `success: boolean` – สำเร็จ / ไม่สำเร็จ
- `createdAt: DateTime`
- Relation:

  - `user: User?`

---

### 3.3 Tic-Tac-Toe Domain

#### `TicTacToeStat` (`tic_tac_toe_stats`)

สถิติ summary ของผู้ใช้ 1 คนสำหรับเกม Tic-Tac-Toe

- `id: string`
- `userId: string` (unique) – 1 user มี 1 สถิติ
- `score: int` – คะแนนรวม (ใช้จาก win/bonus)
- `currentWinStreak: int` – ชนะติดกันกี่เกม
- `totalWins: int`
- `totalLosses: int`
- `totalDraws: int`
- `createdAt: DateTime`
- `updatedAt: DateTime`
- Relation:

  - `user: User` (one-to-one)

---

#### `TicTacToeGame` (`tic_tac_toe_games`)

เก็บข้อมูลหนึ่ง “เกม” ที่เล่นจบแล้วหรือกำลังเล่น

- `id: string`
- `userId: string` – ผู้เล่นคนนี้
- `result: TicTacToeResult` – `WIN | LOSS | DRAW`
- `startingSide: TicTacToePlayer` – ใครเดินก่อน (`HUMAN` หรือ `BOT`)
- `scoreDelta: int` – คะแนนที่เปลี่ยน (+1/-1/+2 ฯลฯ)
- `createdAt: DateTime` – เวลาเริ่มเกม
- `finishedAt: DateTime?` – เวลาเกมจบ (ถ้ายังไม่จบเป็น `null`)
- Relations:

  - `user: User`
  - `moves: TicTacToeMove[]` – ลำดับการเดินทุกตาในเกมนี้

---

#### `TicTacToeMove` (`tic_tac_toe_moves`)

หนึ่งตาเดินบนกระดาน 3x3

- `id: string`
- `gameId: string` – FK → `TicTacToeGame.id`
- `moveOrder: int` – ลำดับตา (1,2,3,…)
- `player: TicTacToePlayer` – `HUMAN` หรือ `BOT`
- `position: int` – index ช่องบนกระดาน 0–8 (mapping เป็นแบบ row-major)
- `createdAt: DateTime`
- Relation:

  - `game: TicTacToeGame`

---

## 4. Logic การเดินของ Bot

บอท Tic-Tac-Toe ใช้กระดานขนาด 3×3 (index 0–8) และ concept “winning lines” แบบมาตรฐาน:

- แถว: `[0,1,2]`, `[3,4,5]`, `[6,7,8]`
- คอลัมน์: `[0,3,6]`, `[1,4,7]`, `[2,5,8]`
- แนวทแยง: `[0,4,8]`, `[2,4,6]`

โดยทั่วไป logic (pseudo) จะเป็นประมาณนี้:

1. **Win if possible**

   - ลองไล่ทุกช่องที่ยังว่าง
   - ถ้าทดลองวางหมากของ BOT ลงไปในช่องนั้นแล้วเกิด “ชนะทันที” → เดินช่องนั้นเลย

2. **Block human if they can win next**

   - ถ้าเราไม่ชนะในทันที:
   - ลองสมมติให้ HUMAN เดินในทุกช่องว่าง
   - ถ้าพบว่ามีช่องที่ทำให้ HUMAN ชนะในตาหน้า → BOT ต้อง block ช่องนั้นก่อน

3. **Prefer center**

   - ถ้าไม่มีทั้งจุดชนะ/จุด block และช่องกลาง (position = 4) ว่างอยู่ → เลือกเดินกลาง

4. **Prefer corners**

   - ถ้ากลางถูกจองแล้ว/ไม่ว่าง → เลือกช่องมุมถ้าว่าง (`0, 2, 6, 8`)
   - การเริ่มที่มุมช่วยให้มีโอกาสสร้าง fork ได้ในบางสถานการณ์ (ใช้กับ mode ยาก)

5. **Fallback: edges**

   - ถ้าไม่มีตัวเลือกข้างต้น → เลือกช่องขอบ (`1, 3, 5, 7`) จากช่องที่ว่าง

Flow ของบอตในโค้ด (เชิงแนวคิด):

```ts
// board: ('H' | 'B' | null)[]  // 9 ช่อง
// bot = 'B', human = 'H'

// 1) มองหาช่องที่ BOT ชนะได้เลย
// 2) ถ้าไม่มี ให้มองหาช่องที่ HUMAN จะชนะในตาหน้า แล้ว block
// 3) ถ้าไม่มีทั้งคู่ → เล่นตามลำดับความสำคัญ: center > corners > edges
```
