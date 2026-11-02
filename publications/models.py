import uuid
from urllib.parse import urlsplit

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.storage import FileSystemStorage
from django.core.validators import FileExtensionValidator
from django.db import models
from django.db.models import Q
from django.urls import reverse
from django.utils import timezone

from .validators import validate_pdf


private_pdf_storage = FileSystemStorage(location=settings.PRIVATE_MEDIA_ROOT)
CONTENT_LANGUAGES = [
    ("en", "English"),
    ("hi", "Hindi"),
    ("fr", "French"),
    ("es", "Spanish"),
]


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True)
    description = models.CharField(max_length=240, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Edition(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=110, unique=True)
    region = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Author(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="author_profile"
    )
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=130, unique=True)
    bio = models.TextField(blank=True)
    portrait = models.ImageField(upload_to="authors/", blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Article(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_REVIEW = "in_review", "In review"
        CHANGES_REQUESTED = "changes_requested", "Changes requested"
        APPROVED = "approved", "Approved"
        SCHEDULED = "scheduled", "Scheduled"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    excerpt = models.CharField(max_length=320, blank=True)
    body = models.TextField()
    language = models.CharField(max_length=12, choices=CONTENT_LANGUAGES, default="en", db_index=True)
    translated_from = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="translations",
    )
    author = models.ForeignKey(Author, on_delete=models.SET_NULL, null=True, blank=True, related_name="articles")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="articles")
    featured_image = models.ImageField(upload_to="articles/", blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DRAFT, db_index=True)
    is_featured = models.BooleanField(default=False)
    is_sponsored = models.BooleanField(default=False)
    member_only = models.BooleanField(default=False)
    meta_description = models.CharField(max_length=160, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [models.Index(fields=["status", "published_at"])]
        permissions = [
            ("publish_article", "Can publish or archive articles"),
        ]

    def __str__(self):
        return self.title

    @property
    def has_featured_image(self):
        return bool(
            self.featured_image
            and self.featured_image.storage.exists(self.featured_image.name)
        )

    @property
    def reading_time_minutes(self):
        return max(1, (len(self.body.split()) + 219) // 220)

    def get_absolute_url(self):
        return reverse("article_detail", kwargs={"slug": self.slug})

    def save(self, *args, **kwargs):
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)


class Magazine(models.Model):
    class Access(models.TextChoices):
        PUBLIC = "public", "Public"
        MEMBERS = "members", "Members"

    class ReviewStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_REVIEW = "in_review", "In review"
        CHANGES_REQUESTED = "changes_requested", "Changes requested"
        APPROVED = "approved", "Approved"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    subtitle = models.CharField(max_length=240, blank=True)
    language = models.CharField(max_length=12, choices=CONTENT_LANGUAGES, default="en", db_index=True)
    translated_from = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="translations",
    )
    description = models.TextField(blank=True)
    publisher_name = models.CharField(max_length=160, blank=True)
    issue_number = models.CharField(max_length=40, blank=True)
    edition = models.ForeignKey(Edition, on_delete=models.SET_NULL, null=True, blank=True, related_name="magazines")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="magazines")
    related_articles = models.ManyToManyField(Article, blank=True, related_name="related_magazines")
    related_magazines = models.ManyToManyField(
        "self", blank=True, symmetrical=False, related_name="recommended_for"
    )
    cover = models.ImageField(upload_to="magazines/covers/", blank=True)
    cover_alt_text = models.CharField(max_length=180, blank=True)
    pdf_file = models.FileField(
        upload_to="magazines/pdfs/",
        storage=private_pdf_storage,
        validators=[FileExtensionValidator(["pdf"]), validate_pdf],
        blank=True,
    )
    access = models.CharField(max_length=12, choices=Access.choices, default=Access.PUBLIC, db_index=True)
    allow_download = models.BooleanField(default=True)
    review_status = models.CharField(
        max_length=24,
        choices=ReviewStatus.choices,
        default=ReviewStatus.DRAFT,
        db_index=True,
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_magazines",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_magazines",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="published_magazines",
    )
    published_at = models.DateTimeField(null=True, blank=True)
    is_featured = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False, db_index=True)
    publication_date = models.DateField(default=timezone.localdate, db_index=True)
    meta_description = models.CharField(max_length=160, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-publication_date", "-created_at"]
        indexes = [models.Index(fields=["is_published", "publication_date"])]
        permissions = [
            ("approve_magazine", "Can approve or request changes to magazines"),
            ("publish_magazine", "Can publish, unpublish, or archive magazines"),
        ]

    def __str__(self):
        return self.title

    @property
    def has_cover(self):
        return bool(self.cover and self.cover.storage.exists(self.cover.name))

    @property
    def has_pdf(self):
        return bool(self.pdf_file and self.pdf_file.storage.exists(self.pdf_file.name))

    def get_absolute_url(self):
        return reverse("magazine_detail", kwargs={"slug": self.slug})

    def get_reader_url(self):
        return reverse("magazine_reader", kwargs={"slug": self.slug})


class Advertisement(models.Model):
    class Placement(models.TextChoices):
        HOMEPAGE_BANNER = "homepage_banner", "Homepage banner"
        HOMEPAGE_SIDEBAR = "homepage_sidebar", "Homepage editorial sidebar"
        MAGAZINE_SIDEBAR = "magazine_sidebar", "Magazine detail sidebar"
        READER_SIDEBAR = "reader_sidebar", "Reader-page sidebar"
        BETWEEN_SECTIONS = "between_sections", "Between editorial sections"
        RELATED_MAGAZINES = "related_magazines", "Related magazine promotion"
        NEWSLETTER = "newsletter", "Newsletter sponsorship"
        FEATURED_PARTNER = "featured_partner", "Featured partner promotion"

    title = models.CharField(max_length=160)
    advertiser = models.CharField(max_length=120)
    description = models.CharField(max_length=280, blank=True)
    image = models.ImageField(upload_to="advertisements/", blank=True)
    destination_url = models.URLField(max_length=500)
    placement = models.CharField(max_length=32, choices=Placement.choices, db_index=True)
    starts_at = models.DateTimeField(null=True, blank=True, db_index=True)
    ends_at = models.DateTimeField(null=True, blank=True, db_index=True)
    is_active = models.BooleanField(default=False, db_index=True)
    display_priority = models.PositiveSmallIntegerField(default=0)
    campaign_identifier = models.CharField(max_length=80, blank=True, db_index=True)
    alt_text = models.CharField(max_length=180, blank=True)
    cta_label = models.CharField(max_length=50, default="Learn more")
    track_impressions = models.BooleanField(default=True)
    track_clicks = models.BooleanField(default=True)
    is_demo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-display_priority", "title"]
        indexes = [
            models.Index(fields=["placement", "is_active", "starts_at", "ends_at"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_placement_display()})"

    def clean(self):
        super().clean()
        try:
            parts = urlsplit(self.destination_url)
        except ValueError as error:
            raise ValidationError({"destination_url": "Use a complete http or https destination URL."}) from error
        if parts.scheme not in {"http", "https"} or not parts.netloc:
            raise ValidationError({"destination_url": "Use a complete http or https destination URL."})
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "The campaign end must be later than its start."})

    @property
    def has_image(self):
        return bool(self.image and self.image.storage.exists(self.image.name))

    @property
    def is_currently_eligible(self):
        now = timezone.now()
        return (
            self.is_active
            and (self.starts_at is None or self.starts_at <= now)
            and (self.ends_at is None or self.ends_at > now)
        )

    def get_click_url(self):
        return reverse("advertisement_click", kwargs={"pk": self.pk})


