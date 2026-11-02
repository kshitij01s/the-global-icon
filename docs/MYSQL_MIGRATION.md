# SQLite to MySQL migration

This procedure stages a copy of the SQLite database, applies Django migrations to the copy, and imports the resulting application records into a new MySQL schema. It does not modify the source `db.sqlite3` or its media files. Stop application writes during the final copy/export/import to avoid a split snapshot.

## Before starting

- Confirm the target schema is absent or deliberately empty. Never point `loaddata` at an existing production schema.
- Keep database credentials in the ignored local `.env` or a secret manager; do not put credentials in commands, fixtures, logs, or source control.
- Back up `db.sqlite3`, public `media`, and `private_media` separately. Verify the SQLite backup with `PRAGMA integrity_check` and the media archive with its archive test.
- Confirm whether SQLite contains auth users or groups. The publication fixture below intentionally excludes auth records and Django sessions. If any users/groups exist or publication records refer to users, stop and prepare a reviewed, protected auth-data transfer instead of proceeding with this fixture.
- Ensure that the referenced media files are available at the same relative paths in the destination storage. A database fixture does not copy files.

## Stage and export

Run these commands from the project directory in PowerShell. Use a new staging path and fixture path that do not already exist. The Python UTF-8 mode avoids writing a Windows-local-codepage fixture.

```powershell
$StagingDb = "$env:USERPROFILE\magazine-mysql-staging.sqlite3"
$Fixture = "$env:USERPROFILE\magazine-publications.json"
Copy-Item -LiteralPath ".\db.sqlite3" -Destination $StagingDb

$env:DATABASE_ENGINE = "sqlite"
$env:SQLITE_DATABASE_NAME = $StagingDb
python manage.py migrate --noinput
$env:PYTHONUTF8 = "1"
python manage.py dumpdata publications --natural-foreign --indent 2 --output $Fixture
```

The fixture preserves primary keys and application relationships. Do not export `django_session`: sessions are ephemeral authentication state and should be invalidated during a database move. This project’s migration marks already-published magazines as approved; this preserves their existing public state. Review legacy editions without PDFs separately—new workflow publications require an approved status and a valid PDF.

## Create and load the MySQL schema

Use the configured MySQL administrator account to confirm that the target schema does not exist. Create it only if absent:

```sql
CREATE DATABASE digital_magazine_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

Configure `.env` with `DATABASE_ENGINE=mysql` and the database connection values. Do not include real credentials in shell history or documentation. Then run:

```powershell
Remove-Item Env:DATABASE_ENGINE -ErrorAction SilentlyContinue
Remove-Item Env:SQLITE_DATABASE_NAME -ErrorAction SilentlyContinue
python manage.py migrate --noinput
python manage.py loaddata $Fixture
python manage.py setup_roles
python manage.py check
```

`loaddata` is not a merge operation. Only use it after verifying that the target application tables are empty. The role command creates permission groups but does not create users, mark users as staff, or grant superuser status.

## Verify before switching traffic

Compare per-model row counts and primary-key sets between the staged SQLite copy and MySQL. Check foreign-key and many-to-many relationships, the expected review-status backfill, and every stored PDF/image path. Confirm that sessions were not imported, that the target has no unexpected users, and that the role groups contain only their expected permissions. Run the publication test suite against both SQLite and MySQL before directing users to the new database.

This local setup shares the project media directories with the source database, so its referenced private PDF remains in place. For a different host, copy the public and private media backups to the equivalent configured storage before enabling requests. Do not expose `private_media` through a static URL or web-server alias.

## Recovery

Keep the original SQLite database, its verified backup, and the media archive until the MySQL copy has passed application and media checks. To recover without overwriting the original, copy the backup to a new SQLite path and set `DATABASE_ENGINE=sqlite` and `SQLITE_DATABASE_NAME` to that copy. Apply current migrations to the copy before running the current application. For an exact pre-migration rollback, use the matching pre-migration application version with the untouched original/backup. Do not drop or overwrite the MySQL schema as a rollback step; preserve it for diagnosis until an administrator explicitly authorizes cleanup.
