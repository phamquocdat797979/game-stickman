# ⚔️ STICKMAN BATTLE ROYALE — TikTok Live
### Game Design Document · Version 2.0 (Simplified)

---

## 📌 TỔNG QUAN

**Thể loại:** Battle Royale tương tác TikTok Live  
**Slogan:** *"Tên bạn sẽ chiến đấu thay bạn!"*  
**Triết lý thiết kế:** Đơn giản — mọi người xem đều hiểu và tham gia được ngay trong 10 giây đầu

---

## 🎮 VÒNG LẶP GAME CƠ BẢN

```
Tạo nhân vật → Tự động chiến đấu → Boss xuất hiện
     ↑                                      ↓
  Hồi sinh ←── Bị loại ←── Chiến đấu ←── Boss chết → Lên cấp
```

---

## 👤 TẠO NHÂN VẬT

### Kích hoạt: Tặng quà (Gift)

| Xu tặng | Tier | HP tối đa | ATK cơ bản | Đặc điểm |
|---|---|---|---|---|
| 1–49 xu | T1 | 100 HP | 5 | Cơ bản |
| 50–199 xu | T2 | 150 HP | 8 | Hào quang nhẹ |
| 200–799 xu | T3 | 200 HP | 12 | Sao ★, aura |
| 800–2999 xu | T4 | 250 HP | 18 | Sao ★★ |
| 3000+ xu | T5 | 300 HP | 25 | Vương miện 👑 |

> ATK cơ bản là chỉ số tấn công khởi điểm của nhân vật. Có thể tăng thêm vĩnh viễn qua hồi máu/ủng hộ (tối đa 1000 ATK tổng).

**Quy tắc:**
- Tên TikTok = tên nhân vật, màu tự sinh từ tên (mỗi người một màu riêng)
- Nhân vật tạo ra với **HP đầy = HP tối đa** theo Tier, không có cơ chế +HP khi tạo
- Nếu đã có nhân vật + tặng thêm xu → nâng Tier nếu đủ ngưỡng
- Khi lên Tier: HP tối đa tăng theo bảng trên, HP hiện tại được hồi đầy
- Tối đa 15 nhân vật trên màn hình, vào sau xếp hàng chờ

---

## 💬 CÚ PHÁP BÌNH LUẬN — QUY TẮC DUY NHẤT

```
@TenNguoi   →  ⚔️ TẤN CÔNG người đó
+TenNguoi   →  💚 ỦNG HỘ người đó (trong 60 giây)
+stop       →  ❌ Hủy ủng hộ, quay về tự ủng hộ bản thân
```

> Kỹ năng của nhân vật tự động tung ra — người xem không cần làm gì thêm

---

## ⚔️ HỆ THỐNG TẤN CÔNG

### Tự động (Auto-Attack)
- Nhân vật tự nhắm kẻ thù gần nhất, tấn công theo chu kỳ
- ATK là chỉ số cố định theo Tier — cũng chính là DMG mỗi đòn thường

| Tier | ATK (DMG/đòn) | Tốc độ |
|---|---|---|
| T1 | 5 | 3s/đòn |
| T2 | 8 | 2.5s |
| T3 | 12 | 2s |
| T4 | 18 | 1.5s |
| T5 | 25 | 1s |

> ATK có thể tăng thêm vĩnh viễn qua hệ thống ủng hộ (tối đa 1000 ATK tổng). Mọi thay đổi ATK đều ảnh hưởng trực tiếp đến DMG đòn thường và kỹ năng.

### Tấn công theo lệnh bình luận
```
Bình luận: @TenNguoi
```
- Nhân vật lập tức chạy đến và tung kỹ năng vào mục tiêu
- Sát thương: **bình thường như auto-attack** (không tăng, không giảm)
- Cooldown: 15 giây/lệnh

### Hệ thống kỹ năng theo Tier

Mỗi nhân vật khi tạo ra sẽ có sẵn số kỹ năng tương ứng với Tier. Kỹ năng hoàn toàn **tự động triển khai ngẫu nhiên** trong chiến đấu — người xem không cần làm gì thêm.

Kỹ năng chia làm 2 loại:
- **Đơn mục tiêu:** nhắm 1 kẻ thù — DMG = **ATK × 2**
- **Đa mục tiêu (AoE):** nhắm tất cả kẻ thù trong phạm vi — DMG = **ATK** (nhưng gây cho nhiều mục tiêu cùng lúc)

