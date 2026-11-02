from django.test import TestCase
from django.utils import timezone

from .models import Article, Category, Magazine


class MagazineShowcaseTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Leadership", slug="leadership")
        self.magazine = Magazine.objects.create(
            title="A New Era of Leadership",
            slug="new-era-leadership",
            subtitle="Ideas shaping business",
            description="Profiles and perspectives from across the industry.",
            issue_number="12",
            category=self.category,
            is_published=True,
            is_featured=True,
            publication_date=timezone.localdate(),
        )
        self.article = Article.objects.create(
            title="The people changing leadership",
            slug="people-changing-leadership",
            body="A published feature from the issue.",
            category=self.category,
            status=Article.Status.PUBLISHED,
            published_at=timezone.now(),
        )
        self.magazine.related_articles.add(self.article)

    def test_editions_page_uses_live_magazine_data_for_the_cover_wall(self):
        response = self.client.get("/magazines/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="magazine-wall"')
        self.assertContains(response, self.magazine.title)
        self.assertContains(response, "Explore all editions")
        self.assertContains(response, self.magazine.get_absolute_url())
        self.assertNotContains(self.client.get("/"), 'id="magazine-wall"')

    def test_magazine_detail_has_3d_stage_and_only_available_live_actions(self):
        response = self.client.get(self.magazine.get_absolute_url())

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'class="magazine-stage" data-magazine-tilt')
        self.assertContains(response, "WEB LIVE")
        self.assertNotContains(response, "DIGITAL LIVE")
        self.assertContains(response, "Digital reader unavailable for this issue")
