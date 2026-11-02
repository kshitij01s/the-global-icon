from datetime import timedelta
import json
import logging
import smtplib
import time
import uuid
from functools import wraps
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import update_session_auth_hash
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.mail import send_mail
from django.core.paginator import Paginator
from django.core.validators import validate_email
from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Case, Count, IntegerField, Prefetch, Q, Value, When
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST, require_safe
from django.contrib.auth import get_user_model

from .advertising import eligible_advertisements
from .forms import (
    ClientEnquiryForm,
    MagazineUploadForm,
    NewsletterSignupForm,
    ReaderProfileForm,
    ReaderPreferenceForm,
    ReaderRegistrationForm,
)
from .models import (
    Advertisement,
    AdvertisementEvent,
    Article,
    Category,
    ClientEnquiry,
    CONTENT_LANGUAGES,
    DemoSeedRecord,
    Edition,
    FeaturedLeader,
    HomepageSection,
    Magazine,
    ManagementAuditEvent,
    NewsletterSubscriber,
    PartnerOrganization,
    ReaderPreference,
    ReadingHistory,
    SavedContent,
    SiteConfiguration,
    UserNotification,
)

logger = logging.getLogger(__name__)
User = get_user_model()


def published_articles(user=None):
    articles = Article.objects.filter(
        status=Article.Status.PUBLISHED,
        published_at__lte=timezone.now(),
    ).select_related("author", "category")
    if not has_member_access(user):
        articles = articles.filter(member_only=False)
    return articles


def public_magazines(user=None, include_members=False):
    magazines = Magazine.objects.filter(
        is_published=True, publication_date__lte=timezone.localdate()
    ).select_related("edition", "category")
    if not include_members and not has_member_access(user):
        magazines = magazines.filter(access=Magazine.Access.PUBLIC)
    return magazines


def record_magazine_history(user, magazine, last_page=None):
    updates = {"last_viewed_at": timezone.now()}
    if last_page is not None:
        updates["last_page"] = last_page
    history = ReadingHistory.objects.filter(user=user, magazine=magazine).first()
    if history:
        ReadingHistory.objects.filter(pk=history.pk).update(**updates)
        for field, value in updates.items():
            setattr(history, field, value)
        return history

    try:
        return ReadingHistory.objects.create(user=user, magazine=magazine, **updates)
    except IntegrityError:
        history = ReadingHistory.objects.filter(user=user, magazine=magazine).first()
        if history is None:
            raise
        ReadingHistory.objects.filter(pk=history.pk).update(**updates)
        for field, value in updates.items():
            setattr(history, field, value)
        return history


def staff_permission_required(permission):
    def decorate(view_func):
        @wraps(view_func)
        @login_required
        def guarded(request, *args, **kwargs):
            if not request.user.is_staff or not request.user.has_perm(permission):
                raise PermissionDenied
            return view_func(request, *args, **kwargs)

        return guarded

    return decorate


def audit_management_event(actor, event_type, obj, details=None):
    return ManagementAuditEvent.objects.create(
        actor=actor,
        event_type=event_type,
        model_label=obj._meta.label_lower,
        object_id=str(obj.pk),
        object_repr=str(obj)[:255],
        details=details or {},
    )


def home(request):
    config = SiteConfiguration.load()
    articles = published_articles(request.user)
    magazines = public_magazines(request.user)
    featured_article = config.featured_article
    if not featured_article or featured_article not in articles:
        featured_article = articles.filter(is_featured=True).first() or articles.first()
    featured_magazine = config.featured_magazine
    if not featured_magazine or featured_magazine not in magazines:
        featured_magazine = magazines.filter(is_featured=True).first() or magazines.first()
    sections = HomepageSection.objects.filter(is_visible=True).select_related("category").prefetch_related(
        Prefetch(
            "category__articles",
            queryset=published_articles(request.user)[:3],
            to_attr="homepage_articles",
        ),
        Prefetch(
            "featured_articles",
            queryset=published_articles(request.user),
            to_attr="selected_articles",
        ),
    )[:4]
    leaders = public_leaders(request.user)[:4]
    recommended_magazines = Magazine.objects.none()
    if request.user.is_authenticated:
        preference = ReaderPreference.objects.filter(user=request.user).first()
        if preference and preference.notify_followed_publications:
            followed_category_ids = preference.preferred_categories.values_list("pk", flat=True)
            recently_read_ids = ReadingHistory.objects.filter(
                user=request.user, magazine__isnull=False
            ).values_list("magazine_id", flat=True)
            saved_ids = SavedContent.objects.filter(
                user=request.user, magazine__isnull=False
            ).values_list("magazine_id", flat=True)
            recommended_magazines = (
                public_magazines(request.user)
                .filter(category_id__in=followed_category_ids)
                .exclude(Q(pk__in=recently_read_ids) | Q(pk__in=saved_ids))
                .distinct()[:4]
            )
    return render(
        request,
        "publications/home.html",
        {
            "config": config,
            "featured_article": featured_article,
            "featured_magazine": featured_magazine,
            "articles": articles.exclude(pk=getattr(featured_article, "pk", None))[:4],
            "magazines": magazines[:4],
            "categories": Category.objects.all()[:8],
            "carousel_magazines": magazines[:8],
            "ticker_articles": articles.order_by("-published_at", "-pk")[:8],
            "leaders": leaders,
            "homepage_sections": sections,
            "partners": PartnerOrganization.objects.filter(is_visible=True),
            "recommended_magazines": recommended_magazines,
        },
    )


def register_reader(request):
    if request.user.is_authenticated:
        return redirect("account")
    form = ReaderRegistrationForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.save()
        login(request, user)
        messages.success(request, "Your reader account is ready.")
        return redirect("account")
    return render(request, "registration/register.html", {"form": form})


