Local testing and approval options

1) Approve an existing user (manual, recommended for production):
- Open MongoDB (Atlas or local) and update the user document:
  - Set `approved` to `true` for the user's record.

2) Approve via API (admin only):
- If you have an admin account, call:

  PUT /api/users/:id/approve
  Authorization: Bearer <admin-token>

3) Quick development shortcuts (DEV ONLY):
- Auto-approve new registrations (dev):
  - In `backend/.env` add `AUTO_APPROVE_USERS=true` and restart the backend. New users will be approved automatically on registration.

- Allow members to borrow/reserve without approval (dev):
  - In `backend/.env` add `ALLOW_MEMBER_BORROW=true` and restart the backend.
  - This skips the `approved` check for borrowing and reservations.

Security note: Do not enable `AUTO_APPROVE_USERS` or `ALLOW_MEMBER_BORROW` in production unless you understand the security implications.

Vercel deployment notes
- Ensure the following environment variables are set in Vercel:
  - `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLIENT_URL`
- Optionally for staging: `AUTO_APPROVE_USERS=true` or `ALLOW_MEMBER_BORROW=true` (only for non-production/testing).

Commands
- Backend:
```bash
cd backend
npm install
npm run dev
```
- Frontend:
```bash
# project root
npm install
npm run dev
```
