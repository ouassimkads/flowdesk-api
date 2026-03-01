# FlowDesk API — NestJS

Multi-step document upload & approval workflow REST API.

## Stack
- **NestJS** — framework
- **Prisma** — ORM
- **PostgreSQL** — database
- **JWT** — authentication
- **Multer** — file uploads
- **Swagger** — auto-generated API docs

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Run database migrations
npx prisma migrate dev --name init

# 4. Seed the database
npm run prisma:seed

# 5. Start in dev mode
npm run start:dev
```

API runs at: `http://localhost:3000/api/v1`
Swagger UI at: `http://localhost:3000/api/docs`

---

## Seeded Credentials

| Role      | Email                      | Password      |
|-----------|----------------------------|---------------|
| Admin     | admin@flowdesk.com         | admin123      |
| Applicant | applicant@flowdesk.com     | applicant123  |

---

## API Endpoints

### 🔐 Auth
| Method | Endpoint            | Description           | Auth |
|--------|---------------------|-----------------------|------|
| POST   | /auth/register      | Register applicant    | ❌   |
| POST   | /auth/login         | Login & get JWT       | ❌   |
| GET    | /auth/me            | Get current user      | ✅   |

### 👥 Users (Admin only)
| Method | Endpoint       | Description                           |
|--------|----------------|---------------------------------------|
| GET    | /users         | All applicants with progress          |
| GET    | /users/:id     | Single user with full application     |

### 📋 Applications
| Method | Endpoint                                    | Role      | Description                    |
|--------|---------------------------------------------|-----------|--------------------------------|
| GET    | /applications                               | Admin     | All applications (filterable)  |
| GET    | /applications/stats                         | Admin     | Dashboard stats                |
| GET    | /applications/:id                           | Admin     | Single application             |
| PATCH  | /applications/:id/steps/:stepId/approve     | Admin     | Approve step → unlock next     |
| PATCH  | /applications/:id/steps/:stepId/reject      | Admin     | Reject step → reset for upload |
| GET    | /applications/mine/application              | Applicant | My application & steps         |
| POST   | /applications/mine/steps/:stepId/submit     | Applicant | Submit step for review         |

### 📁 Documents
| Method | Endpoint                              | Description                      |
|--------|---------------------------------------|----------------------------------|
| GET    | /steps/:stepId/documents              | List documents for a step        |
| POST   | /steps/:stepId/documents/upload       | Upload files (multipart, max 5)  |
| DELETE | /steps/:stepId/documents/:documentId  | Soft-delete a document           |

### 🔔 Notifications
| Method | Endpoint                    | Description                |
|--------|-----------------------------|----------------------------|
| GET    | /notifications              | My notifications           |
| GET    | /notifications/unread-count | Unread count               |
| PATCH  | /notifications/:id/read     | Mark one as read           |
| PATCH  | /notifications/read-all     | Mark all as read           |

### ⚙️ Workflow Steps (Admin)
| Method | Endpoint                    | Description                          |
|--------|-----------------------------|--------------------------------------|
| GET    | /workflow-steps             | Get all active steps                 |
| POST   | /workflow-steps             | Create new step                      |
| PATCH  | /workflow-steps/reorder     | Reorder steps (bulk position update) |
| PATCH  | /workflow-steps/:id         | Update step label/description/icon   |
| DELETE | /workflow-steps/:id         | Soft-disable a step                  |

### 📜 Audit Logs (Admin)
| Method | Endpoint                        | Description                     |
|--------|---------------------------------|---------------------------------|
| GET    | /audit                          | All audit logs                  |
| GET    | /audit/application/:id          | Logs for a specific application |

---

## Workflow State Machine

```
Step Status Flow:
  LOCKED → UNLOCKED (when previous step is APPROVED)
         → PENDING  (applicant uploads + submits)
         → APPROVED (admin approves → next step unlocked)
         → REJECTED (admin rejects → step resets to REJECTED)
  REJECTED → PENDING (applicant re-uploads + submits)

Application Status:
  IN_PROGRESS → COMPLETE (all steps approved)
              → REJECTED (any step rejected — resets to IN_PROGRESS on re-submit)
```

---

## File Upload

- Accepted formats: PDF, JPG, JPEG, PNG, DOCX
- Max file size: 10MB (configurable via `MAX_FILE_SIZE_MB` env)
- Max files per upload: 5
- Storage: local disk by default (`./uploads` folder)
- Files are soft-deleted (physical file + DB record)

To swap to S3, replace the `diskStorage` in `documents.controller.ts` with an S3 multer adapter (e.g. `multer-s3`).

---

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/flowdesk
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=3000
UPLOAD_DEST=./uploads
MAX_FILE_SIZE_MB=10
FRONTEND_URL=http://localhost:5173
```