def contact(request):
    session_token = request.session.get("contact_submission_token")
    if not session_token:
        session_token = str(uuid.uuid4())
        request.session["contact_submission_token"] = session_token
    form = ClientEnquiryForm(
        request.POST or None,
        initial={"submission_token": session_token},
    )
    if request.method == "POST":
        if form.is_valid():
            if str(form.cleaned_data["submission_token"]) != str(session_token):
                form.add_error(None, "This form has expired. Refresh the page and try again.")
            else:
                now = time.time()
                try:
                    recent_submissions = [
                        float(timestamp)
                        for timestamp in request.session.get("contact_submission_times", [])
                        if now - float(timestamp) < 15 * 60
                    ]
                except (TypeError, ValueError):
                    recent_submissions = []
                if len(recent_submissions) >= 3:
                    form.add_error(
                        None,
                        "For security, please wait a little before sending another enquiry.",
                    )
                else:
                    enquiry = form.save(commit=False)
                    enquiry.submission_token = form.cleaned_data["submission_token"]
                    enquiry.submitted_by = request.user if request.user.is_authenticated else None
                    created = False
                    try:
                        with transaction.atomic():
                            try:
                                with transaction.atomic():
                                    enquiry.save(force_insert=True)
                                created = True
                            except IntegrityError:
                                enquiry = ClientEnquiry.objects.get(
                                    submission_token=form.cleaned_data["submission_token"]
                                )
                            if created:
                                for manager in User.objects.filter(is_staff=True):
                                    if manager.has_perm("publications.manage_client_enquiry"):
                                        UserNotification.objects.get_or_create(
                                            recipient=manager,
                                            dedupe_key=f"enquiry:{enquiry.reference}",
                                            defaults={
                                                "notification_type": UserNotification.NotificationType.CLIENT_ENQUIRY,
                                                "title": "New client enquiry",
                                                "message": (
                                                    f"{enquiry.reference} · "
                                                    f"{enquiry.get_enquiry_type_display()}"
                                                ),
                                                "target_url": reverse(
                                                    "admin:publications_clientenquiry_change",
                                                    args=[enquiry.pk],
                                                ),
                                            },
                                        )
                    except DatabaseError:
                        logger.error(
                            "Client enquiry could not be saved for submission token %s.",
                            form.cleaned_data["submission_token"],
                        )
                        form.add_error(
                            None,
                            "We could not save your enquiry. Please try again in a moment.",
                        )
                    else:
                        recent_submissions.append(now)
                        request.session["contact_submission_times"] = recent_submissions
                        request.session["contact_submission_token"] = str(uuid.uuid4())
                        request.session["contact_submission_reference"] = enquiry.reference
                        if created:
                            _send_contact_notification(enquiry)
                        return redirect("contact_thanks")
        else:
            form.add_error(
                None,
                "Please review the highlighted fields and correct them before sending.",
            )
    config = SiteConfiguration.load()
    return render(request, "publications/contact.html", {"form": form, "config": config})


def _send_contact_notification(enquiry):
    recipient = settings.CONTACT_RECIPIENT_EMAIL
    backend = settings.EMAIL_BACKEND
    if (
        not recipient
        or backend.endswith("console.EmailBackend")
        or "example.com" in settings.DEFAULT_FROM_EMAIL.lower()
        or "example.test" in settings.DEFAULT_FROM_EMAIL.lower()
    ):
        return
    try:
        validate_email(recipient)
    except ValidationError:
        enquiry.email_notification_status = ClientEnquiry.EmailNotificationStatus.FAILED
        enquiry.email_notification_error = "The configured notification recipient is invalid."
        enquiry.save(
            update_fields=(
                "email_notification_status",
                "email_notification_error",
                "updated_at",
            )
        )
        logger.warning("Contact email configuration is invalid for enquiry %s.", enquiry.reference)
        return
    subject = f"New client enquiry {enquiry.reference}: {enquiry.subject}"
    body = (
        f"Reference: {enquiry.reference}\n"
        f"Name: {enquiry.full_name}\n"
        f"Company: {enquiry.company}\n"
        f"Email: {enquiry.email}\n"
        f"Type: {enquiry.get_enquiry_type_display()}\n"
        f"Subject: {enquiry.subject}\n"
        f"Submitted: {timezone.localtime(enquiry.submitted_at):%Y-%m-%d %H:%M %Z}\n\n"
        f"{enquiry.message}\n\n"
        f"Internal staff page: {settings.PUBLIC_SITE_URL}"
        f"{reverse('admin:publications_clientenquiry_change', args=[enquiry.pk])}"
    )
    try:
        accepted = send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [recipient],
            fail_silently=False,
        )
    except (OSError, smtplib.SMTPException, ValueError):
        accepted = 0
    if accepted:
        enquiry.email_notification_status = ClientEnquiry.EmailNotificationStatus.SENT
        enquiry.email_notification_error = ""
        enquiry.email_notified_at = timezone.now()
    else:
        enquiry.email_notification_status = ClientEnquiry.EmailNotificationStatus.FAILED
        enquiry.email_notification_error = "The email service did not accept the notification."
        logger.warning("Contact email notification failed for enquiry %s.", enquiry.reference)
    enquiry.save(
        update_fields=(
            "email_notification_status",
            "email_notification_error",
            "email_notified_at",
            "updated_at",
        )
    )


def contact_thanks(request):
    reference = request.session.pop("contact_submission_reference", None)
    if not reference:
        return redirect("contact")
    return render(request, "publications/contact_thanks.html", {"reference": reference})


