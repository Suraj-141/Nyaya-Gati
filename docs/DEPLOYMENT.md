# Deployment Guide

This guide outlines how to deploy the Nyaya-Gati system to a production environment.

## Architecture
- **Web Tier**: Nginx serving React static files
- **App Tier**: FastAPI running via Uvicorn/Gunicorn
- **Data Tier**: Managed PostgreSQL database, Redis instance

## Cloud Providers
Recommended: AWS or Azure.

### AWS ECS Deployment Steps
1. Push Docker images to ECR.
2. Set up an RDS instance for PostgreSQL.
3. Set up an ElastiCache instance for Redis.
4. Define ECS Task Definitions using the images.
5. Configure Application Load Balancer to route traffic to the ECS service.

### Environment Variables
Ensure all variables defined in `.env.example` are securely set in the production environment (e.g., via AWS Secrets Manager or GitHub Actions Secrets).
