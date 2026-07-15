# Setup And Maintenance Guide

This document describes how to configure, run, deploy, and maintain both the frontend and backend modules of the MedVendor Procurement platform.

---

## 1. Local Development Setup

### Backend Setup
1.  **Environment**: Requires Python 3.10+ (Check `.python-version`).
2.  **Dependencies**: Create a virtual environment and install dependencies:
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```
3.  **Environment Configuration**: Create a `.env` file from the example:
    ```bash
    cp .env.example .env
    ```
    *Open `.env` and fill in your database, Cloudinary, and Razorpay parameters.*
4.  **Database Migrations**: Run migration scripts to initialize the Supabase database schema:
    ```bash
    python manage.py migrate
    ```
5.  **Create Admin**: Initialize the platform superuser:
    ```bash
    python manage.py createsuperuser
    ```
6.  **Run Server**: Start the local development server:
    ```bash
    python manage.py runserver
    ```

### Frontend Setup
1.  **Node Version**: Requires Node.js 18+ (Check `.nvmrc`).
2.  **Dependencies**: Install npm packages:
    ```bash
    cd frontend
    npm install
    ```
3.  **Environment Configuration**: Create `.env` file:
    ```bash
    cp .env.example .env
    ```
    Ensure `NEXT_PUBLIC_API_BASE_URL` points to the local backend (usually `http://127.0.0.1:8000`).
4.  **Run Application**: Start Next.js in development mode:
    ```bash
    npm run dev
    ```

---

## 2. Environment Variables Summary

### Backend Key Configurations
*   `DJANGO_SECRET_KEY`: Long, secure, random string for cryptographic signatures.
*   `DJANGO_DEBUG`: `True` in local development, `False` in production.
*   `DATABASE_URL`: PostgreSQL connection string.
*   `CORS_ALLOWED_ORIGINS` & `CSRF_TRUSTED_ORIGINS`: Comma-separated list of approved frontend domains.
*   `CLOUDINARY_KEY` / `CLOUDINARY_NAME` / `CLOUDINARY_SECRET`: Credentials to upload media items.
*   `PLATFORM_RAZORPAY_KEY_ID` / `PLATFORM_RAZORPAY_KEY_SECRET`: Razorpay keys for verification checks.

---

## 3. Platform Deployment Guide

### Backend (Render Deployment)
1.  Connect your repository to Render as a **Web Service**.
2.  Set the **Root Directory** to `backend`.
3.  Configure the **Build Command** to `pip install -r requirements.txt` and the **Start Command** to `gunicorn config.wsgi:application` (defined in `Procfile`).
4.  Configure all environment variables in Render dashboard settings.
5.  Ensure `DJANGO_ALLOWED_HOSTS` includes your new Render domain.

### Frontend (Vercel Deployment)
1.  Import the repository into Vercel.
2.  In the project configuration:
    *   Set **Root Directory** to `frontend`.
    *   Framework Preset: **Next.js**.
    *   Build Command: `npm run build`.
3.  Add the environment variable `NEXT_PUBLIC_API_BASE_URL` pointing to your Render backend API URL.

---

## 4. Cache & Maintenance Procedures
*   **Subscription Plan Caching**: Subscription plans are cached for 24 hours to reduce database read overhead. If you update plans through Django Admin, cache signals in `subscription_view.py` automatically clear keys (e.g. `subscription_plans_buyer`) so changes reflect immediately.
*   **Static Assets**: Whitenoise is used to compress and serve static files for the Django Admin portal. Remember to execute `python manage.py collectstatic` on build servers.