class AdvertisementEvent(models.Model):
    class EventType(models.TextChoices):
        IMPRESSION = "impression", "Impression"
        CLICK = "click", "Click"

    advertisement = models.ForeignKey(
        Advertisement, on_delete=models.CASCADE, related_name="events"
    )
    event_type = models.CharField(max_length=12, choices=EventType.choices, db_index=True)
    placement = models.CharField(max_length=32, choices=Advertisement.Placement.choices, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["placement", "created_at"]),
        ]

    def __str__(self):
        return f"{self.get_event_type_display()} — {self.advertisement}"

class FeaturedLeader(models.Model):
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    designation = models.CharField(max_length=160, blank=True)
    organization = models.CharField(max_length=160, blank=True)
    introduction = models.TextField(blank=True)
    portrait = models.ImageField(upload_to="leaders/", blank=True)
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="leaders"
    )
    article = models.ForeignKey(
        Article, on_delete=models.SET_NULL, null=True, blank=True, related_name="featured_leaders"
    )
    magazine = models.ForeignKey(
        Magazine, on_delete=models.SET_NULL, null=True, blank=True, related_name="featured_leaders"
    )
    publication_date = models.DateField(default=timezone.localdate, db_index=True)
    is_published = models.BooleanField(default=False, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "-publication_date", "name"]
        indexes = [models.Index(fields=["is_published", "publication_date"])]

    def __str__(self):
        return self.name

    @property
    def has_portrait(self):
        return bool(self.portrait and self.portrait.storage.exists(self.portrait.name))

    def clean(self):
        if not self.article_id and not self.magazine_id:
            raise ValidationError("Link a published article or magazine to this leader feature.")

    def get_absolute_url(self):
        return reverse("leader_detail", kwargs={"slug": self.slug})


