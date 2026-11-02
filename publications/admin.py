from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    Article,
    Advertisement,
    AdvertisementEvent,
    Announcement,
    Author,
    Category,
    ClientEnquiry,
    Edition,
    FeaturedLeader,
    HomepageSection,
    Magazine,
    ManagementAuditEvent,
    NewsletterSubscriber,
    PartnerOrganization,
    SiteConfiguration,
)


@admin.register(Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    change_list_template = "admin/publications/advertisement/change_list.html"
    list_display = ("title", "advertiser", "placement", "is_active", "is_demo", "display_priority")
    list_filter = ("placement", "is_active", "is_demo", "track_impressions", "track_clicks")
    search_fields = ("title", "advertiser", "campaign_identifier")
    readonly_fields = ("created_at",)
    fieldsets = (
        ("Campaign", {"fields": ("title", "advertiser", "campaign_identifier", "description")}),
        ("Creative and destination", {"fields": ("image", "alt_text", "destination_url", "cta_label")}),
        ("Placement and schedule", {"fields": ("placement", "display_priority", "starts_at", "ends_at", "is_active")}),
        ("Tracking and demo label", {"fields": ("track_impressions", "track_clicks", "is_demo", "created_at")}),
    )


@admin.register(AdvertisementEvent)
class AdvertisementEventAdmin(admin.ModelAdmin):
    list_display = ("advertisement", "event_type", "placement", "created_at")
    list_filter = ("event_type", "placement", "created_at")
    search_fields = ("advertisement__title", "advertisement__campaign_identifier")
    date_hierarchy = "created_at"
    readonly_fields = ("advertisement", "event_type", "placement", "created_at")

    def has_add_permission(self, request):
        return False

    def has_view_permission(self, request, obj=None):
        return request.user.has_perm("publications.view_advertisementevent")

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "category", "status", "is_featured", "published_at")
    list_filter = ("status", "category", "language", "is_featured", "is_sponsored")
    search_fields = ("title", "excerpt", "body", "author__name")
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "published_at"
    actions = ["publish_selected"]

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        if not request.user.has_perm("publications.publish_article"):
            fields.extend(("status", "published_at"))
        return fields

    def save_model(self, request, obj, form, change):
        if not request.user.has_perm("publications.publish_article"):
            if change:
                previous = Article.objects.get(pk=obj.pk)
                obj.status = previous.status
                obj.published_at = previous.published_at
            elif obj.status == Article.Status.PUBLISHED:
                obj.status = Article.Status.DRAFT
                obj.published_at = None
        super().save_model(request, obj, form, change)

    def has_publish_articles_permission(self, request):
        return request.user.has_perm("publications.publish_article")

    @admin.action(description="Publish selected articles", permissions=["publish_articles"])
    def publish_selected(self, request, queryset):
        if not request.user.has_perm("publications.publish_article"):
            self.message_user(request, "You do not have permission to publish articles.", level="error")
            return
        now = timezone.now()
        for article in queryset.iterator():
            article.status = Article.Status.PUBLISHED
            article.published_at = now
            article.save(update_fields=("status", "published_at", "updated_at"))