| Tier | Số kỹ năng | Kỹ năng sở hữu | Loại |
|---|---|---|---|
| T1 | 0 | Chỉ đánh thường | — |
| T2 | 1 | 🔥 Fire — vụ nổ lửa quanh bản thân | AoE |
| T3 | 2 | 🔥 Fire + ❄️ Ice — mũi băng bắn thẳng 1 mục tiêu, làm chậm 3s | AoE + Đơn |
| T4 | 3 | 🔥 Fire + ❄️ Ice + ⚡ Thunder — sét đánh 1 mục tiêu, dây chuyền sang 2 kẻ gần nhất (DMG giảm 50% mỗi lần dây) | Đơn + AoE biến thể |
| T5 | 4 | 🔥 Fire + ❄️ Ice + ⚡ Thunder + 💀 Soul — hút HP 1 mục tiêu, lượng hút = DMG × 2, bản thân hồi lại lượng HP bằng DMG gây ra | Đơn |

**Sát thương kỹ năng chi tiết:**

| Kỹ năng | Loại | DMG | Hiệu ứng phụ |
|---|---|---|---|
| 🔥 Fire | AoE | ATK (tất cả kẻ trong phạm vi) | Không |
| ❄️ Ice | Đơn | ATK × 2 | Làm chậm mục tiêu 3s |
| ⚡ Thunder | Đơn + dây chuyền | ATK × 2 (mục tiêu chính) → ATK (mục tiêu phụ) | Dây sang tối đa 2 kẻ lân cận |
| 💀 Soul | Đơn | ATK × 2 | Hồi HP bản thân = DMG gây ra |

**Cơ chế tự động:**
- Mỗi 3 đòn thường → tự rút ngẫu nhiên 1 kỹ năng trong danh sách đang có
- Mỗi kỹ năng có **cooldown riêng** sau khi dùng để tránh tung nhiều kỹ năng cùng lúc

| Kỹ năng | Cooldown sau khi dùng |
|---|---|
| 🔥 Fire | 8 giây |
| ❄️ Ice | 10 giây |
| ⚡ Thunder | 14 giây |
| 💀 Soul | 18 giây |

- Nếu kỹ năng rút trúng đang cooldown → bỏ qua, tiếp tục đánh thường đến lần rút tiếp theo
- Hiệu ứng kỹ năng hiển thị rõ trên màn hình kèm tên kỹ năng

---

## 💚 HỆ THỐNG ỦNG HỘ NGƯỜI KHÁC (Support)

> Dành cho người xem muốn hỗ trợ nhân vật **của người khác** — kể cả khi bản thân chưa có nhân vật trong game.

### Bước 1 — Chọn mục tiêu ủng hộ
```
Bình luận: +TenNguoi
```
- Người bình luận **"đang ủng hộ TenNguoi"** trong **60 giây**
- Hiệu ứng: vòng xanh lá bao quanh nhân vật được ủng hộ
- Hết 60s tự reset. Muốn đổi: bình luận `+TenKhac`
- **Không cần có nhân vật** để ủng hộ người khác

### Bước 2 — Hành động trong lúc đang ủng hộ

> HP hồi **không vượt quá HP tối đa** của Tier nhân vật đó. ATK tăng **vĩnh viễn**, tối đa 1000 ATK tổng cộng.

| Hành động | Hồi HP | Tăng ATK |
|---|---|---|
| Nhấn ❤️ tim | +1 HP | — |
| Tặng 1–19 xu | +20 HP | +5 ATK vĩnh viễn |
| Tặng 20–99 xu | +50 HP | +15 ATK vĩnh viễn |
| Tặng 100–499 xu | +120 HP | +40 ATK vĩnh viễn |
| Tặng 500+ xu | Hồi đầy HP | +100 ATK vĩnh viễn |
| Share livestream | +100 HP | +50 ATK vĩnh viễn |

### Hiển thị trên màn hình
- Khi ai đó ủng hộ: `"💚 [ViewerA] đang ủng hộ [TenNguoi]"`
- Khi hồi HP: số HP hồi màu xanh bay lên đầu nhân vật (không hiện nếu đã đầy máu)
- Khi tăng ATK vĩnh viễn: chữ `ATK ↑` màu vàng nhấp nháy trên nhân vật

---

## 💛 HỆ THỐNG TỰ ỦNG HỘ BẢN THÂN (Self-Support)

> Dành cho người xem **đã có nhân vật** và muốn tự tăng sức mạnh cho nhân vật của chính mình — không cần bình luận gì thêm.

### Cách hoạt động
- Nếu **không bình luận** `+TenNguoi` nào: toàn bộ tim / xu / share tự động áp dụng cho **nhân vật của chính mình**
- Nếu đang ủng hộ người khác (`+TenNguoi`) mà muốn quay về tự ủng hộ: bình luận `+stop` để hủy mục tiêu ủng hộ hiện tại

### Hành động tự ủng hộ

> Hiệu quả giống hệt bảng ủng hộ người khác — HP hồi không vượt HP tối đa, ATK tăng vĩnh viễn tối đa 1000.

