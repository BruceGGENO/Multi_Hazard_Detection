# Local PostgreSQL and application accounts

PostgreSQL 18 is installed on this machine and was verified as accepting connections on localhost:5432. Run these commands from the project directory in your own terminal so that you can enter passwords privately.

## 1. Create the database and configure the connection

```powershell
npm.cmd run db:init
```

Accept these defaults unless you have changed your installation:

| Prompt | Value |
| --- | --- |
| Host | localhost |
| Port | 5432 |
| Administrator | postgres |
| Administrator password | The password you set when installing PostgreSQL |
| Application database | rwanda_response |
| Application database login | rwanda_response_app |

Password input is hidden. The command creates a separate PostgreSQL login without superuser, create-database or create-role privileges, generates its random password, creates its database, and applies scripts/schema.sql. It writes the app connection to the git-ignored .env.local. The administrator password is never saved. Existing unrelated .env.local settings are preserved. Existing databases with a different owner are not modified. Existing database logins are only reused if matching credentials are already configured in .env.local; their passwords are never reset automatically.

The resulting local configuration has this form; do not replace the generated password with this placeholder:

```dotenv
DATABASE_URL="postgresql://rwanda_response_app:GENERATED_PASSWORD@localhost:5432/rwanda_response"
APP_ORIGIN="http://localhost:3000"
```

The generated database password is a service credential for the app, not a dashboard user's password. Keep .env.local private. For a remote database, configure its provider's TLS requirements instead of using the local initializer.

## 2. Verify the tables and connection

```powershell
npm.cmd run db:check
```

This prints the database, database login, table names and user count without passwords or connection strings.

| Table | Purpose |
| --- | --- |
| users | Dashboard account emails, names, password hashes, roles, district assignments |
| sessions | Hashed session tokens and expiry times |
| login_attempts | Login rate limiting |
| records | District-scoped operational records |
| contacts | Consented SMS recipients |
| sms | SMS attempts and delivery statuses |
| sms_batches | Dispatch replay protection and limits |
| record_reviews | Independent report decisions, reviewer, reason and timestamp |
| incident_dispatches | Verified incidents dispatched to the command center |

For an existing installation, run `npm.cmd run db:migrate` to add the verification tables. If the existing tables are owned by postgres and the application login lacks REFERENCES permission, connect as postgres to rwanda_response in pgAdmin and execute [scripts/verification-admin.sql](scripts/verification-admin.sql). This migration preserves all existing users and records. Approval is only available once these tables exist and the application has access.

## 3. Create the first administrator and more users

```powershell
npm.cmd run users:create
```

Enter the login email, full name and role number. Choose 1 for the first National Command Center Admin. Other roles require an exact district assignment such as Nyabihu; use consistent spelling across users, contacts and records. Enter and confirm a password of 14–256 characters. Passwords are hidden and stored only as salted scrypt hashes. Repeat this command for each additional user.

These terminal commands require access to the application's database credentials and are intended for trusted account administrators. They are not public registration endpoints.

## 4. List account details or reset a forgotten password

```powershell
npm.cmd run users:list
npm.cmd run users:reset
```

The list shows email, name, role and district. Existing passwords cannot be retrieved. The reset command asks for an account email and a new password, revokes existing sessions, and clears that account's login lockout. It does not change the user's role or district.

In pgAdmin, refresh Databases, expand rwanda_response → Schemas → public → Tables. Use the Query Tool on rwanda_response to inspect accounts without exposing hashes:

```sql
SELECT email, name, role, district
FROM public.users
ORDER BY email;
```

Do not manually store plaintext passwords or put the postgres administrator connection in DATABASE_URL.

## 5. Start the app and sign in

```powershell
npm.cmd run dev
```

Open http://localhost:3000 and use the email and password you entered in users:create. Restart the Next.js server after changing .env.local. If you change the local port, update APP_ORIGIN to the exact origin including the port. A production build expects HTTPS for Secure session cookies; use the development server for local HTTP testing.

## Troubleshooting

- Password authentication failed: verify the administrator login in pgAdmin, then rerun db:init with that same login. This command cannot recover your PostgreSQL administrator password.
- ECONNREFUSED: verify that the postgresql-x64-18 Windows service is running and that host/port match the installation.
- Login already exists but is not configured: choose another application login name, or restore the correct existing DATABASE_URL privately. The initializer does not overwrite existing database login passwords.
- Existing database has another owner: choose a new database name. No existing database is dropped or reassigned.
- .env.local missing: run db:init before db:check or the user commands.
- Relation users does not exist: run npm.cmd run db:setup against the configured database, then db:check.
- Email already exists: use users:reset rather than creating a duplicate.
- Permission denied while creating roles/databases: use your installation administrator for db:init. The application login intentionally cannot create other databases or PostgreSQL logins.

PostgreSQL documents database creation permissions and ownership in [CREATE DATABASE](https://www.postgresql.org/docs/18/sql-createdatabase.html). These scripts create application accounts in the users table; they do not create a separate PostgreSQL login for each dashboard user.