@login_required
def client_enquiries(request):
    enquiries = ClientEnquiry.objects.filter(submitted_by=request.user).only(
        "reference", "subject", "enquiry_type", "status", "submitted_at", "pk"
    )
    return render(request, "publications/client_enquiries.html", {"enquiries": enquiries})


@login_required
def client_enquiry_detail(request, pk):
    enquiry = get_object_or_404(ClientEnquiry, submitted_by=request.user, pk=pk)
    return render(request, "publications/client_enquiry_detail.html", {"enquiry": enquiry})


@login_required
def account_notifications(request):
    notifications = UserNotification.objects.filter(recipient=request.user)
    page = Paginator(notifications, 30).get_page(request.GET.get("page"))
    return render(request, "publications/notifications.html", {"page": page})


@login_required
@require_POST
def mark_notification_read(request, pk):
    notification = get_object_or_404(UserNotification, recipient=request.user, pk=pk)
    if notification.read_at is None:
        notification.read_at = timezone.now()
        notification.save(update_fields=("read_at",))
    if notification.target_url:
        return redirect(notification.target_url)
    return redirect("account_notifications")


@login_required
@require_POST
def mark_all_notifications_read(request):
    UserNotification.objects.filter(recipient=request.user, read_at__isnull=True).update(
        read_at=timezone.now()
    )
    messages.success(request, "Your notifications are marked as read.")
    return redirect("account_notifications")


@login_required
def management_dashboard(request):
    if not request.user.is_staff:
        raise PermissionDenied
    user = request.user
    context = {
        "can_view_magazines": user.has_perm("publications.view_magazine"),
        "can_upload_magazines": user.has_perm("publications.add_magazine"),
        "can_approve_magazines": user.has_perm("publications.approve_magazine"),
        "can_publish_magazines": user.has_perm("publications.publish_magazine"),
        "can_view_articles": user.has_perm("publications.view_article"),
        "can_manage_ads": user.has_perm("publications.view_advertisement"),
        "can_view_subscribers": user.has_perm("publications.view_newslettersubscriber"),
        "can_manage_site": user.has_perm("publications.manage_site_configuration"),
        "can_manage_enquiries": user.has_perm("publications.manage_client_enquiry"),
        "is_superuser": user.is_superuser,
    }
    if context["can_view_magazines"]:
        context.update(
            magazine_total=Magazine.objects.count(),
            magazine_published=Magazine.objects.filter(is_published=True).count(),
            magazine_draft=Magazine.objects.filter(
                is_published=False,
                review_status=Magazine.ReviewStatus.DRAFT,
            ).count(),
        )
    if context["can_approve_magazines"]:
        context["magazine_pending"] = Magazine.objects.filter(
            is_published=False,
            review_status=Magazine.ReviewStatus.IN_REVIEW,
        ).count()
    if context["can_view_articles"]:
        context["article_total"] = Article.objects.count()
    if context["can_manage_ads"]:
        context["active_advertisements"] = eligible_advertisements().count()
    if context["can_view_subscribers"]:
        context["active_subscribers"] = NewsletterSubscriber.objects.filter(is_active=True).count()
    if context["can_manage_enquiries"]:
        context["new_enquiries"] = ClientEnquiry.objects.filter(status=ClientEnquiry.Status.NEW).count()
        context["unread_notifications"] = UserNotification.objects.filter(
            recipient=user, read_at__isnull=True
        ).count()
    return render(request, "management/dashboard.html", context)


@login_required
def account_preferences(request):
    preference, _ = ReaderPreference.objects.get_or_create(user=request.user)
    form = ReaderPreferenceForm(request.POST or None, instance=preference)
    if request.method == "POST":
        if form.is_valid():
            form.save()
            messages.success(request, "Your followed topics and publication alerts were updated.")
            return redirect("account")
        messages.error(request, "Please review your reading preferences.")
    return render(request, "publications/preferences.html", {"form": form})


@staff_permission_required("publications.view_magazine")
def management_magazines(request):
    magazines = Magazine.objects.select_related("category", "edition", "submitted_by")
    query = request.GET.get("q", "").strip()[:100]
    status = request.GET.get("status", "").strip()
    if query:
        magazines = magazines.filter(Q(title__icontains=query) | Q(slug__icontains=query))
    if status == "published":
        magazines = magazines.filter(is_published=True)
    elif status in Magazine.ReviewStatus.values:
        magazines = magazines.filter(is_published=False, review_status=status)
    else:
        status = ""
    page = Paginator(magazines, 20).get_page(request.GET.get("page"))
    filter_params = request.GET.copy()
    filter_params.pop("page", None)
    return render(
        request,
        "management/magazines.html",
        {
            "page": page,
            "query": query,
            "selected_status": status,
            "statuses": Magazine.ReviewStatus.choices,
            "can_upload": request.user.has_perm("publications.add_magazine"),
            "can_approve": request.user.has_perm("publications.approve_magazine"),
            "can_publish": request.user.has_perm("publications.publish_magazine"),
            "can_change": request.user.has_perm("publications.change_magazine"),
            "filter_query": filter_params.urlencode(),
        },
    )


@staff_permission_required("publications.add_magazine")
def management_magazine_upload(request):
    form = MagazineUploadForm(request.POST or None, request.FILES or None)
    if request.method == "POST" and form.is_valid():
        with transaction.atomic():
            magazine = form.save(commit=False)
            magazine.is_published = False
            if magazine.review_status == Magazine.ReviewStatus.IN_REVIEW:
                magazine.submitted_by = request.user
                magazine.submitted_at = timezone.now()
            magazine.save()
            form.save_m2m()
            if magazine.review_status == Magazine.ReviewStatus.IN_REVIEW:
                audit_management_event(
                    request.user,
                    ManagementAuditEvent.EventType.MAGAZINE_SUBMITTED,
                    magazine,
                    {"review_status": magazine.review_status},
                )
        messages.success(
            request,
            "Edition saved as a draft."
            if magazine.review_status == Magazine.ReviewStatus.DRAFT
            else "Edition submitted. It remains unpublished until reviewed and approved.",
        )
        return redirect("management_magazines")
    return render(request, "management/magazine_upload.html", {"form": form})