class HomepageSection(models.Model):
    title = models.CharField(max_length=120)
    subtitle = models.CharField(max_length=240, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="homepage_sections")
    featured_articles = models.ManyToManyField(Article, blank=True, related_name="homepage_sections")
    display_order = models.PositiveSmallIntegerField(default=0)
    is_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["display_order", "pk"]

    def __str__(self):
        return self.title


class PartnerOrganization(models.Model):
    name = models.CharField(max_length=120)
    logo = models.ImageField(upload_to="partners/", blank=True)
    website_url = models.URLField(blank=True)
    display_order = models.PositiveSmallIntegerField(default=0)
    is_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name = "partner organization"
        verbose_name_plural = "partner organizations"

    def __str__(self):
        return self.name


class Announcement(models.Model):
    title = models.CharField(max_length=160)
    message = models.CharField(max_length=280, blank=True)
    link_label = models.CharField(max_length=80, blank=True)
    link_url = models.URLField(blank=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class DemoSeedRecord(models.Model):
    model_name = models.CharField(max_length=100)
    object_id = models.PositiveBigIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["model_name", "object_id"], name="unique_demo_seed_record")
        ]


class SiteConfiguration(models.Model):
    site_name = models.CharField(max_length=100, default="THE GLOBAL ICON")
    tagline = models.CharField(max_length=180, default="Stories That Shape Tomorrow.")
    hero_title = models.CharField(max_length=180, default="Stories That Shape Tomorrow.")
    hero_copy = models.CharField(max_length=320, default="Discover the people, ideas, and innovations shaping our world.")
    featured_article = models.ForeignKey(
        Article, on_delete=models.SET_NULL, null=True, blank=True, related_name="featured_on_homepage"
    )
    featured_magazine = models.ForeignKey(
        Magazine, on_delete=models.SET_NULL, null=True, blank=True, related_name="featured_on_homepage"
    )
    newsletter_heading = models.CharField(max_length=140, default="The week, in perspective.")
    newsletter_copy = models.CharField(max_length=240, default="Thoughtful reads and new editions, delivered to your inbox.")
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    office_address = models.CharField(max_length=240, blank=True)
    contact_response_time = models.CharField(max_length=120, blank=True)
    linkedin_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "site configuration"
        permissions = [
            ("manage_site_configuration", "Can manage site-wide editorial configuration"),
        ]

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        return None

    @classmethod
    def load(cls):
        return cls.objects.filter(pk=1).first() or cls(pk=1)

    def __str__(self):
        return "Site configuration"


def generate_enquiry_reference():
    return f"ENQ-{uuid.uuid4().hex.upper()}"


class ClientEnquiry(models.Model):
    class EnquiryType(models.TextChoices):
        ADVERTISING = "advertising", "Advertising and sponsorship"
        FEATURE = "feature", "Magazine feature or interview"
        SUBSCRIPTION = "subscription", "Magazine subscription"
        PARTNERSHIP = "partnership", "Publishing partnership"
        COLLABORATION = "collaboration", "Business collaboration"
        EDITORIAL = "editorial", "Editorial enquiry"
        TECHNICAL = "technical", "Technical support"
        GENERAL = "general", "General enquiry"

    class Status(models.TextChoices):
        NEW = "new", "New"
        UNDER_REVIEW = "under_review", "Under review"
        CONTACTED = "contacted", "Contacted"
        AWAITING_CLIENT = "awaiting_client", "Awaiting client response"
        QUALIFIED = "qualified", "Qualified"
        CONVERTED = "converted", "Converted"
        CLOSED = "closed", "Closed"
        SPAM = "spam", "Spam"

    class PreferredContact(models.TextChoices):
        EMAIL = "email", "Email"
        PHONE = "phone", "Phone"

    class EmailNotificationStatus(models.TextChoices):
        NOT_CONFIGURED = "not_configured", "Not configured"
        SENT = "sent", "Accepted by email backend"
        FAILED = "failed", "Failed"

    reference = models.CharField(
        max_length=36, unique=True, default=generate_enquiry_reference, editable=False
    )
    submission_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="client_enquiries",
    )
    full_name = models.CharField(max_length=160)
    company = models.CharField(max_length=160)
    email = models.EmailField(max_length=254)
    phone = models.CharField(max_length=32, blank=True)
    job_title = models.CharField(max_length=120, blank=True)
    website = models.URLField(max_length=300, blank=True)
    country_or_region = models.CharField(max_length=100, blank=True)
    enquiry_type = models.CharField(max_length=24, choices=EnquiryType.choices, db_index=True)
    subject = models.CharField(max_length=180)
    message = models.TextField(max_length=5000)
    estimated_budget = models.CharField(max_length=100, blank=True)
    preferred_contact = models.CharField(
        max_length=12, choices=PreferredContact.choices, blank=True
    )
    preferred_follow_up_time = models.CharField(max_length=120, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True, db_index=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEW, db_index=True
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"is_staff": True},
        related_name="assigned_client_enquiries",
    )
    internal_notes = models.TextField(blank=True)
    follow_up_at = models.DateTimeField(null=True, blank=True)
    email_notification_status = models.CharField(
        max_length=20,
        choices=EmailNotificationStatus.choices,
        default=EmailNotificationStatus.NOT_CONFIGURED,
    )
    email_notification_error = models.CharField(max_length=240, blank=True)
    email_notified_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-submitted_at"]
        indexes = [
            models.Index(fields=["status", "submitted_at"]),
            models.Index(fields=["enquiry_type", "submitted_at"]),
            models.Index(fields=["assigned_to", "status"]),
        ]
        permissions = [
            ("manage_client_enquiry", "Can manage client enquiries"),
        ]

    def __str__(self):
        return f"{self.reference} — {self.subject}"


