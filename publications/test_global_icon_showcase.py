from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.utils import timezone

from .management.commands.seed_showcase_magazines import SHOWCASE_ISSUES
from .models import Article, DemoSeedRecord, Magazine


@override_settings(DEBUG=True)
class GlobalIconShowcaseTests(TestCase):
    def seed_showcase(self):
        call_command("seed_showcase_magazines", verbosity=0)

    def test_seed_creates_six_original_published_issues_and_is_rerunnable(self):
        with TemporaryDirectory() as media_root:
            with self.settings(MEDIA_ROOT=media_root):
                self.seed_showcase()

                magazines = Magazine.objects.filter(
                    slug__startswith="demo-showcase-"
                ).order_by("slug")
                self.assertEqual(magazines.count(), 6)
                cover_contents = []
                for magazine in magazines:
                    self.assertTrue(magazine.is_published)
                    self.assertEqual(magazine.review_status, Magazine.ReviewStatus.APPROVED)
                    self.assertTrue(magazine.description.startswith("A fictional sample edition"))
                    self.assertTrue(magazine.cover_alt_text.startswith("Original illustrated demo cover:"))
                    self.assertTrue(magazine.cover)
                    self.assertTrue(Path(magazine.cover.path).is_file())
                    self.assertTrue(Path(magazine.cover.name).name.startswith("global-icon-"))
                    cover_contents.append(Path(magazine.cover.path).read_bytes())
                    self.assertTrue(
                        DemoSeedRecord.objects.filter(
                            model_name="publications.magazine",
                            object_id=magazine.pk,
                        ).exists()
                    )
                self.assertEqual(len(set(cover_contents)), 6)

                edited_issue = magazines.first()
                edited_issue.title = "An editor's local title"
                edited_issue.save(update_fields=("title",))
                self.seed_showcase()

                self.assertEqual(
                    Magazine.objects.filter(slug__startswith="demo-showcase-").count(),
                    6,
                )
                edited_issue.refresh_from_db()
                self.assertEqual(edited_issue.title, "An editor's local title")

    def test_seeder_refuses_to_adopt_or_overwrite_a_reserved_slug(self):
        existing = Magazine.objects.create(
            slug=SHOWCASE_ISSUES[0]["slug"],
            title="An existing editorial issue",
            is_published=True,
        )

        with TemporaryDirectory() as media_root:
            with self.settings(MEDIA_ROOT=media_root):
                with self.assertRaisesMessage(CommandError, "refusing to modify that magazine"):
                    self.seed_showcase()

        existing.refresh_from_db()
        self.assertEqual(existing.title, "An existing editorial issue")
        self.assertEqual(
            Magazine.objects.filter(slug__startswith="demo-showcase-").count(),
            1,
        )
        self.assertFalse(
            DemoSeedRecord.objects.filter(
                model_name="publications.magazine",
                object_id=existing.pk,
            ).exists()
        )

    def test_homepage_ticker_uses_only_published_articles_and_is_omitted_when_empty(self):
        empty_response = self.client.get("/")
        self.assertEqual(empty_response.status_code, 200)
        self.assertNotContains(empty_response, 'aria-label="Latest news"')

        Article.objects.create(
            title="Published ticker story",
            slug="published-ticker-story",
            body="Published reporting.",
            status=Article.Status.PUBLISHED,
            published_at=timezone.now(),
        )
        Article.objects.create(
            title="Private draft story",
            slug="private-draft-story",
            body="Unpublished copy.",
            status=Article.Status.DRAFT,
        )

        response = self.client.get("/")
        self.assertContains(response, 'aria-label="Latest news"')
        self.assertContains(response, "Published ticker story")
        self.assertNotContains(response, "Private draft story")
        self.assertEqual(
            list(response.context["ticker_articles"].values_list("title", flat=True)),
            ["Published ticker story"],
        )

    def test_showcase_issues_render_on_archive_and_detail_pages_not_home_wall(self):
        with TemporaryDirectory() as media_root:
            with self.settings(MEDIA_ROOT=media_root):
                self.seed_showcase()

                home_response = self.client.get("/")
                archive_response = self.client.get("/magazines/")
                self.assertEqual(home_response.status_code, 200)
                self.assertEqual(archive_response.status_code, 200)
                self.assertNotContains(home_response, 'id="magazine-wall"')
                self.assertContains(archive_response, 'id="magazine-wall"')
                self.assertContains(archive_response, 'data-direction="up"')
                self.assertContains(archive_response, 'data-direction="down"')
                self.assertContains(archive_response, "Demonstration edition")
                self.assertEqual(
                    [magazine.slug for magazine in archive_response.context["wall_magazines"][:6]],
                    [issue["slug"] for issue in SHOWCASE_ISSUES],
                )

                for issue in SHOWCASE_ISSUES:
                    magazine = Magazine.objects.get(slug=issue["slug"])
                    self.assertFalse(magazine.has_pdf)
                    self.assertContains(archive_response, issue["title"])
                    self.assertEqual(
                        self.client.get(magazine.get_absolute_url()).status_code,
                        200,
                    )

    def test_global_icon_brand_and_existing_discovery_routes_render(self):
        home_response = self.client.get("/")
        archive_response = self.client.get("/magazines/")
        search_response = self.client.get("/search/")
        login_response = self.client.get("/accounts/login/")
        feed_response = self.client.get("/feed.xml")

        for response in (home_response, archive_response, search_response, login_response):
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, "THE GLOBAL ICON")
            self.assertContains(response, "global-icon-logo-light.svg")
        self.assertContains(home_response, "Stories That Shape Tomorrow.")
        self.assertContains(home_response, "Editions")
        self.assertContains(home_response, "Stories")
        self.assertContains(home_response, "Leaders")
        self.assertContains(home_response, "Discover")
        self.assertContains(home_response, "Contact")
        self.assertEqual(feed_response.status_code, 200)
        self.assertContains(feed_response, "THE GLOBAL ICON")

    def test_primary_navigation_has_all_required_links_in_order(self):
        response = self.client.get("/")
        navigation = response.content.decode().split(
            '<nav id="main-nav"', maxsplit=1
        )[1].split("</nav>", maxsplit=1)[0]
        labels = (
            "Home",
            "Editions",
            "Magazines",
            "Stories",
            "Leaders",
            "Discover",
            "Contact",
            "Search",
            "RSS",
            "Sign in",
        )
        positions = [navigation.index(label) for label in labels]
        self.assertEqual(positions, sorted(positions))
        self.assertIn('href="/magazines/#edition-filters"', navigation)
        self.assertIn('href="/magazines/#magazine-wall"', navigation)

    def test_homepage_feature_cards_link_to_existing_sections(self):
        response = self.client.get("/")
        content = response.content.decode()
        self.assertEqual(content.count('class="global-icon-feature-card"'), 5)
        self.assertIn('href="/magazines/#edition-filters"', content)
        self.assertIn('href="/articles/"', content)
        self.assertIn('href="/leaders/"', content)
        self.assertIn('href="/search/"', content)
        self.assertIn('href="/contact/"', content)

    @override_settings(DEBUG=False)
    def test_seeder_is_disabled_outside_development(self):
        with self.assertRaisesMessage(CommandError, "only be created while DJANGO_DEBUG=True"):
            call_command("seed_showcase_magazines", verbosity=0)
