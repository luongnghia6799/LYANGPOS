
import os
from sqlalchemy import create_all, text, create_engine

# Lấy link database từ môi trường
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    print("Không tìm thấy DATABASE_URL!")
    exit()

# Fix link cho SQLAlchemy nếu là postgres://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("Đang kiểm tra và thêm cột 'status' vào bảng 'order'...")
        # Đối với PostgreSQL, dùng câu lệnh ALTER TABLE
        # Dùng IF NOT EXISTS (hoặc check thủ công) để tránh lỗi nếu cột đã có
        conn.execute(text("ALTER TABLE \"order\" ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Pending'"))
        conn.commit()
    print("✅ Đã cập nhật database Cloud thành công!")
except Exception as e:
    print(f"❌ Lỗi: {e}")