@admin.register(Magazine)
class MagazineAdmin(admin.ModelAdmin):
    list_display = ("title", "cover_preview", "edition", "issue_number", "publication_date", "access", "is_published", "is_featured")
    list_filter = ("is_published", "access", "edition", "category", "language")
    search_fields = ("title", "subtitle", "description")
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "publication_date"
    filter_horizontal = ("related_articles", "related_magazines")
    readonly_fields = ("cover_preview",)
    fieldsets = (
        ("Edition details", {"fields": ("title", "slug", "subtitle", "description", "publisher_name", "issue_number", "publication_date", "language", "translated_from")}),
        ("Classification", {"fields": ("category", "edition", "access")}),
        ("Related content", {"fields": ("related_articles", "related_magazines")}),
        ("Cover and PDF", {"fields": ("cover", "cover_alt_text", "cover_preview", "pdf_file", "allow_download")}),
        ("Workflow", {"fields": ("review_status", "submitted_by", "submitted_at", "reviewed_by", "reviewed_at")}),
        ("Publication", {"fields": ("is_published", "published_by", "published_at", "is_featured", "meta_description")}),
    )

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        if not request.user.has_perm("publications.approve_magazine"):
            fields.append("review_status")
        if not request.user.has_perm("publications.publish_magazine"):
            fields.append("is_published")
        fields.extend(
            (
                "submitted_by",
                "submitted_at",
                "reviewed_by",
                "reviewed_at",
                "published_by",
                "published_at",
            )
        )
        return tuple(dict.fromkeys(fields))

    def save_model(self, request, obj, form, change):
        previous = Magazine.objects.filter(pk=obj.pk).first() if change else None
        if previous and not request.user.has_perm("publications.approve_magazine"):
            obj.review_status = previous.review_status
            obj.reviewed_by = previous.reviewed_by
            obj.reviewed_at = previous.reviewed_at
        if previous and not request.user.has_perm("publications.publish_magazine"):
            obj.is_published = previous.is_published
            obj.published_by = previous.published_by
            obj.published_at = previous.published_at
            if obj.review_status == Magazine.ReviewStatus.ARCHIVED:
                obj.review_status = previous.review_status
        if obj.is_published and (
            obj.review_status != Magazine.ReviewStatus.APPROVED or not obj.has_pdf
        ):
            obj.is_published = previous.is_published if previous else False
            self.message_user(
                request,
                "Only approved editions with a valid PDF can be published.",
                level="error",
            )
        if obj.is_published and not (previous and previous.is_published):
            obj.published_by = request.user
            obj.published_at = timezone.now()
        if (
            obj.review_status == Magazine.ReviewStatus.IN_REVIEW
            and (
                not previous
                or previous.review_status != Magazine.ReviewStatus.IN_REVIEW
            )
        ):
            obj.submitted_by = request.user
            obj.submitted_at = timezone.now()
        if (
            previous
            and request.user.has_perm("publications.approve_magazine")
            and previous.review_status != obj.review_status
            and obj.review_status
            in (
                Magazine.ReviewStatus.APPROVED,
                Magazine.ReviewStatus.CHANGES_REQUESTED,
            )
        ):
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)
        if not change and obj.review_status == Magazine.ReviewStatus.IN_REVIEW:
            ManagementAuditEvent.objects.create(
                actor=request.user,
                event_type=ManagementAuditEvent.EventType.MAGAZINE_SUBMITTED,
                model_label=Magazine._meta.label_lower,
                object_id=str(obj.pk),
                object_repr=str(obj),
                details={"source": "django_admin"},
            )
        elif previous and (
            previous.review_status != obj.review_status
            or previous.is_published != obj.is_published
        ):
            if obj.is_published:
                event_type = ManagementAuditEvent.EventType.MAGAZINE_PUBLISHED
            elif previous.is_published:
                event_type = ManagementAuditEvent.EventType.MAGAZINE_UNPUBLISHED
            elif obj.review_status == Magazine.ReviewStatus.APPROVED:
                event_type = ManagementAuditEvent.EventType.MAGAZINE_APPROVED
            elif obj.review_status == Magazine.ReviewStatus.CHANGES_REQUESTED:
                event_type = ManagementAuditEvent.EventType.MAGAZINE_CHANGES_REQUESTED
            elif obj.review_status == Magazine.ReviewStatus.IN_REVIEW:
                event_type = ManagementAuditEvent.EventType.MAGAZINE_SUBMITTED
            else:
                event_type = ManagementAuditEvent.EventType.MAGAZINE_ARCHIVED
            ManagementAuditEvent.objects.create(
                actor=request.user,
                event_type=event_type,
                model_label=Magazine._meta.label_lower,
                object_id=str(obj.pk),
                object_repr=str(obj)[:255],
                details={"source": "django_admin"},
            )

    @admin.display(description="Cover preview")
    def cover_preview(self, obj):
        if not obj or not obj.has_cover:
            return "No cover uploaded; the public site will use its editorial fallback."
        return format_html(
            '<img src="{}" alt="{}" style="height:120px;width:auto;object-fit:cover">',
            obj.cover.url,
            obj.cover_alt_text or obj.title,
        )


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active", "starts_at", "ends_at", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("title", "message")
    readonly_fields = ("updated_at",)


@admin.register(FeaturedLeader)
class FeaturedLeaderAdmin(admin.ModelAdmin):
    list_display = ("name", "designation", "organization", "category", "publication_date", "is_published", "is_featured", "display_order")
    list_filter = ("is_published", "is_featured", "category", "publication_date", "magazine__edition")
    search_fields = ("name", "designation", "organization", "article__title", "magazine__title")
    prepopulated_fields = {"slug": ("name",)}
    autocomplete_fields = ("article", "magazine")


