from django.db.models import Q
from django.utils import timezone

from .models import Announcement, Category, SiteConfiguration


def site_configuration(request):
    now = timezone.now()
    unread_notifications = 0
    if request.user.is_authenticated:
        unread_notifications = request.user.notifications.filter(read_at__isnull=True).count()
    return {
        "config": SiteConfiguration.load(),
        "newsletter_unsubscribe_token": request.session.get("newsletter_unsubscribe_token"),
        "unread_notifications": unread_notifications,
        "header_categories": Category.objects.order_by("name")[:7],
        "announcement": Announcement.objects.filter(is_active=True)
        .filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))
        .first(),
    }
