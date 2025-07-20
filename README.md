# SalesRAG Integration System

A unified interface combining Sales-AI functionality with data processing capabilities for laptop specifications.

## Features

- **Two-Part UI**: Left sidebar navigation with right content area
- **Sales-AI**: Intelligent sales assistant with chat interface
- **Add Specifications**: Upload and process laptop specification data
- **Data History**: Track successfully processed data with timestamps
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python main.py
```

3. Open your browser to `http://localhost:8001`

## Architecture

### Directory Structure
```
salesrag/
├── main.py                 # FastAPI application
├── config.py               # Configuration management
├── templates/              # HTML templates
├── static/                 # CSS and JavaScript
├── api/                    # API routes
├── libs/                   # Copied from sales_rag_app
├── models/                 # Data models
├── utils/                  # Utility functions
└── db/                     # Database files
```

### Key Components

- **Left Sidebar**: Navigation buttons and data history
- **Right Content**: Dynamic views for Sales-AI and Add Specifications
- **API Routes**: `/api/sales/`, `/api/specs/`, `/api/history/`
- **Database**: DuckDB for specs, SQLite for history

## Usage

### Sales-AI View
- Click "Sales-AI" button to access the chat interface
- Ask questions about laptop specifications
- View preset questions for common queries
- Get structured responses with tables and comparisons

### Add Specifications View
- Click "Add Specifications" button
- Upload `.xlsx`, `.xls`, or `.csv` files
- Preview data before confirmation
- Track processing status
- View successfully processed data in history

### Data History
- View all successfully processed files
- See timestamps and record counts
- Track processing status
- Only successful data additions are recorded

## Development

### API Endpoints

**Sales Routes** (`/api/sales/`):
- `GET /services` - Get available services
- `POST /chat-stream` - Stream chat responses
- `POST /chat` - Get chat responses

**Specs Routes** (`/api/specs/`):
- `POST /upload` - Upload specification file
- `POST /process` - Process uploaded data
- `GET /template` - Get data template

**History Routes** (`/api/history/`):
- `GET /` - Get history records
- `POST /` - Add history record
- `DELETE /{id}` - Delete history record
- `GET /stats` - Get history statistics

### Frontend

**Main App** (`static/js/app.js`):
- View switching logic
- File upload handling
- Progress tracking

**Sales AI** (`static/js/sales_ai.js`):
- Chat functionality
- Message rendering
- Streaming responses

**History** (`static/js/history.js`):
- History display
- Record management
- Statistics

## Configuration

Edit `config.py` to modify:
- Database paths
- Application settings
- Service configurations
- API endpoints

## Dependencies

- FastAPI - Web framework
- DuckDB - Specifications database
- SQLite - History database
- Milvus - Vector search
- Pandas - Data processing
- Uvicorn - ASGI server

## Notes

- Application runs on port 8001 by default
- History database is automatically created
- Only successfully processed data is recorded
- Supports drag-and-drop file uploads
- Real-time progress tracking during processing