@admin.register(HomepageSection)
class HomepageSectionAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "display_order", "is_visible")
    list_filter = ("is_visible", "category")
    list_editable = ("display_order", "is_visible")
    filter_horizontal = ("featured_articles",)


@admin.register(PartnerOrganization)
class PartnerOrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "display_order", "is_visible")
    list_filter = ("is_visible",)
    list_editable = ("display_order", "is_visible")


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ("name", "user")
    search_fields = ("name", "bio")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Edition)
class EditionAdmin(admin.ModelAdmin):
    list_display = ("name", "region", "slug")
    search_fields = ("name", "region")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ("email", "is_active", "consented_at", "unsubscribed_at")
    list_filter = ("is_active",)
    search_fields = ("email",)
    readonly_fields = ("consented_at", "unsubscribed_at")


@admin.register(SiteConfiguration)
class SiteConfigurationAdmin(admin.ModelAdmin):
    fieldsets = (
        ("Brand", {"fields": ("site_name", "tagline", "hero_title", "hero_copy")}),
        ("Homepage features", {"fields": ("featured_article", "featured_magazine")}),
        ("Newsletter", {"fields": ("newsletter_heading", "newsletter_copy")}),
        ("Contact and social", {"fields": ("contact_email", "contact_phone", "office_address", "contact_response_time", "linkedin_url", "instagram_url")}),
    )

    def has_add_permission(self, request):
        return request.user.has_perm("publications.manage_site_configuration") and not SiteConfiguration.objects.exists()

    def has_view_permission(self, request, obj=None):
        return request.user.has_perm("publications.manage_site_configuration")

    def has_change_permission(self, request, obj=None):
        return request.user.has_perm("publications.manage_site_configuration")

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ManagementAuditEvent)
class ManagementAuditEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "actor", "object_repr", "created_at")
    list_filter = ("event_type", "created_at")
    search_fields = ("object_repr", "model_label", "object_id", "actor__username")
    date_hierarchy = "created_at"
    readonly_fields = (
        "actor",
        "event_type",
        "model_label",
        "object_id",
        "object_repr",
        "details",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ClientEnquiry)
class ClientEnquiryAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "full_name",
        "company",
        "email",
        "enquiry_type",
        "status",
        "assigned_to",
        "submitted_at",
    )
    list_filter = ("status", "enquiry_type", "submitted_at")
    search_fields = ("reference", "full_name", "company", "email", "subject")
    date_hierarchy = "submitted_at"
    list_select_related = ("assigned_to", "submitted_by")
    list_per_page = 30
    ordering = ("-submitted_at",)
    readonly_fields = (
        "reference",
        "submission_token",
        "submitted_by",
        "full_name",
        "company",
        "email",
        "phone",
        "job_title",
        "website",
        "country_or_region",
        "enquiry_type",
        "subject",
        "message",
        "estimated_budget",
        "preferred_contact",
        "preferred_follow_up_time",
        "submitted_at",
        "email_notification_status",
        "email_notification_error",
        "email_notified_at",
        "updated_at",
    )
    fieldsets = (
        (
            "Client enquiry",
            {
                "fields": (
                    "reference",
                    "submitted_at",
                    "full_name",
                    "company",
                    "email",
                    "phone",
                    "job_title",
                    "website",
                    "country_or_region",
                    "enquiry_type",
                    "subject",
                    "message",
                    "estimated_budget",
                    "preferred_contact",
                    "preferred_follow_up_time",
                )
            },
        ),
        (
            "Internal follow-up",
            {
                "fields": (
                    "status",
                    "assigned_to",
                    "follow_up_at",
                    "internal_notes",
                    "email_notification_status",
                    "email_notification_error",
                    "email_notified_at",
                    "updated_at",
                )
            },
        ),
        ("Technical", {"classes": ("collapse",), "fields": ("submission_token", "submitted_by")}),
    )

    def has_module_permission(self, request):
        return request.user.has_perm("publications.manage_client_enquiry")

    def has_view_permission(self, request, obj=None):
        return request.user.has_perm("publications.manage_client_enquiry")

    def has_change_permission(self, request, obj=None):
        return request.user.has_perm("publications.manage_client_enquiry")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