| Hành động | Hồi HP cho bản thân | Tăng ATK cho bản thân |
|---|---|---|
| Nhấn ❤️ tim | +1 HP | — |
| Tặng 1–19 xu | +20 HP | +5 ATK vĩnh viễn |
| Tặng 20–99 xu | +50 HP | +15 ATK vĩnh viễn |
| Tặng 100–499 xu | +120 HP | +40 ATK vĩnh viễn |
| Tặng 500+ xu | Hồi đầy HP | +100 ATK vĩnh viễn |
| Share livestream | +100 HP | +50 ATK vĩnh viễn |

### Trường hợp đặc biệt
- Chưa có nhân vật + tặng xu đủ ngưỡng → **tạo nhân vật mới** thay vì ủng hộ
- Chưa có nhân vật + nhấn tim / share → không có tác dụng (cần tạo nhân vật trước)

---

## 👹 HỆ THỐNG BOSS

### Boss xuất hiện
- Mỗi **3 phút** một boss xuất hiện (streamer có thể điều chỉnh)
- Thông báo trước 10 giây: màn hình rung + cảnh báo đỏ

### Chỉ số boss
| Chỉ số | Giá trị |
|---|---|
| HP | 3,000 HP |
| ATK cơ bản | 100 |
| Tần suất tấn công | Mỗi 3 giây / lần |
| Kiểu tấn công | AoE — gây sát thương diện rộng theo phạm vi nhất định |
| DMG mỗi lần | Bằng ATK cơ bản của boss (100 DMG) lên tất cả nhân vật trong phạm vi |

### Trong lúc boss xuất hiện
- **Tất cả nhân vật chuyển hướng tấn công boss** — bất kể HP còn bao nhiêu, kể cả HP rất thấp vẫn tiếp tục tấn công
- Nhân vật **không đánh nhau** trong giai đoạn boss
- Cơ chế ủng hộ hoạt động bình thường: tim / xu / share vẫn hồi HP và tăng ATK cho nhân vật như thường
- Người xem tận dụng giai đoạn này để buff ATK hoặc hồi HP cho nhân vật mình muốn

### Khi boss chết
- **Tất cả nhân vật còn sống tăng lên 1 bậc Tier** (T1→T2, T2→T3... tối đa T5)
- Khi Tier tăng: HP tối đa tăng theo bảng Tier mới, HP hiện tại được hồi đầy, kỹ năng mới mở khóa ngay
- Nhân vật gây nhiều sát thương nhất nhận danh hiệu **⭐ BOSS SLAYER** (hiển thị 3 phút)
- Thông báo lớn chiếm 1/3 màn hình: `"👹 BOSS DEFEATED! All survivors TIER UP!"`

---

## ⬆️ TĂNG TIER KHI TIÊU DIỆT (Kill Tier-Up)

Đây là cơ chế **thưởng kỹ năng cho người chiến đấu giỏi**, tạo ra vòng phản hồi tích cực: đánh tốt → mạnh hơn → đánh tốt hơn.

**Quy tắc:**
- Khi nhân vật **tiêu diệt được 2 nhân vật khác** (bất kể Tier của nạn nhân) → **tăng 1 bậc Tier**
- Bộ đếm kill reset về 0 sau mỗi lần Tier-Up
- Tier tối đa vẫn là **T5** — không tăng thêm sau đó

**Hiệu ứng khi Tier-Up:**
- Nhân vật to ra nhẹ, sáng bùng lên trong 1 giây
- Thông báo kill feed: `"⬆️ NguyenA (2 kills) → T2 → T3!"`
- Nếu đạt T5: `"👑 NguyenA đạt TIER MAX!"`
- Kỹ năng mới (nếu có) được mở khóa ngay lập tức

**Ví dụ chuỗi thăng tiến:**
```
NguyenA bắt đầu T1 (không có kỹ năng)
  → Tiêu diệt TranB + LeC    →  T2 (mở 🔥 Fire)
  → Tiêu diệt PhamD + MinhE  →  T3 (mở thêm ❄️ Ice)
  → Tiêu diệt AnhF + BinhG   →  T4 (mở thêm ⚡ Thunder)
  → Tiêu diệt CucH + DungI   →  T5 (mở thêm 💀 Soul + vương miện 👑)
```

> Người chơi tặng 1 xu tạo T1 vẫn có thể leo lên T5 nếu đánh đủ giỏi — tạo bất ngờ và kịch tính cho màn hình

---

## 💀 BỊ LOẠI & HỒI SINH

### Khi HP = 0
- Nhân vật tan rã thành ký tự tên bay tứ tung
- Thông báo: `"💀 [TenNguoi] đã bị loại!"`
- Có **30 giây** để hồi sinh — hết thời gian thì nhân vật biến mất hoàn toàn

### Hồi sinh — chi phí theo Tier

