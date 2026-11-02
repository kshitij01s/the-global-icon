from django.core.management.base import BaseCommand
from django.utils import timezone

from publications.models import Article


class Command(BaseCommand):
    help = "Publish editorially approved articles whose scheduled time has arrived."

    def handle(self, *args, **options):
        due_articles = Article.objects.filter(
            status=Article.Status.SCHEDULED,
            published_at__lte=timezone.now(),
        )
        count = 0
        for article in due_articles.iterator():
            article.status = Article.Status.PUBLISHED
            article.save(update_fields=["status", "updated_at"])
            count += 1
        self.stdout.write(f"Published {count} scheduled article(s).")