@staff_permission_required("publications.change_magazine")
@require_POST
def management_magazine_submit(request, pk):
    magazine = get_object_or_404(Magazine, pk=pk)
    if magazine.is_published or magazine.review_status not in (
        Magazine.ReviewStatus.DRAFT,
        Magazine.ReviewStatus.CHANGES_REQUESTED,
    ):
        messages.error(request, "Only draft editions or editions needing changes can be submitted.")
        return redirect("management_magazines")
    magazine.review_status = Magazine.ReviewStatus.IN_REVIEW
    magazine.submitted_by = request.user
    magazine.submitted_at = timezone.now()
    with transaction.atomic():
        magazine.save(
            update_fields=("review_status", "submitted_by", "submitted_at", "updated_at")
        )
        audit_management_event(
            request.user,
            ManagementAuditEvent.EventType.MAGAZINE_SUBMITTED,
            magazine,
            {"review_status": magazine.review_status},
        )
    messages.success(request, f"{magazine.title} has been submitted for review.")
    return redirect("management_magazines")


@staff_permission_required("publications.approve_magazine")
@require_POST
def management_magazine_review(request, pk, decision):
    decisions = {
        "approve": Magazine.ReviewStatus.APPROVED,
        "request-changes": Magazine.ReviewStatus.CHANGES_REQUESTED,
    }
    if decision not in decisions:
        raise Http404
    status = decisions[decision]
    magazine = get_object_or_404(Magazine, pk=pk)
    if magazine.is_published or magazine.review_status != Magazine.ReviewStatus.IN_REVIEW:
        messages.error(request, "Only editions awaiting review can be reviewed.")
        return redirect("management_magazines")
    magazine.review_status = status
    magazine.reviewed_by = request.user
    magazine.reviewed_at = timezone.now()
    with transaction.atomic():
        magazine.save(update_fields=("review_status", "reviewed_by", "reviewed_at", "updated_at"))
        event_type = (
            ManagementAuditEvent.EventType.MAGAZINE_APPROVED
            if status == Magazine.ReviewStatus.APPROVED
            else ManagementAuditEvent.EventType.MAGAZINE_CHANGES_REQUESTED
        )
        audit_management_event(request.user, event_type, magazine)
    messages.success(request, f"{magazine.title} review status updated.")
    return redirect("management_magazines")


@staff_permission_required("publications.publish_magazine")
@require_POST
def management_magazine_publish(request, pk, action):
    if action not in ("publish", "unpublish", "archive"):
        raise Http404
    magazine = get_object_or_404(Magazine, pk=pk)
    if action == "publish":
        if magazine.review_status != Magazine.ReviewStatus.APPROVED or magazine.is_published:
            messages.error(request, "Only approved, unpublished editions can be published.")
            return redirect("management_magazines")
        if not magazine.has_pdf:
            messages.error(request, "Upload a valid PDF before publishing this edition.")
            return redirect("management_magazines")
        magazine.is_published = True
        magazine.published_by = request.user
        magazine.published_at = timezone.now()
        event_type = ManagementAuditEvent.EventType.MAGAZINE_PUBLISHED
    elif action == "unpublish":
        if not magazine.is_published:
            messages.error(request, "This edition is already unpublished.")
            return redirect("management_magazines")
        magazine.is_published = False
        event_type = ManagementAuditEvent.EventType.MAGAZINE_UNPUBLISHED
    else:
        magazine.is_published = False
        magazine.review_status = Magazine.ReviewStatus.ARCHIVED
        event_type = ManagementAuditEvent.EventType.MAGAZINE_ARCHIVED
    with transaction.atomic():
        magazine.save(
            update_fields=(
                "is_published",
                "review_status",
                "published_by",
                "published_at",
                "updated_at",
            )
        )
        audit_management_event(request.user, event_type, magazine)
    messages.success(request, f"{magazine.title} publication status updated.")
    return redirect("management_magazines")


