from django.db.models import Q
from django.utils import timezone

from .models import Advertisement


def eligible_advertisements(placement=None):
    now = timezone.now()
    advertisements = Advertisement.objects.filter(is_active=True)
    if placement is not None:
        advertisements = advertisements.filter(placement=placement)
    return advertisements.filter(
        Q(starts_at__isnull=True) | Q(starts_at__lte=now)
    ).filter(
        Q(ends_at__isnull=True) | Q(ends_at__gt=now)
    )
