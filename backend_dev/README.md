# Family Tree Backend - Python FastAPI

A Python FastAPI backend server for the Family Tree application.

## Setup

### Prerequisites
- Python 3.10+
- pip

### Installation

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

5. Update the `.env` file with your configuration (especially JWT_SECRET)

### Running the Server

```bash
python main.py
```

The server will start on `http://localhost:5000`

### API Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `POST /api/auth/logout` - Logout a user
- `GET /api/auth/me` - Get current user info (requires auth token)
- `GET /health` - Health check

## Database

Currently using in-memory storage. To integrate with Supabase:
1. Install `supabase` Python client
2. Update `models.py` to use Supabase
3. Replace in-memory `users` list with Supabase queries

## Notes

- Passwords are hashed using bcrypt
- JWT tokens are used for authentication
- CORS is configured to allow requests from the frontend