def magazine_list(request):
    available_magazines = public_magazines(request.user)
    demo_magazine_ids = DemoSeedRecord.objects.filter(
        model_name="publications.magazine"
    ).values_list("object_id", flat=True)
    wall_magazines = list(
        available_magazines.filter(
            pk__in=demo_magazine_ids,
            slug__startswith="demo-showcase-",
        ).order_by("issue_number", "slug")[:8]
    )
    wall_magazine_ids = [magazine.pk for magazine in wall_magazines]
    wall_magazines.extend(
        available_magazines.exclude(pk__in=wall_magazine_ids).order_by(
            "-publication_date", "-created_at"
        )[: max(0, 8 - len(wall_magazines))]
    )
    magazine_wall_rows = [
        {
            "direction": "up" if index % 2 == 0 else "down",
            "top": index * 17,
            "duration": 48 + index * 3,
            "delay": index * 7,
            "shift": -1 if index % 2 == 0 else 1,
        }
        for index in range(6)
    ]
    trending_ids = list(
        ReadingHistory.objects.filter(
            magazine__in=available_magazines,
            last_viewed_at__gte=timezone.now() - timedelta(days=30),
        )
        .values("magazine_id")
        .annotate(reader_count=Count("pk"))
        .order_by("-reader_count", "magazine_id")
        .values_list("magazine_id", flat=True)[:4]
    )
    trend_order = Case(
        *(When(pk=magazine_id, then=Value(index)) for index, magazine_id in enumerate(trending_ids)),
        default=Value(len(trending_ids)),
        output_field=IntegerField(),
    )
    trending_magazines = available_magazines.filter(pk__in=trending_ids).annotate(
        trend_order=trend_order
    ).order_by("trend_order")
    magazines = available_magazines
    category = request.GET.get("category", "").strip()
    edition = request.GET.get("edition", "").strip()
    query = request.GET.get("q", "").strip()[:100]
    year = request.GET.get("year", "").strip()
    sort = request.GET.get("sort", "newest")
    featured = request.GET.get("featured", "").strip()
    language = request.GET.get("language", "").strip()
    language_codes = {code for code, _ in CONTENT_LANGUAGES}
    if language not in language_codes:
        language = ""
    if category:
        magazines = magazines.filter(category__slug=category)
    if edition:
        magazines = magazines.filter(edition__slug=edition)
    if year.isdigit() and 1900 <= int(year) <= 2200:
        magazines = magazines.filter(publication_date__year=int(year))
    else:
        year = ""
    if featured == "1":
        magazines = magazines.filter(is_featured=True)
    else:
        featured = ""
    if language:
        magazines = magazines.filter(language=language)
    if query:
        matching_leaders = public_leaders(request.user).filter(
            Q(name__icontains=query)
            | Q(designation__icontains=query)
            | Q(organization__icontains=query)
        )
        magazines = magazines.filter(
            Q(title__icontains=query)
            | Q(subtitle__icontains=query)
            | Q(description__icontains=query)
            | Q(publisher_name__icontains=query)
            | Q(category__name__icontains=query)
            | Q(edition__name__icontains=query)
            | Q(featured_leaders__in=matching_leaders)
        ).distinct()
    if sort == "relevant" and query:
        magazines = magazines.annotate(
            search_rank=Case(
                When(title__iexact=query, then=Value(0)),
                When(title__icontains=query, then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            )
        ).order_by("search_rank", "-publication_date", "-created_at")
    elif sort == "oldest":
        magazines = magazines.order_by("publication_date", "created_at")
    else:
        sort = "newest"
        magazines = magazines.order_by("-publication_date", "-created_at")
    page = Paginator(magazines, 12).get_page(request.GET.get("page"))
    filter_params = request.GET.copy()
    filter_params.pop("page", None)
    show_magazine_wall = not filter_params
    return render(
        request,
        "publications/magazine_list.html",
        {
            "page": page,
            "categories": Category.objects.all(),
            "editions": Edition.objects.all(),
            "years": available_magazines.dates("publication_date", "year", order="DESC"),
            "selected_category": category,
            "selected_edition": edition,
            "selected_year": year,
            "selected_featured": featured,
            "selected_language": language,
            "languages": CONTENT_LANGUAGES,
            "query": query,
            "sort": sort,
            "filter_query": filter_params.urlencode(),
            "trending_magazines": trending_magazines,
            "wall_magazines": wall_magazines,
            "magazine_wall_rows": magazine_wall_rows,
            "show_magazine_wall": show_magazine_wall,
        },
    )


def public_leaders(user=None):
    leaders = FeaturedLeader.objects.filter(
        is_published=True,
        publication_date__lte=timezone.localdate(),
    ).select_related("category", "article", "magazine", "magazine__edition")
    leaders = leaders.filter(Q(article__isnull=False) | Q(magazine__isnull=False))
    leaders = leaders.filter(
        Q(article__isnull=True)
        | Q(article__status=Article.Status.PUBLISHED, article__published_at__lte=timezone.now())
    ).filter(
        Q(magazine__isnull=True)
        | Q(magazine__is_published=True, magazine__publication_date__lte=timezone.localdate())
    )
    if not has_member_access(user):
        leaders = leaders.filter(
            Q(article__isnull=True) | Q(article__member_only=False)
        ).filter(Q(magazine__isnull=True) | Q(magazine__access=Magazine.Access.PUBLIC))
    return leaders


def leader_list(request):
    leaders = public_leaders(request.user)
    year = request.GET.get("year", "").strip()
    category = request.GET.get("category", "").strip()
    edition = request.GET.get("edition", "").strip()
    query = request.GET.get("q", "").strip()[:100]
    featured = request.GET.get("featured", "").strip()
    if year.isdigit() and 1900 <= int(year) <= 2200:
        leaders = leaders.filter(publication_date__year=int(year))
    else:
        year = ""
    if category:
        leaders = leaders.filter(category__slug=category)
    if edition:
        leaders = leaders.filter(magazine__edition__slug=edition)
    if featured == "1":
        leaders = leaders.filter(is_featured=True)
    else:
        featured = ""
    if query:
        leaders = leaders.filter(
            Q(name__icontains=query)
            | Q(designation__icontains=query)
            | Q(organization__icontains=query)
            | Q(article__title__icontains=query)
            | Q(magazine__title__icontains=query)
        )
    page = Paginator(leaders, 12).get_page(request.GET.get("page"))
    filter_params = request.GET.copy()
    filter_params.pop("page", None)
    return render(
        request,
        "publications/leader_list.html",
        {
            "page": page,
            "categories": Category.objects.all(),
            "editions": Edition.objects.all(),
            "years": public_leaders().dates("publication_date", "year", order="DESC"),
            "selected_year": year,
            "selected_category": category,
            "selected_edition": edition,
            "selected_featured": featured,
            "query": query,
            "filter_query": filter_params.urlencode(),
        },
    )


def leader_detail(request, slug):
    leader = get_object_or_404(public_leaders(request.user), slug=slug)
    related_leaders = public_leaders(request.user).exclude(pk=leader.pk)
    if leader.category:
        related_leaders = related_leaders.filter(category=leader.category)
    return render(
        request,
        "publications/leader_detail.html",
        {"leader": leader, "related_leaders": related_leaders[:3]},
    )


def magazine_detail(request, slug):
    magazine = get_object_or_404(public_magazines(request.user, include_members=True), slug=slug)
    if magazine.access == Magazine.Access.MEMBERS and not has_member_access(request.user):
        raise PermissionDenied("This edition is available to members.")
    if request.user.is_authenticated:
        record_magazine_history(request.user, magazine)
    saved = request.user.is_authenticated and SavedContent.objects.filter(
        user=request.user,
        magazine=magazine,
    ).exists()
    related_articles = magazine.related_articles.filter(pk__in=published_articles(request.user))[:4]
    if not related_articles.exists() and magazine.category_id:
        related_articles = published_articles(request.user).filter(category=magazine.category)[:4]
    related_magazines = magazine.related_magazines.filter(
        pk__in=public_magazines(request.user)
    ).exclude(pk=magazine.pk)[:4]
    if not related_magazines.exists() and magazine.category_id:
        related_magazines = public_magazines(request.user).filter(
            category=magazine.category
        ).exclude(pk=magazine.pk)[:4]
    featured_leaders = public_leaders(request.user).filter(magazine=magazine)[:4]
    translations = public_magazines(request.user).filter(
        Q(translated_from=magazine)
        | Q(pk=magazine.translated_from_id if magazine.translated_from_id else None)
    ).exclude(pk=magazine.pk)
    return render(
        request,
        "publications/magazine_detail.html",
        {
            "magazine": magazine,
            "is_saved": saved,
            "related_articles": related_articles,
            "related_magazines": related_magazines,
            "featured_leaders": featured_leaders,
            "translations": translations,
        },
    )


def magazine_reader(request, slug):
    magazine = get_object_or_404(public_magazines(request.user, include_members=True), slug=slug)
    if magazine.access == Magazine.Access.MEMBERS and not has_member_access(request.user):
        raise PermissionDenied("This edition is available to members.")
    if not magazine.has_pdf:
        raise Http404("This edition does not have a PDF file.")
    last_page = 1
    if request.user.is_authenticated:
        history = record_magazine_history(request.user, magazine)
        last_page = history.last_page
    related_articles = magazine.related_articles.filter(pk__in=published_articles(request.user))[:4]
    if not related_articles.exists() and magazine.category_id:
        related_articles = published_articles(request.user).filter(category=magazine.category)[:4]
    related_magazines = magazine.related_magazines.filter(
        pk__in=public_magazines(request.user)
    ).exclude(pk=magazine.pk)[:4]
    if not related_magazines.exists() and magazine.category_id:
        related_magazines = public_magazines(request.user).filter(
            category=magazine.category
        ).exclude(pk=magazine.pk)[:4]
    return render(
        request,
        "publications/magazine_reader.html",
        {
            "magazine": magazine,
            "pdf_url": reverse("magazine_pdf", kwargs={"slug": magazine.slug}),
            "progress_url": (
                reverse("save_reader_progress", kwargs={"slug": magazine.slug})
                if request.user.is_authenticated
                else ""
            ),
            "last_page": last_page,
            "related_articles": related_articles,
            "related_magazines": related_magazines,
        },
    )


@login_required
@require_POST
def save_reader_progress(request, slug):
    magazine = get_object_or_404(
        public_magazines(request.user, include_members=True),
        slug=slug,
    )
    if magazine.access == Magazine.Access.MEMBERS and not has_member_access(request.user):
        raise PermissionDenied("This edition is available to members.")
    if not magazine.has_pdf:
        raise Http404("This edition does not have a PDF file.")
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "A JSON request body is required."}, status=400)
    page = payload.get("page") if isinstance(payload, dict) else None
    if type(page) is not int or not 1 <= page <= 100000:
        return JsonResponse({"error": "Page must be a positive integer."}, status=400)

    record_magazine_history(request.user, magazine, last_page=page)
    return JsonResponse({"saved": True, "page": page})


