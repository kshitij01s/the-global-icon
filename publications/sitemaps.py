from django.contrib.sitemaps import Sitemap
from django.db.models import Q
from django.utils import timezone

from .models import Article, FeaturedLeader, Magazine


class ArticleSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return Article.objects.filter(
            status=Article.Status.PUBLISHED,
            member_only=False,
            published_at__isnull=False,
            published_at__lte=timezone.now(),
        )

    def lastmod(self, item):
        return item.updated_at


class MagazineSitemap(Sitemap):
    changefreq = "monthly"
    priority = 0.7

    def items(self):
        return Magazine.objects.filter(
            is_published=True,
            access=Magazine.Access.PUBLIC,
            publication_date__lte=timezone.localdate(),
        )

    def lastmod(self, item):
        return item.updated_at


class LeaderSitemap(Sitemap):
    changefreq = "monthly"
    priority = 0.5

    def items(self):
        return FeaturedLeader.objects.filter(
            is_published=True,
            publication_date__lte=timezone.localdate(),
        ).filter(Q(article__isnull=False) | Q(magazine__isnull=False)).filter(
            Q(article__isnull=True) | Q(
                article__status=Article.Status.PUBLISHED,
                article__member_only=False,
                article__published_at__lte=timezone.now(),
            )
        ).filter(
            Q(magazine__isnull=True) | Q(
                magazine__is_published=True,
                magazine__access=Magazine.Access.PUBLIC,
                magazine__publication_date__lte=timezone.localdate(),
            )
        )

    def lastmod(self, item):
        return item.updated_at