class ReaderPreference(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reader_preferences"
    )
    preferred_categories = models.ManyToManyField(
        Category, blank=True, related_name="reader_preferences"
    )
    notify_followed_publications = models.BooleanField(default=True)

    def __str__(self):
        return f"Reading preferences for {self.user}"


class UserNotification(models.Model):
    class NotificationType(models.TextChoices):
        NEW_PUBLICATION = "new_publication", "New publication"
        CLIENT_ENQUIRY = "client_enquiry", "Client enquiry"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    notification_type = models.CharField(max_length=24, choices=NotificationType.choices)
    title = models.CharField(max_length=180)
    message = models.CharField(max_length=280)
    target_url = models.CharField(max_length=500, blank=True)
    dedupe_key = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["recipient", "dedupe_key"], name="unique_notification_per_recipient"
            )
        ]
        indexes = [models.Index(fields=["recipient", "read_at", "created_at"])]

    def __str__(self):
        return f"{self.title} — {self.recipient}"


class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    unsubscribe_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    consented_at = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True, db_index=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-consented_at"]

    def __str__(self):
        return self.email

    def unsubscribe(self):
        self.is_active = False
        self.unsubscribed_at = timezone.now()
        self.save(update_fields=["is_active", "unsubscribed_at"])


class SavedContent(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_content")
    article = models.ForeignKey(
        Article, on_delete=models.CASCADE, null=True, blank=True, related_name="saved_by"
    )
    magazine = models.ForeignKey(
        Magazine, on_delete=models.CASCADE, null=True, blank=True, related_name="saved_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(article__isnull=False, magazine__isnull=True)
                    | Q(article__isnull=True, magazine__isnull=False)
                ),
                name="saved_content_exactly_one_item",
            ),
            models.UniqueConstraint(
                fields=["user", "article"],
                name="unique_saved_article_per_user",
            ),
            models.UniqueConstraint(
                fields=["user", "magazine"],
                name="unique_saved_magazine_per_user",
            ),
        ]


class ReadingHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reading_history")
    article = models.ForeignKey(
        Article, on_delete=models.CASCADE, null=True, blank=True, related_name="reader_history"
    )
    magazine = models.ForeignKey(
        Magazine, on_delete=models.CASCADE, null=True, blank=True, related_name="reader_history"
    )
    last_viewed_at = models.DateTimeField(default=timezone.now)
    last_page = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["-last_viewed_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(article__isnull=False, magazine__isnull=True)
                    | Q(article__isnull=True, magazine__isnull=False)
                ),
                name="reading_history_exactly_one_item",
            ),
            models.UniqueConstraint(
                fields=["user", "article"],
                name="unique_read_article_per_user",
            ),
            models.UniqueConstraint(
                fields=["user", "magazine"],
                name="unique_read_magazine_per_user",
            ),
        ]


class ManagementAuditEvent(models.Model):
    class EventType(models.TextChoices):
        MAGAZINE_SUBMITTED = "magazine_submitted", "Magazine submitted"
        MAGAZINE_APPROVED = "magazine_approved", "Magazine approved"
        MAGAZINE_CHANGES_REQUESTED = "magazine_changes_requested", "Magazine changes requested"
        MAGAZINE_PUBLISHED = "magazine_published", "Magazine published"
        MAGAZINE_UNPUBLISHED = "magazine_unpublished", "Magazine unpublished"
        MAGAZINE_ARCHIVED = "magazine_archived", "Magazine archived"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="management_audit_events",
    )
    event_type = models.CharField(max_length=40, choices=EventType.choices, db_index=True)
    model_label = models.CharField(max_length=120)
    object_id = models.CharField(max_length=80)
    object_repr = models.CharField(max_length=255)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        permissions = [
            ("view_management_audit_event", "Can view management audit events"),
        ]

    def __str__(self):
        return f"{self.get_event_type_display()} — {self.object_repr}"