@require_safe
def magazine_pdf(request, slug):
    magazine = get_object_or_404(public_magazines(request.user, include_members=True), slug=slug)
    if magazine.access == Magazine.Access.MEMBERS and not has_member_access(request.user):
        raise PermissionDenied("This edition is available to members.")
    if not magazine.has_pdf:
        raise Http404("This edition does not have a PDF file.")
    download = request.GET.get("download") == "1"
    if download and not magazine.allow_download:
        raise PermissionDenied("Downloads are disabled for this edition.")
    response = FileResponse(
        magazine.pdf_file.open("rb"),
        content_type="application/pdf",
        as_attachment=download,
        filename=f"{magazine.slug}.pdf",
    )
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "private, no-store"
    return response


@require_POST
def advertisement_impression(request, pk):
    advertisement = get_object_or_404(eligible_advertisements(), pk=pk)
    if advertisement.track_impressions:
        AdvertisementEvent.objects.create(
            advertisement=advertisement,
            event_type=AdvertisementEvent.EventType.IMPRESSION,
            placement=advertisement.placement,
        )
    return HttpResponse(status=204)


@require_safe
def advertisement_click(request, pk):
    advertisement = get_object_or_404(eligible_advertisements(), pk=pk)
    try:
        destination = urlsplit(advertisement.destination_url)
    except ValueError as error:
        raise Http404("This advertisement destination is unavailable.") from error
    if (
        destination.scheme not in {"http", "https"}
        or not destination.hostname
        or destination.username
        or destination.password
    ):
        raise Http404("This advertisement destination is unavailable.")
    if request.method == "GET" and advertisement.track_clicks:
        AdvertisementEvent.objects.create(
            advertisement=advertisement,
            event_type=AdvertisementEvent.EventType.CLICK,
            placement=advertisement.placement,
        )
    return redirect(advertisement.destination_url)


