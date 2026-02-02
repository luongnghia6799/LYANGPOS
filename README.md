# LyangPOS - Small ERP System

A modern Point of Sale & ERP system built with Flask (Backend) and React (Frontend).

## Features
- **POS**: Sales processing, Cart management, Stock validation.
- **Transactions**: Cash or Debt payments. Receipt printing.
- **Inventory**: Product management, Real-time stock updates.
- **Partners**: Customer & Supplier management, Debt tracking.
- **Dashboard**: Revenue analysis, Profit, and Key metrics.

## Tech Stack
- **Backend**: Flask, SQLAlchemy, SQLite
- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Chart.js

## Installation

### 1. Backend Setup
Prerequisites: Python 3.8+ installed.

```bash
cd backend
# Create virtual env (optional)
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server (Will create easypos.db automatically)
python app.py
```
Backend runs on `http://127.0.0.1:6969`.

### 2. Frontend Setup
Prerequisites: Node.js 16+ installed.

```bash
cd frontend
# Install dependencies
npm install

# Run dev server
npm run dev
```
Frontend dev runs on `http://localhost:5173`. Production runs on `http://127.0.0.1:6969`.

## Usage
1. Open Frontend in browser.
2. Go to **Products** and add some items (e.g., "Coca Cola", Price: 10,000, Stock: 100).
3. Go to **POS**, search for product, add to cart.
4. Click **Sales** -> Choose Payment Method -> **Save**.
5. System will print receipt and update stock/debt.

## Project Structure
- `backend/models.py`: Database Schema
- `backend/app.py`: API Endpoints
- `frontend/src/pages/POS.jsx`: Main POS Logic
- `frontend/src/components/Layout.jsx`: Sidebar & Shell
