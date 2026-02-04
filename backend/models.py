import os
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone, timedelta

def utc_now():
    # Returns naive datetime in VN Time (UTC+7) if on Cloud, else system time
    if os.environ.get('DATABASE_URL') and 'postgres' in os.environ.get('DATABASE_URL'):
        utc = datetime.now(timezone.utc)
        return utc.astimezone(timezone(timedelta(hours=7))).replace(tzinfo=None)
    return datetime.now()

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(100))
    role = db.Column(db.String(20), default='User') # 'Admin', 'User'
    created_at = db.Column(db.DateTime, default=utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'display_name': self.display_name,
            'role': self.role
        }

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(50)) # Mã combo / Mã SP
    unit = db.Column(db.String(20), nullable=True)
    secondary_unit = db.Column(db.String(20)) # Quy cách phụ (vd: Thùng)
    multiplier = db.Column(db.Float, default=1) # VD: 1 thùng = 20 chai
    cost_price = db.Column(db.Float, default=0)
    sale_price = db.Column(db.Float, default=0)
    stock = db.Column(db.Integer, default=0)
    expiry_date = db.Column(db.String(50)) # Hạn sử dụng
    active_ingredient = db.Column(db.String(255)) # Hoạt chất
    brand = db.Column(db.String(100)) # Hãng / Thương hiệu
    is_combo = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        d = {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'unit': self.unit,
            'secondary_unit': self.secondary_unit,
            'multiplier': self.multiplier,
            'cost_price': self.cost_price,
            'sale_price': self.sale_price,
            'stock': self.stock,
            'expiry_date': self.expiry_date,
            'active_ingredient': self.active_ingredient,
            'brand': self.brand,
            'is_combo': self.is_combo,
            'current_stock': self.stock
        }
        
        if self.is_combo and hasattr(self, 'combo_items') and self.combo_items:
            # Dynamically calculate for combos
            total_cost = 0
            stocks = []
            for item in self.combo_items:
                if item.product:
                    total_cost += (item.product.cost_price or 0) * (item.quantity or 0)
                    stocks.append((item.product.stock or 0) // (item.quantity or 1))
            
            d['cost_price'] = total_cost
            d['stock'] = min(stocks) if stocks else 0
            d['current_stock'] = d['stock'] # For combos, current_stock is the dynamic one
            
        return d

class ComboItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    combo_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)

    combo = db.relationship('Product', foreign_keys=[combo_id], backref=db.backref('combo_items', cascade='all, delete-orphan'))
    product = db.relationship('Product', foreign_keys=[product_id])

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name,
            'quantity': self.quantity
        }




class Partner(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), nullable=False, default='Customer') # Deprecated but kept for compat
    is_customer = db.Column(db.Boolean, default=True)
    is_supplier = db.Column(db.Boolean, default=False)
    cccd = db.Column(db.String(20))
    phone = db.Column(db.String(20))
    address = db.Column(db.String(200))
    debt_balance = db.Column(db.Float, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'is_customer': self.is_customer,
            'is_supplier': self.is_supplier,
            'cccd': self.cccd,
            'phone': self.phone,
            'address': self.address,
            'debt_balance': self.debt_balance
        }

class CashVoucher(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    partner_id = db.Column(db.Integer, db.ForeignKey('partner.id'), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, default=utc_now, index=True)
    note = db.Column(db.String(500))
    type = db.Column(db.String(50), default='Payment', index=True) # Payment to Supplier, Expense, etc.
    source = db.Column(db.String(50), default='manual', index=True) # 'manual' or 'settlement'
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=True)
    
    partner = db.relationship('Partner', backref=db.backref('vouchers', lazy='selectin'))
    order = db.relationship('Order', foreign_keys=[order_id])

    def to_dict(self):
        return {
            'id': self.id,
            'partner_id': self.partner_id,
            'partner_name': self.partner.name if self.partner else 'Khác',
            'amount': self.amount,
            'date': self.date.isoformat(),
            'note': self.note,
            'type': self.type,
            'source': self.source,
            'order_id': self.order_id,
            'order_display_id': self.order.display_id if self.order else None
        }

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime, default=utc_now, index=True)
    partner_id = db.Column(db.Integer, db.ForeignKey('partner.id'), nullable=True, index=True)
    total_amount = db.Column(db.Float, default=0)
    payment_method = db.Column(db.String(50)) # 'Cash', 'Debt', etc.
    type = db.Column(db.String(20), index=True) # 'Sale' or 'Purchase'
    note = db.Column(db.String(500))
    amount_paid = db.Column(db.Float, default=0)
    old_debt = db.Column(db.Float, default=0)
    display_id = db.Column(db.String(50), index=True)
    status = db.Column(db.String(20), default='Pending', index=True) # 'Pending', 'Completed'
    
    partner = db.relationship('Partner', backref=db.backref('orders', lazy='selectin'))
    details = db.relationship('OrderDetail', backref='order', cascade='all, delete-orphan', lazy='selectin')

    def to_dict(self):
        return {
            'id': self.id,
            'display_id': self.display_id or str(self.id),
            'date': self.date.isoformat(),
            'partner_id': self.partner_id,
            'partner_name': self.partner.name if self.partner else 'Khách Lẻ',
            'partner_address': self.partner.address if self.partner else '',
            'partner_phone': self.partner.phone if self.partner else '',
            'total_amount': self.total_amount,
            'amount_paid': self.amount_paid,
            'payment_method': self.payment_method,
            'type': self.type,
            'note': self.note,
            'old_debt': self.old_debt,
            'status': self.status,
            'details': [d.to_dict() for d in self.details]
        }