Khi hồi sinh, nhân vật **khôi phục lại toàn bộ trạng thái như lúc chưa chết** (HP đầy, ATK giữ nguyên, kỹ năng giữ nguyên).

| Tier nhân vật | Tự tặng xu | Được người khác cứu | Share livestream |
|---|---|---|---|
| T1 | 20 xu | 20 xu | ✅ Miễn phí |
| T2 | 50 xu | 50 xu | ✅ Miễn phí |
| T3 | 200 xu | 200 xu | ✅ Miễn phí |
| T4 | 800 xu | 800 xu | ✅ Miễn phí |
| T5 | 3,000 xu | 3,000 xu | ✅ Miễn phí |

**Cách hồi sinh:**

- **Tự cứu:** Tặng đủ xu tương ứng Tier trong vòng 30 giây sau khi chết
- **Được cứu:** Người khác bình luận `+TenNguoi` rồi tặng đủ xu tương ứng Tier trong 30 giây
- **Share:** Share livestream trong vòng 30 giây — hồi sinh ngay lập tức bất kể Tier nào, không tốn xu

---

## 📊 HIỂN THỊ TRÊN MÀN HÌNH

### Thông tin realtime (Kill Feed — góc trên trái)
```
⚔️  NguyenA  →  TranB  (-45 HP)
💚  ViewerX  đang ủng hộ  LeC
👑  PhamD  đạt  BOSS SLAYER
💀  TranB  đã bị loại
🎉  MinhE  tham chiến!  [T3]
```

### Thanh boss (khi boss xuất hiện)
```
👹 DARK GOLEM  ████████░░░░  4,200 / 5,000 HP
```

### Bảng xếp hạng (góc trên phải — top 3)
```
🥇 PhamD        T5  Lv3  230 HP
🥈 NguyenA      T3  Lv2  180 HP
🥉 LeThiCamTu   T4  Lv1  95 HP
```

---

## 🔧 TECH STACK ĐỀ XUẤT

```
TikTok Live
    │  Gift / Comment / Like / Share
    ▼
Node.js  (tiktok-live-connector)
    │  Parse event → xác định loại hành động
    ▼
Game State Manager  (Redis hoặc in-memory)
    │  Cập nhật HP / ATK / buff / support target
    ▼
Socket.io  →  Browser (Canvas game)
    │
    ▼
OBS capture  →  Phát lên TikTok Live
```

### Logic phân loại event

```javascript
// Gift event
onGift(user, xuAmount) {
  if (!hasCharacter(user)) createCharacter(user, xuAmount)
  else if (supportTarget[user]) healTarget(supportTarget[user], xuAmount)
  else upgradeOrHealSelf(user, xuAmount)
}

// Comment event
onComment(user, text) {
  if (text.startsWith('@')) attackTarget(user, text.slice(1))
  if (text.startsWith('+')) setSupportTarget(user, text.slice(1), 60s)
}

// Like event
onLike(user) {
  let target = supportTarget[user] ?? user
  healCharacter(target, 1)
}

// Share event
onShare(user) {
  let target = supportTarget[user] ?? user
  healCharacter(target, 100)
  buffATK(target, 0.15, 45s)
}
```

---

## 📋 TÓM TẮT 1 TRANG (In ra để nhớ khi stream)

```
╔══════════════════════════════════════════╗
║        STICKMAN BATTLE ROYALE            ║
║              CÁCH CHƠI                  ║
╠══════════════════════════════════════════╣
║  🎁 TẶNG QUÀ     →  Tạo / nâng cấp     ║
║                      nhân vật của bạn   ║
╠══════════════════════════════════════════╣
║  @TenNguoi        →  Tấn công người đó  ║
╠══════════════════════════════════════════╣
║  +TenNguoi        →  Ủng hộ người đó    ║
║                      (60 giây)          ║
║  Sau khi ủng hộ:                        ║
║    ❤️ Tim         →  +HP                ║
║    🎁 Xu          →  +HP & +ATK         ║
║    📤 Share       →  +HP & +ATK         ║
╠══════════════════════════════════════════╣
║  ⬆️ TIÊU DIỆT     →  Tăng 1 bậc Tier   ║
║     kẻ thù            (tối đa T5)       ║
╠══════════════════════════════════════════╣
║  👹 BOSS (mỗi 3 phút)                   ║
║  → Tất cả cùng đánh boss               ║
║  → Boss 3000HP, AoE 100 DMG/3s         ║
║  → Sống sót = tăng 1 bậc Tier          ║
╠══════════════════════════════════════════╣
║  ✨ Kỹ năng tự động theo Tier           ║
║     T1: đánh thường                     ║
║     T2: + 🔥  T3: + ❄️                  ║
║     T4: + ⚡   T5: + 💀                  ║
╚══════════════════════════════════════════╝
```

---

*Stickman Battle Royale · TikTok Live Game Design v2.7*
