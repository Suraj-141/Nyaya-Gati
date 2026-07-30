# Nyaya-Gati API Documentation

The Nyaya-Gati backend provides a RESTful API built with FastAPI. Complete interactive documentation (Swagger UI) is available at `/docs` when the server is running.

## Authentication
Most endpoints require a valid JWT bearer token. 
- Obtain a token via `POST /api/v1/auth/login` (TODO)

## Core Endpoints

### Cases
- `GET /api/v1/cases/`: List cases
- `POST /api/v1/cases/`: Create a new case
- `GET /api/v1/cases/{case_id}`: Get specific case details

### Users
- `GET /api/v1/users/me`: Get current user profile

### ML Services (Internal/Admin)
- `POST /api/v1/ml/predict-merit`: Run merit prediction on provided text
- `POST /api/v1/ml/extract-entities`: Run NER extraction on provided text