@login_required
def advertising_report(request):
    if not request.user.is_staff or not request.user.has_perm("publications.view_advertisement"):
        raise PermissionDenied
    campaigns = Advertisement.objects.annotate(
        impressions=Count(
            "events",
            filter=Q(events__event_type=AdvertisementEvent.EventType.IMPRESSION),
        ),
        clicks=Count(
            "events",
            filter=Q(events__event_type=AdvertisementEvent.EventType.CLICK),
        ),
    ).order_by("placement", "-display_priority", "title")
    report_rows = [
        {
            "advertisement": campaign,
            "impressions": campaign.impressions,
            "clicks": campaign.clicks,
            "click_through_rate": (
                round(campaign.clicks * 100 / campaign.impressions, 2)
                if campaign.impressions
                else None
            ),
        }
        for campaign in campaigns
    ]
    return render(
        request,
        "admin/publications/advertising_report.html",
        {"report_rows": report_rows},
    )


def has_member_access(user):
    return user is not None and user.is_authenticated and (
        user.is_staff or user.groups.filter(name="Subscribers").exists()
    )


def article_list(request):
    articles = published_articles(request.user)
    category = request.GET.get("category", "").strip()
    language = request.GET.get("language", "").strip()
    language_codes = {code for code, _ in CONTENT_LANGUAGES}
    if language not in language_codes:
        language = ""
    if category:
        articles = articles.filter(category__slug=category)
    if language:
        articles = articles.filter(language=language)
    page = Paginator(articles, 12).get_page(request.GET.get("page"))
    filter_params = request.GET.copy()
    filter_params.pop("page", None)
    return render(
        request,
        "publications/article_list.html",
        {
            "page": page,
            "categories": Category.objects.all(),
            "selected_category": category,
            "selected_language": language,
            "languages": CONTENT_LANGUAGES,
            "filter_query": filter_params.urlencode(),
        },
    )


def article_detail(request, slug):
    article = get_object_or_404(published_articles(request.user), slug=slug)
    if article.member_only and not has_member_access(request.user):
        raise PermissionDenied("This article is available to members.")
    if request.user.is_authenticated:
        ReadingHistory.objects.update_or_create(
            user=request.user,
            article=article,
            defaults={"last_viewed_at": timezone.now()},
        )
    related = published_articles(request.user).filter(category=article.category).exclude(pk=article.pk)[:3]
    translations = published_articles(request.user).filter(
        Q(translated_from=article)
        | Q(pk=article.translated_from_id if article.translated_from_id else None)
    ).exclude(pk=article.pk)
    saved = request.user.is_authenticated and SavedContent.objects.filter(
        user=request.user,
        article=article,
    ).exists()
    return render(
        request,
        "publications/article_detail.html",
        {"article": article, "related": related, "translations": translations, "is_saved": saved},
    )


def search(request):
    query = request.GET.get("q", "").strip()[:100]
    category = request.GET.get("category", "").strip()
    language = request.GET.get("language", "").strip()
    year = request.GET.get("year", "").strip()
    sort = request.GET.get("sort", "newest").strip()
    language_codes = {code for code, _ in CONTENT_LANGUAGES}
    if language not in language_codes:
        language = ""
    if not year.isdigit() or not 1900 <= int(year) <= 2200:
        year = ""
    if sort not in {"newest", "popular"}:
        sort = "newest"
    articles = published_articles(request.user)
    magazines = public_magazines(request.user)
    leaders = public_leaders(request.user)
    if query:
        articles = articles.filter(
            Q(title__icontains=query)
            | Q(excerpt__icontains=query)
            | Q(body__icontains=query)
            | Q(category__name__icontains=query)
            | Q(author__name__icontains=query)
        )
        matching_leaders = leaders.filter(
            Q(name__icontains=query)
            | Q(designation__icontains=query)
            | Q(organization__icontains=query)
            | Q(article__title__icontains=query)
            | Q(magazine__title__icontains=query)
            | Q(magazine__publisher_name__icontains=query)
        )
        magazines = magazines.filter(
            Q(title__icontains=query)
            | Q(subtitle__icontains=query)
            | Q(description__icontains=query)
            | Q(category__name__icontains=query)
            | Q(edition__name__icontains=query)
            | Q(publisher_name__icontains=query)
            | Q(related_articles__author__name__icontains=query)
            | Q(featured_leaders__in=matching_leaders)
        ).distinct()
        leaders = matching_leaders
    if category:
        articles = articles.filter(category__slug=category)
        magazines = magazines.filter(category__slug=category)
        leaders = leaders.filter(category__slug=category)
    if language:
        articles = articles.filter(language=language)
        magazines = magazines.filter(language=language)
        leaders = leaders.filter(
            Q(article__isnull=False, article__language=language)
            | Q(magazine__isnull=False, magazine__language=language)
        )
    if year:
        articles = articles.filter(published_at__year=int(year))
        magazines = magazines.filter(publication_date__year=int(year))
        leaders = leaders.filter(publication_date__year=int(year))
    if sort == "popular":
        cutoff = timezone.now() - timedelta(days=30)
        articles = articles.annotate(
            recent_reads=Count(
                "reader_history",
                filter=Q(reader_history__last_viewed_at__gte=cutoff),
            )
        ).order_by("-recent_reads", "-published_at", "-pk")
        magazines = magazines.annotate(
            recent_reads=Count(
                "reader_history",
                filter=Q(reader_history__last_viewed_at__gte=cutoff),
            )
        ).order_by("-recent_reads", "-publication_date", "-pk")
    else:
        articles = articles.order_by("-published_at", "-created_at")
        magazines = magazines.order_by("-publication_date", "-created_at")
        leaders = leaders.order_by("-publication_date", "display_order")
    if not query:
        articles = articles.none()
        magazines = magazines.none()
        leaders = leaders.none()
    article_page = Paginator(articles, 8).get_page(request.GET.get("article_page"))
    magazine_page = Paginator(magazines, 8).get_page(request.GET.get("magazine_page"))
    leader_page = Paginator(leaders, 8).get_page(request.GET.get("leader_page"))
    filter_params = request.GET.copy()
    filter_params.pop("article_page", None)
    filter_params.pop("magazine_page", None)
    filter_params.pop("leader_page", None)
    return render(
        request,
        "publications/search.html",
        {
            "query": query,
            "articles": article_page.object_list,
            "magazines": magazine_page.object_list,
            "leaders": leader_page.object_list,
            "article_page": article_page,
            "magazine_page": magazine_page,
            "leader_page": leader_page,
            "categories": Category.objects.all(),
            "languages": CONTENT_LANGUAGES,
            "selected_category": category,
            "selected_language": language,
            "selected_year": year,
            "sort": sort,
            "filter_query": filter_params.urlencode(),
        },
    )


