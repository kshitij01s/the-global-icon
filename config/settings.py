import re
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent
environ.Env.read_env(BASE_DIR / ".env")
env = environ.Env(DJANGO_DEBUG=(bool, True))

DEBUG = env("DJANGO_DEBUG")
SECRET_KEY = env("DJANGO_SECRET_KEY", default="development-only-change-me")
if not DEBUG and SECRET_KEY == "development-only-change-me":
    raise environ.ImproperlyConfigured("Set DJANGO_SECRET_KEY to a strong production secret.")
ALLOWED_HOSTS = [
    host.strip()
    for host in env("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "publications",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "publications.context_processors.site_configuration",
            ],
        },
    },
]
WSGI_APPLICATION = "config.wsgi.application"
SITE_ID = 1

database_engine = env("DATABASE_ENGINE", default=env("DB_ENGINE", default="sqlite")).lower()
if database_engine not in {"mysql", "sqlite"}:
    raise environ.ImproperlyConfigured(
        "DATABASE_ENGINE must be either mysql or sqlite."
    )
if database_engine == "mysql":
    database_name = env("DATABASE_NAME", default=env("DB_NAME", default=""))
    if not database_name:
        raise environ.ImproperlyConfigured(
            "Set DATABASE_NAME (or DB_NAME) when DATABASE_ENGINE is mysql."
        )
    if not re.fullmatch(r"[A-Za-z0-9_]{1,64}", database_name):
        raise environ.ImproperlyConfigured(
            "DATABASE_NAME must contain 1-64 letters, numbers, or underscores."
        )
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": database_name,
            "USER": env("DATABASE_USER", default=env("DB_USER", default="")),
            "PASSWORD": env("DATABASE_PASSWORD", default=env("DB_PASSWORD", default="")),
            "HOST": env("DATABASE_HOST", default=env("DB_HOST", default="127.0.0.1")),
            "PORT": env("DATABASE_PORT", default=env("DB_PORT", default="3306")),
            "OPTIONS": {
                "charset": "utf8mb4",
                "connect_timeout": env.int("DATABASE_CONNECT_TIMEOUT", default=10),
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'",
            },
            "CONN_MAX_AGE": env.int("DATABASE_CONN_MAX_AGE", default=60),
            "CONN_HEALTH_CHECKS": True,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": env("SQLITE_DATABASE_NAME", default=BASE_DIR / "db.sqlite3"),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en"
TIME_ZONE = env("TIME_ZONE", default="Asia/Kolkata")
USE_I18N = True
USE_TZ = True
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default=(
        "django.core.mail.backends.console.EmailBackend"
        if DEBUG
        else "django.core.mail.backends.smtp.EmailBackend"
    ),
)
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="THE GLOBAL ICON <no-reply@example.com>")
CONTACT_RECIPIENT_EMAIL = env("CONTACT_RECIPIENT_EMAIL", default="").strip()
PUBLIC_SITE_URL = env("PUBLIC_SITE_URL", default="").strip().rstrip("/")

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
PRIVATE_MEDIA_ROOT = BASE_DIR / "private_media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LOGIN_URL = "login"
LOGIN_REDIRECT_URL = "home"
LOGOUT_REDIRECT_URL = "home"

if not DEBUG:
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = env("SECURE_SSL_REDIRECT", default=True)
    SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