class OrderDetail(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False, index=True)
    product_name_override = db.Column(db.String(200)) # To store custom spec/name
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)

    product = db.relationship('Product', lazy='selectin')

    def to_dict(self):
        p_dict = self.product.to_dict() if self.product else {}
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product_name_override or (self.product.name if self.product else 'Sản phẩm đã xóa'),
            'product_unit': self.product.unit if self.product else 'ĐV',
            'secondary_unit': self.product.secondary_unit if self.product else '',
            'multiplier': self.product.multiplier if self.product else 1,
            'quantity': self.quantity,
            'price': self.price,
            'cost_price': p_dict.get('cost_price', 0),
            'stock': p_dict.get('current_stock', 0),
            'active_ingredient': p_dict.get('active_ingredient', ''),
            'is_combo': self.product.is_combo if self.product else False,
            'combo_items': [ci.to_dict() for ci in self.product.combo_items] if (self.product and self.product.is_combo) else []
        }
class CustomerPrice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    partner_id = db.Column(db.Integer, db.ForeignKey('partner.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    price = db.Column(db.Float, nullable=False)
    
    partner = db.relationship('Partner', backref=db.backref('custom_prices', cascade='all, delete-orphan'))
    product = db.relationship('Product')

    def to_dict(self):
        return {
            'id': self.id,
            'partner_id': self.partner_id,
            'product_id': self.product_id,
            'price': self.price
        }

class AppSetting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(50), unique=True, nullable=False)
    setting_value = db.Column(db.Text)

    def to_dict(self):
        return {
            'key': self.setting_key,
            'value': self.setting_value
        }

class PrintTemplate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    module = db.Column(db.String(50), nullable=False) # 'Sale', 'Purchase', 'History', 'CashVoucher'
    is_default = db.Column(db.Boolean, default=False)
    config = db.Column(db.Text) # JSON string of all settings
    content_config = db.Column(db.Text) # JSON string of what to show/hide

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'module': self.module,
            'is_default': self.is_default,
            'config': self.config,
            'content_config': self.content_config
        }
class BankAccount(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bank_name = db.Column(db.String(100), nullable=False)
    account_number = db.Column(db.String(50), nullable=False)
    account_holder = db.Column(db.String(100))
    balance = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'bank_name': self.bank_name,
            'account_number': self.account_number,
            'account_holder': self.account_holder,
            'balance': self.balance,
            'created_at': self.created_at.isoformat()
        }

class BankTransaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('bank_account.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, default=utc_now, index=True)
    type = db.Column(db.String(20)) # 'Deposit', 'Withdrawal', 'Transfer'
    note = db.Column(db.String(500))
    partner_id = db.Column(db.Integer, db.ForeignKey('partner.id'), nullable=True) # Optional link to partner
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=True)
    
    account = db.relationship('BankAccount', backref=db.backref('transactions', cascade='all, delete-orphan'))
    partner = db.relationship('Partner')
    order = db.relationship('Order')

    def to_dict(self):
        return {
            'id': self.id,
            'account_id': self.account_id,
            'bank_name': self.account.bank_name,
            'amount': self.amount,
            'date': self.date.isoformat(),
            'type': self.type,
            'note': self.note,
            'partner_name': self.partner.name if self.partner else None,
            'order_id': self.order_id
        }