def newsletter_signup(request):
    if request.method != "POST":
        return redirect("home")
    form = NewsletterSignupForm(request.POST)
    if form.is_valid():
        subscriber = form.save()
        request.session["newsletter_unsubscribe_token"] = str(subscriber.unsubscribe_token)
        messages.success(request, "Your newsletter subscription preferences have been saved.")
    else:
        for error in form.errors.values():
            messages.error(request, error[0])
    return redirect("home")


def newsletter_unsubscribe(request, token):
    subscriber = get_object_or_404(NewsletterSubscriber, unsubscribe_token=token, is_active=True)
    if request.method != "POST":
        return render(request, "publications/unsubscribe.html", {"subscriber": subscriber})
    subscriber.unsubscribe()
    request.session.pop("newsletter_unsubscribe_token", None)
    messages.success(request, "Your email has been unsubscribed.")
    return redirect("home")


@login_required
def account(request):
    preference, _ = ReaderPreference.objects.get_or_create(user=request.user)
    articles = published_articles(request.user)
    magazines = public_magazines(request.user)
    return render(
        request,
        "publications/account.html",
        {
            "saved_articles": SavedContent.objects.filter(
                user=request.user,
                article__in=articles,
            ).select_related("article", "article__category"),
            "saved_magazines": SavedContent.objects.filter(
                user=request.user,
                magazine__in=magazines,
            ).select_related("magazine", "magazine__edition"),
            "recent_articles": ReadingHistory.objects.filter(
                user=request.user,
                article__in=articles,
            ).select_related("article", "article__category")[:8],
            "recent_magazines": ReadingHistory.objects.filter(
                user=request.user,
                magazine__in=magazines,
            ).select_related("magazine", "magazine__edition")[:8],
            "profile_form": ReaderProfileForm(instance=request.user),
            "preference_form": ReaderPreferenceForm(instance=preference),
            "client_enquiries": ClientEnquiry.objects.filter(
                submitted_by=request.user
            ).only("pk", "reference", "subject", "status", "submitted_at")[:10],
            "unread_notifications": UserNotification.objects.filter(
                recipient=request.user, read_at__isnull=True
            ).count(),
        },
    )


@login_required
@require_POST
def account_profile(request):
    form = ReaderProfileForm(request.POST, instance=request.user)
    if form.is_valid():
        form.save()
        messages.success(request, "Your profile details were updated.")
    else:
        for field, errors in form.errors.items():
            messages.error(request, f"{field}: {errors[0]}")
    return redirect("account")


@login_required
@require_POST
def account_password_change(request):
    form = PasswordChangeForm(request.user, request.POST)
    if form.is_valid():
        user = form.save()
        update_session_auth_hash(request, user)
        messages.success(request, "Your password was changed.")
    else:
        for errors in form.errors.values():
            messages.error(request, errors[0])
    return redirect("account")


@login_required
@require_POST
def save_article(request, slug):
    article = get_object_or_404(published_articles(request.user), slug=slug)
    SavedContent.objects.get_or_create(user=request.user, article=article)
    messages.success(request, "Story saved to your reading list.")
    return redirect(article.get_absolute_url())


@login_required
@require_POST
def unsave_article(request, slug):
    article = get_object_or_404(published_articles(request.user), slug=slug)
    SavedContent.objects.filter(user=request.user, article=article).delete()
    messages.success(request, "Story removed from your reading list.")
    return redirect(article.get_absolute_url())


@login_required
@require_POST
def save_magazine(request, slug):
    magazine = get_object_or_404(public_magazines(request.user), slug=slug)
    SavedContent.objects.get_or_create(user=request.user, magazine=magazine)
    messages.success(request, "Edition saved to your reading list.")
    return redirect(magazine.get_absolute_url())


@login_required
@require_POST
def unsave_magazine(request, slug):
    magazine = get_object_or_404(public_magazines(request.user), slug=slug)
    SavedContent.objects.filter(user=request.user, magazine=magazine).delete()
    messages.success(request, "Edition removed from your reading list.")
    return redirect(magazine.get_absolute_url())
