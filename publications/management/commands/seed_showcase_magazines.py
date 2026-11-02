from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from publications.models import Category, DemoSeedRecord, Magazine


SHOWCASE_ISSUES = (
    {
        "slug": "demo-showcase-influential-leaders-2026",
        "title": "Most Powerful and Influential Leaders to Watch in 2026",
        "category_slug": "leadership",
        "issue_number": "DEMO-01",
        "cover": "leaders.png",
        "description": "A fictional sample edition exploring leadership, responsibility, and the decisions that shape organizations. No real people, interviews, or endorsements are represented.",
    },
    {
        "slug": "demo-showcase-visionary-ceos-2026",
        "title": "The Most Visionary CEOs to Watch in 2026",
        "category_slug": "business",
        "issue_number": "DEMO-02",
        "cover": "visionary-ceos.png",
        "description": "A fictional sample edition about long-term thinking, innovation, and thoughtful business leadership. It contains no real executive profiles or reported claims.",
    },
    {
        "slug": "demo-showcase-social-impact-entrepreneurs-2026",
        "title": "The Most Influential Entrepreneurs Shaping the Future of Social Impact in 2026",
        "category_slug": "entrepreneurship",
        "issue_number": "DEMO-03",
        "cover": "social-impact.png",
        "description": "A fictional sample edition considering enterprise and social impact through original illustrative design. No real founders, organizations, or endorsements are depicted.",
    },
    {
        "slug": "demo-showcase-global-cfos-2026",
        "title": "Global CFOs Redefining Financial Leadership in 2026",
        "category_slug": "finance",
        "issue_number": "DEMO-04",
        "cover": "global-cfos.png",
        "description": "A fictional sample edition about financial leadership, governance, and responsible decision-making. It contains no real CFO profiles or financial advice.",
    },
    {
        "slug": "demo-showcase-ai-innovators-2026",
        "title": "The AI Innovators Transforming Global Business in 2026",
        "category_slug": "technology",
        "issue_number": "DEMO-05",
        "cover": "ai-innovators.png",
        "description": "A fictional sample edition using original geometric artwork to explore technology and business. It makes no claims about real people, products, or organizations.",
    },
    {
        "slug": "demo-showcase-visionary-women-2026",
        "title": "Visionary Women Leading the Next Era of Business in 2026",
        "category_slug": "leadership",
        "issue_number": "DEMO-06",
        "cover": "visionary-women.png",
        "description": "A fictional sample edition celebrating questions of inclusion and leadership through original illustrative cover art. No real people, interviews, or endorsements are represented.",
    },
)

ASSET_DIRECTORY = Path(settings.BASE_DIR) / "static" / "publications" / "global-icon-covers"


class Command(BaseCommand):
    help = "Create six clearly identified Global Icon showcase issues for development previews."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                "Showcase magazines can only be created while DJANGO_DEBUG=True."
            )

        with transaction.atomic():
            for index, issue_data in enumerate(SHOWCASE_ISSUES):
                self.create_showcase_issue(issue_data, index)

        self.stdout.write(
            self.style.SUCCESS(
                f"Ready: {len(SHOWCASE_ISSUES)} original Global Icon showcase demo issues."
            )
        )

    def create_showcase_issue(self, issue_data, index):
        marker_query = DemoSeedRecord.objects.filter(
            model_name="publications.magazine"
        )
        magazine = Magazine.objects.filter(slug=issue_data["slug"]).first()
        if magazine and not marker_query.filter(object_id=magazine.pk).exists():
            raise CommandError(
                f"Reserved showcase slug {issue_data['slug']} is already in use; "
                "refusing to modify that magazine."
            )

        created = magazine is None
        if created:
            category = Category.objects.filter(
                slug=issue_data["category_slug"]
            ).first()
            today = timezone.localdate()
            published_at = timezone.now() - timedelta(days=index)
            magazine = Magazine.objects.create(
                slug=issue_data["slug"],
                title=issue_data["title"],
                subtitle="DEMO / SAMPLE EDITION · THE GLOBAL ICON 2026",
                description=issue_data["description"],
                issue_number=issue_data["issue_number"],
                category=category,
                access=Magazine.Access.PUBLIC,
                review_status=Magazine.ReviewStatus.APPROVED,
                is_published=True,
                is_featured=index == 0,
                publication_date=today - timedelta(days=index),
                published_at=published_at,
                publisher_name="THE GLOBAL ICON · Demonstration desk",
                meta_description=f"DEMO / SAMPLE EDITION — {issue_data['title']}",
                cover_alt_text=f"Original illustrated demo cover: {issue_data['title']}",
            )
            DemoSeedRecord.objects.create(
                model_name="publications.magazine",
                object_id=magazine.pk,
            )

        if not magazine.cover:
            asset_path = ASSET_DIRECTORY / issue_data["cover"]
            if not asset_path.is_file():
                raise CommandError(
                    f"Required local cover asset is missing: {asset_path}"
                )
            magazine.cover.save(
                f"global-icon-{issue_data['slug']}.png",
                ContentFile(asset_path.read_bytes()),
                save=False,
            )
            magazine.save(update_fields=("cover", "updated_at"))
        return magazine
