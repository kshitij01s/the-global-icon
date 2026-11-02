from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.urls import reverse
from django.utils import timezone

from .models import Article, Magazine, ReaderPreference, UserNotification


def _capture_previous_publication_state(sender, instance, field_name):
    if not instance.pk:
        setattr(instance, "_previous_publication_state", None)
        return
    setattr(
        instance,
        "_previous_publication_state",
        sender.objects.filter(pk=instance.pk).values_list(field_name, flat=True).first(),
    )


@receiver(pre_save, sender=Article)
def capture_article_publication_state(sender, instance, **kwargs):
    _capture_previous_publication_state(sender, instance, "status")


@receiver(pre_save, sender=Magazine)
def capture_magazine_publication_state(sender, instance, **kwargs):
    _capture_previous_publication_state(sender, instance, "is_published")


def _notify_followers(content, target_url, dedupe_key):
    if not content.category_id:
        return
    preferences = (
        ReaderPreference.objects.filter(
            notify_followed_publications=True,
            preferred_categories=content.category_id,
            user__is_active=True,
        )
        .select_related("user")
        .distinct()
    )
    for preference in preferences:
        user = preference.user
        requires_membership = getattr(content, "member_only", False) or (
            isinstance(content, Magazine) and content.access == Magazine.Access.MEMBERS
        )
        if requires_membership and not (
            user.is_staff or user.groups.filter(name="Subscribers").exists()
        ):
            continue
        UserNotification.objects.get_or_create(
            recipient=user,
            dedupe_key=dedupe_key,
            defaults={
                "notification_type": UserNotification.NotificationType.NEW_PUBLICATION,
                "title": f"New {content._meta.verbose_name}",
                "message": content.title,
                "target_url": target_url,
            },
        )


@receiver(post_save, sender=Article)
def notify_readers_of_published_article(sender, instance, created, raw, **kwargs):
    if raw or instance.status != Article.Status.PUBLISHED:
        return
    previous_status = getattr(instance, "_previous_publication_state", None)
    if not created and previous_status == Article.Status.PUBLISHED:
        return
    if instance.published_at and instance.published_at > timezone.now():
        return
    transaction.on_commit(
        lambda: _notify_followers(
            instance,
            instance.get_absolute_url(),
            f"article:{instance.pk}",
        )
    )


@receiver(post_save, sender=Magazine)
def notify_readers_of_published_magazine(sender, instance, created, raw, **kwargs):
    if raw or not instance.is_published:
        return
    previous_state = getattr(instance, "_previous_publication_state", None)
    if not created and previous_state:
        return
    if instance.publication_date > timezone.localdate():
        return
    transaction.on_commit(
        lambda: _notify_followers(
            instance,
            instance.get_absolute_url(),
            f"magazine:{instance.pk}",
        )
    )
