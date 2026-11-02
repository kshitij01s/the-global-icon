import json
from datetime import date, timedelta

from django.contrib.auth.models import Group, User
from django.contrib.auth.models import Permission
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.management.base import CommandError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.utils import timezone

from .models import (
    Article,
    Advertisement,
    AdvertisementEvent,
    Announcement,
    Category,
    Edition,
    FeaturedLeader,
    HomepageSection,
    Magazine,
    ManagementAuditEvent,
    NewsletterSubscriber,
    PartnerOrganization,
    ReadingHistory,
    SavedContent,
)


class PublishingJourneyTests(TestCase):
    def setUp(self):
        self.article = Article.objects.create(
            title="The next economy",
            slug="next-economy",
            excerpt="A closer look at business.",
            body="The future of the economy is changing.",
            status=Article.Status.PUBLISHED,
            published_at=timezone.now(),
        )
        self.draft = Article.objects.create(
            title="Unpublished note",
            slug="unpublished-note",
            body="This should stay private.",
        )

    def test_public_pages_only_show_published_content(self):
        self.assertContains(self.client.get("/"), "The next economy")
        self.assertNotContains(self.client.get("/"), "Unpublished note")
        self.assertEqual(self.client.get("/articles/unpublished-note/").status_code, 404)

    def test_search_finds_published_articles(self):
        response = self.client.get("/search/", {"q": "economy"})
        self.assertContains(response, "The next economy")
        self.assertNotContains(response, "Unpublished note")

    def test_sitemap_contains_only_public_published_articles(self):
        Article.objects.create(
            title="Subscriber only",
            slug="subscriber-only",
            body="Protected copy.",
            status=Article.Status.PUBLISHED,
            published_at=timezone.now(),
            member_only=True,
        )
        response = self.client.get("/sitemap.xml")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "/articles/next-economy/")
        self.assertNotContains(response, "/articles/unpublished-note/")
        self.assertNotContains(response, "/articles/subscriber-only/")

    def test_homepage_sections_leaders_and_partners_use_cms_records(self):
        category = Category.objects.create(name="Leadership", slug="leadership")
        article = Article.objects.create(
            title="A published leader feature",
            slug="published-leader-feature",
            body="Feature text.",
            status=Article.Status.PUBLISHED,
            published_at=timezone.now(),
            category=category,
        )
        magazine = Magazine.objects.create(
            title="Leadership issue",
            slug="leadership-issue",
            category=category,
            is_published=True,
        )
        leader = FeaturedLeader.objects.create(
            name="Editorial Demonstration",
            slug="editorial-demonstration",
            designation="Interview subject",
            organization="Demonstration only",
            article=article,
            magazine=magazine,
            category=category,
            is_published=True,
        )
        HomepageSection.objects.create(title="Leadership insights", category=category)
        PartnerOrganization.objects.create(name="Configured partner")

        response = self.client.get("/")
        self.assertContains(response, "Leadership insights")
        self.assertContains(response, leader.name)
        self.assertContains(response, "Configured partner")

    def test_leader_directory_filters_year_category_edition_and_search(self):
        category = Category.objects.create(name="Finance", slug="finance")
        edition = Edition.objects.create(name="North edition", slug="north")
        magazine = Magazine.objects.create(
            title="North finance issue",
            slug="north-finance",
            edition=edition,
            category=category,
            is_published=True,
        )
        FeaturedLeader.objects.create(
            name="Avery Example",
            slug="avery-example",
            designation="Editor",
            organization="Example Group",
            category=category,
            magazine=magazine,
            is_published=True,
            is_featured=True,
            publication_date=date(2025, 5, 1),
        )
        FeaturedLeader.objects.create(
            name="Jordan Example",
            slug="jordan-example",
            category=category,
            magazine=magazine,
            is_published=True,
            publication_date=date(2024, 5, 1),
        )

        response = self.client.get(
            "/leaders/",
            {"year": "2025", "category": "finance", "edition": "north", "q": "Avery", "featured": "1"},
        )
        self.assertContains(response, "Avery Example")
        self.assertNotContains(response, "Jordan Example")
        self.assertContains(response, 'name="year"')
        self.assertContains(response, "Featured only")

    def test_magazine_directory_filters_and_preserves_query_during_pagination(self):
        category = Category.objects.create(name="Culture", slug="culture")
        edition = Edition.objects.create(name="West edition", slug="west")
        for index in range(13):
            Magazine.objects.create(
                title=f"Culture issue {index}",
                slug=f"culture-issue-{index}",
                edition=edition,
                category=category,
                is_published=True,
                is_featured=index == 0,
                publication_date=date(2025, 1, 1),
            )
        Magazine.objects.create(title="Other edition", slug="other-edition", is_published=True)

        response = self.client.get(
            "/magazines/",
            {"year": "2025", "category": "culture", "edition": "west", "q": "Culture"},
        )
        self.assertEqual(response.context["page"].paginator.count, 13)
        self.assertContains(response, "Culture issue")
        self.assertNotContains(response, "Other edition")
        self.assertIn("category=culture", response.context["filter_query"])
        self.assertIn("year=2025", response.context["filter_query"])
        featured_response = self.client.get("/magazines/", {"featured": "1"})
        self.assertEqual(featured_response.context["page"].paginator.count, 1)
        self.assertContains(featured_response, 'name="featured"')

    def test_magazine_directory_sorts_oldest_first(self):
        newer = Magazine.objects.create(
            title="Newer issue",
            slug="newer-issue",
            is_published=True,
            publication_date=date(2026, 1, 1),
        )
        older = Magazine.objects.create(
            title="Older issue",
            slug="older-issue",
            is_published=True,
            publication_date=date(2024, 1, 1),
        )

        response = self.client.get("/magazines/", {"sort": "oldest"})

        self.assertEqual(response.context["page"].object_list[0], older)
        self.assertEqual(response.context["page"].object_list[1], newer)
        self.assertEqual(response.context["sort"], "oldest")
        self.assertContains(response, '<option value="oldest" selected>')

    def test_magazine_directory_ranks_recent_reader_activity_without_exposing_restricted_issues(self):
        popular = Magazine.objects.create(title="Popular issue", slug="popular-issue", is_published=True)
        next_issue = Magazine.objects.create(title="Next issue", slug="next-issue", is_published=True)
        restricted = Magazine.objects.create(
            title="Restricted issue",
            slug="restricted-trending-issue",
            is_published=True,
            access=Magazine.Access.MEMBERS,
        )
        for index in range(2):
            reader = User.objects.create_user(username=f"trend-reader-{index}")
            ReadingHistory.objects.create(
                user=reader,
                magazine=popular,
                last_viewed_at=timezone.now() - timedelta(days=2),
            )
        recent_reader = User.objects.create_user(username="trend-reader-recent")
        ReadingHistory.objects.create(user=recent_reader, magazine=next_issue)
        old_reader = User.objects.create_user(username="trend-reader-old")
        ReadingHistory.objects.create(
            user=old_reader,
            magazine=next_issue,
            last_viewed_at=timezone.now() - timedelta(days=45),
        )
        restricted_reader = User.objects.create_user(username="trend-reader-restricted")
        ReadingHistory.objects.create(user=restricted_reader, magazine=restricted)

        response = self.client.get("/magazines/")

        self.assertEqual(
            [magazine.title for magazine in response.context["trending_magazines"]],
            ["Popular issue", "Next issue"],
        )
        self.assertContains(response, "Trending with readers")
        self.assertNotContains(response, "Restricted issue")

    def test_unpublished_leader_or_unpublished_linked_content_is_not_public(self):
        article = Article.objects.create(
            title="Draft interview",
            slug="draft-interview",
            body="Unpublished",
        )
        FeaturedLeader.objects.create(
            name="Private interview subject",
            slug="private-interview-subject",
            article=article,
            is_published=True,
        )
        FeaturedLeader.objects.create(
            name="Unpublished profile",
            slug="unpublished-profile",
            magazine=Magazine.objects.create(
                title="Hidden magazine",
                slug="hidden-magazine",
                is_published=False,
            ),
            is_published=False,
        )
        self.assertEqual(self.client.get("/leaders/").context["page"].paginator.count, 0)
        self.assertEqual(self.client.get("/leaders/private-interview-subject/").status_code, 404)

    def test_magazine_directory_hides_members_only_issues_from_public(self):
        Magazine.objects.create(title="Public edition", slug="public-edition", is_published=True)
        Magazine.objects.create(
            title="Private edition",
            slug="private-edition",
            is_published=True,
            access=Magazine.Access.MEMBERS,
        )
        response = self.client.get("/magazines/")
        self.assertContains(response, "Public edition")
        self.assertNotContains(response, "Private edition")
        search_response = self.client.get("/search/", {"q": "Private edition"})
        self.assertNotContains(search_response, "/magazines/private-edition/")

    def test_newsletter_requires_consent_and_prevents_duplicates(self):
        response = self.client.post("/newsletter/signup/", {"email": "reader@example.com"})
        self.assertEqual(NewsletterSubscriber.objects.count(), 0)
        self.client.post(
            "/newsletter/signup/",
            {"email": "Reader@example.com", "consent": "on"},
        )
        self.client.post(
            "/newsletter/signup/",
            {"email": "reader@example.com", "consent": "on"},
        )
        self.assertEqual(NewsletterSubscriber.objects.count(), 1)
        self.assertEqual(response.status_code, 302)
        subscriber = NewsletterSubscriber.objects.get()
        self.assertRedirects(
            self.client.post(
                f"/newsletter/unsubscribe/{subscriber.unsubscribe_token}/",
                follow=True,
            ),
            "/",
        )
        subscriber.refresh_from_db()
        self.assertFalse(subscriber.is_active)

    def test_member_pdf_requires_member_group_and_uses_private_route(self):
        magazine = Magazine.objects.create(
            title="Member issue",
            slug="member-issue",
            access=Magazine.Access.MEMBERS,
            is_published=True,
            pdf_file=SimpleUploadedFile("issue.pdf", b"%PDF-1.4\nreader content", content_type="application/pdf"),
        )
        self.assertEqual(self.client.get(f"/magazines/{magazine.slug}/pdf/").status_code, 403)
        user = User.objects.create_user(username="member", password="not-used")
        group = Group.objects.create(name="Subscribers")
        user.groups.add(group)
        self.client.force_login(user)
        response = self.client.get(f"/magazines/{magazine.slug}/pdf/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertNotIn("attachment", response.get("Content-Disposition", ""))
        download_response = self.client.get(f"/magazines/{magazine.slug}/pdf/?download=1")
        self.assertIn("attachment", download_response["Content-Disposition"])

    def test_download_flag_is_enforced_but_pdf_remains_inline_readable(self):
        magazine = Magazine.objects.create(
            title="Inline issue",
            slug="inline-issue",
            is_published=True,
            allow_download=False,
            pdf_file=SimpleUploadedFile("inline.pdf", b"%PDF-1.4\nreader content", content_type="application/pdf"),
        )
        inline_response = self.client.get(f"/magazines/{magazine.slug}/pdf/")
        self.assertEqual(inline_response.status_code, 200)
        self.assertNotIn("attachment", inline_response.get("Content-Disposition", ""))
        self.assertEqual(self.client.get(f"/magazines/{magazine.slug}/pdf/?download=1").status_code, 403)

    def test_future_article_is_not_public(self):
        Article.objects.create(
            title="Coming later",
            slug="coming-later",
            body="Not yet.",
            status=Article.Status.PUBLISHED,
            published_at=timezone.now() + timedelta(days=1),
        )
        self.assertEqual(self.client.get("/articles/coming-later/").status_code, 404)

    def test_scheduled_articles_publish_when_due(self):
        article = Article.objects.create(
            title="Ready to publish",
            slug="ready-to-publish",
            body="Approved content.",
            status=Article.Status.SCHEDULED,
            published_at=timezone.now() - timedelta(minutes=1),
        )
        from django.core.management import call_command

        call_command("publish_scheduled")
        article.refresh_from_db()
        self.assertEqual(article.status, Article.Status.PUBLISHED)
        self.assertContains(self.client.get(article.get_absolute_url()), "Ready to publish")

    def test_member_article_is_hidden_from_public_but_visible_to_member(self):
        article = Article.objects.create(
            title="Members only",
            slug="members-only",
            body="Protected.",
            status=Article.Status.PUBLISHED,
            published_at=timezone.now(),
            member_only=True,
        )
        self.assertEqual(self.client.get(article.get_absolute_url()).status_code, 404)
        response = self.client.get("/search/", {"q": "Members only"})
        self.assertNotContains(response, 'href="/articles/members-only/"')
        user = User.objects.create_user(username="reader", password="not-used")
        group = Group.objects.create(name="Subscribers")
        user.groups.add(group)
        self.client.force_login(user)
        self.assertContains(self.client.get(article.get_absolute_url()), "Members only")

    def test_magazine_without_pdf_shows_unavailable_preview_and_keeps_cover_details(self):
        magazine = Magazine.objects.create(
            title="Cover-only demonstration",
            slug="cover-only-demonstration",
            is_published=True,
            cover="missing-cover.jpg",
            pdf_file="missing-issue.pdf",
        )
        response = self.client.get(magazine.get_absolute_url())
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Preview unavailable")
        self.assertContains(response, "Cover-only demonstration")
        self.assertNotContains(response, "Download PDF")
        self.assertNotContains(response, "missing-cover.jpg")
        self.assertEqual(self.client.get(f"/magazines/{magazine.slug}/pdf/").status_code, 404)

    def test_magazine_reader_uses_correct_edition_and_preserves_access_checks(self):
        magazine = Magazine.objects.create(
            title="Reader edition",
            slug="reader-edition",
            is_published=True,
            publisher_name="Reader Press",
            pdf_file=SimpleUploadedFile("reader.pdf", b"%PDF-1.4\nreader content", content_type="application/pdf"),
        )
        private_magazine = Magazine.objects.create(
            title="Member reader edition",
            slug="member-reader-edition",
            is_published=True,
            access=Magazine.Access.MEMBERS,
            pdf_file=SimpleUploadedFile("member-reader.pdf", b"%PDF-1.4\nmember content", content_type="application/pdf"),
        )
        reader_response = self.client.get(f"/magazines/{magazine.slug}/read/")
        self.assertEqual(reader_response.status_code, 200)
        self.assertContains(reader_response, "Reader edition")
        self.assertContains(reader_response, "Reader Press")
        self.assertContains(reader_response, "data-reader-prev")
        self.assertContains(reader_response, "pdfjs")
        self.assertEqual(self.client.get(f"/magazines/{private_magazine.slug}/read/").status_code, 403)
        self.assertEqual(self.client.get(f"/magazines/{self.draft.slug}/read/").status_code, 404)

    def test_authenticated_reader_saves_and_resumes_page_progress(self):
        magazine = Magazine.objects.create(
            title="Progress edition",
            slug="progress-edition",
            is_published=True,
            pdf_file=SimpleUploadedFile(
                "progress.pdf",
                b"%PDF-1.4\nreader content",
                content_type="application/pdf",
            ),
        )
        reader = User.objects.create_user(username="progress-reader", password="test-password")
        self.client.force_login(reader)

        response = self.client.get(f"/magazines/{magazine.slug}/read/")
        self.assertContains(response, 'data-initial-page="1"')
        progress_response = self.client.post(
            f"/magazines/{magazine.slug}/progress/",
            data=json.dumps({"page": 7}),
            content_type="application/json",
        )
        self.assertEqual(progress_response.status_code, 200)
        self.assertEqual(progress_response.json(), {"saved": True, "page": 7})

        history = ReadingHistory.objects.get(user=reader, magazine=magazine)
        self.assertEqual(history.last_page, 7)
        self.assertContains(self.client.get(f"/magazines/{magazine.slug}/read/"), 'data-initial-page="7"')

        invalid_response = self.client.post(
            f"/magazines/{magazine.slug}/progress/",
            data=json.dumps({"page": True}),
            content_type="application/json",
        )
        self.assertEqual(invalid_response.status_code, 400)

        restricted_magazine = Magazine.objects.create(
            title="Restricted progress edition",
            slug="restricted-progress-edition",
            is_published=True,
            access=Magazine.Access.MEMBERS,
            pdf_file=SimpleUploadedFile(
                "restricted-progress.pdf",
                b"%PDF-1.4\nrestricted content",
                content_type="application/pdf",
            ),
        )
        denied_response = self.client.post(
            f"/magazines/{restricted_magazine.slug}/progress/",
            data=json.dumps({"page": 2}),
            content_type="application/json",
        )
        self.assertEqual(denied_response.status_code, 403)

        another_reader = User.objects.create_user(username="another-reader", password="test-password")
        another_client = self.client_class()
        another_client.force_login(another_reader)
        another_reader_response = another_client.get(f"/magazines/{magazine.slug}/read/")
        self.assertContains(another_reader_response, 'data-initial-page="1"')

    def test_magazine_recommendations_only_include_public_related_content(self):
        category = Category.objects.create(name="Reader category", slug="reader-category")
        magazine = Magazine.objects.create(
            title="Related-content edition",
            slug="related-content-edition",
            category=category,
            is_published=True,
        )
        public_issue = Magazine.objects.create(
            title="Public related edition",
            slug="public-related-edition",
            category=category,
            is_published=True,
        )
        restricted_issue = Magazine.objects.create(
            title="Restricted related edition",
            slug="restricted-related-edition",
            category=category,
            is_published=True,
            access=Magazine.Access.MEMBERS,
        )
        restricted_article = Article.objects.create(
            title="Restricted related story",
            slug="restricted-related-story",
            body="Members only.",
            category=category,
            status=Article.Status.PUBLISHED,
            published_at=timezone.now(),
            member_only=True,
        )
        magazine.related_articles.add(self.article, restricted_article)
        magazine.related_magazines.add(public_issue, restricted_issue)

        response = self.client.get(magazine.get_absolute_url())
        self.assertContains(response, self.article.title)
        self.assertContains(response, public_issue.title)
        self.assertNotContains(response, restricted_article.title)
        self.assertNotContains(response, restricted_issue.title)

    def test_ad_placement_schedule_clicks_impressions_and_admin_report(self):
        now = timezone.now()
        active_ad = Advertisement.objects.create(
            title="Configured sponsor",
            advertiser="Example advertiser",
            description="A test campaign.",
            destination_url="https://example.test/campaign",
            placement=Advertisement.Placement.HOMEPAGE_BANNER,
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(hours=1),
            is_active=True,
            campaign_identifier="TEST-CAMPAIGN",
        )
        expired_ad = Advertisement.objects.create(
            title="Expired sponsor",
            advertiser="Example advertiser",
            destination_url="https://example.test/expired",
            placement=Advertisement.Placement.HOMEPAGE_BANNER,
            ends_at=now - timedelta(seconds=1),
            is_active=True,
        )
        inactive_ad = Advertisement.objects.create(
            title="Inactive sponsor",
            advertiser="Example advertiser",
            destination_url="https://example.test/inactive",
            placement=Advertisement.Placement.HOMEPAGE_BANNER,
            is_active=False,
        )
        untracked_ad = Advertisement.objects.create(
            title="Untracked sponsor",
            advertiser="Example advertiser",
            destination_url="https://example.test/untracked",
            placement=Advertisement.Placement.HOMEPAGE_BANNER,
            is_active=True,
            track_impressions=False,
            track_clicks=False,
        )
        response = self.client.get("/")
        self.assertContains(response, "Configured sponsor")
        self.assertNotContains(response, "Expired sponsor")
        self.assertNotContains(response, "Inactive sponsor")
        self.assertContains(response, f"/ads/{active_ad.pk}/click/")

        self.assertEqual(
            self.client.get(f"/ads/{active_ad.pk}/impression/").status_code,
            405,
        )
        impression_response = self.client.post(f"/ads/{active_ad.pk}/impression/")
        self.assertEqual(impression_response.status_code, 204)
        click_response = self.client.get(f"/ads/{active_ad.pk}/click/")
        self.assertRedirects(click_response, "https://example.test/campaign", fetch_redirect_response=False)
        self.assertEqual(
            AdvertisementEvent.objects.filter(
                advertisement=active_ad,
                event_type=AdvertisementEvent.EventType.IMPRESSION,
            ).count(),
            1,
        )
        self.assertEqual(
            AdvertisementEvent.objects.filter(
                advertisement=active_ad,
                event_type=AdvertisementEvent.EventType.CLICK,
            ).count(),
            1,
        )
        self.assertEqual(self.client.get(f"/ads/{expired_ad.pk}/click/").status_code, 404)
        self.assertEqual(self.client.get(f"/ads/{inactive_ad.pk}/click/").status_code, 404)
        self.client.post(f"/ads/{untracked_ad.pk}/impression/")
        self.client.get(f"/ads/{untracked_ad.pk}/click/")
        self.assertFalse(AdvertisementEvent.objects.filter(advertisement=untracked_ad).exists())
        self.assertFalse(hasattr(AdvertisementEvent, "visitor_id"))

        staff = User.objects.create_user(username="ad-report-staff", password="test-password", is_staff=True)
        view_permission = Permission.objects.get(codename="view_advertisement")
        staff.user_permissions.add(view_permission)
        self.client.force_login(staff)
        report = self.client.get("/admin/reports/advertising/")
        self.assertEqual(report.status_code, 200)
        self.assertContains(report, "Configured sponsor")
        self.assertContains(report, "100.0%")

    def test_advertisement_only_accepts_http_destinations(self):
        advertisement = Advertisement(
            title="Invalid destination",
            advertiser="Example advertiser",
            destination_url="javascript:alert(1)",
            placement=Advertisement.Placement.HOMEPAGE_BANNER,
        )
        with self.assertRaises(ValidationError):
            advertisement.full_clean()

    def test_missing_article_image_uses_card_art_fallback(self):
        article = Article.objects.create(
            title="Editorial with missing media",
            slug="editorial-with-missing-media",
            body="Reviewed copy.",
            featured_image="missing-article.jpg",
            status=Article.Status.PUBLISHED,
            published_at=timezone.now(),
        )
        response = self.client.get("/articles/")
        self.assertContains(response, "story-image-mark")
        self.assertNotContains(response, "missing-article.jpg")
        self.assertEqual(self.client.get(article.get_absolute_url()).status_code, 200)
        self.assertNotContains(self.client.get(article.get_absolute_url()), "missing-article.jpg")

    def test_saved_library_and_reading_history_are_private_to_each_user(self):
        article = Article.objects.create(
            title="Private reading list story",
            slug="private-reading-list-story",
            body="Publicly available editorial copy.",
            status=Article.Status.PUBLISHED,
            published_at=timezone.now(),
        )
        magazine = Magazine.objects.create(
            title="Private reading list edition",
            slug="private-reading-list-edition",
            is_published=True,
        )
        first_reader = User.objects.create_user(username="first-reader", password="test-password")
        second_reader = User.objects.create_user(username="second-reader", password="test-password")

        self.client.force_login(first_reader)
        self.client.get(article.get_absolute_url())
        self.client.get(magazine.get_absolute_url())
        self.client.post(f"/account/saved/articles/{article.slug}/")
        self.client.post(f"/account/saved/magazines/{magazine.slug}/")
        account_response = self.client.get("/account/")
        self.assertContains(account_response, article.title)
        self.assertContains(account_response, magazine.title)
        self.assertEqual(ReadingHistory.objects.filter(user=first_reader).count(), 2)

        self.client.force_login(second_reader)
        other_account = self.client.get("/account/")
        self.assertNotContains(other_account, article.title)
        self.assertNotContains(other_account, magazine.title)
        self.assertEqual(SavedContent.objects.filter(user=second_reader).count(), 0)
        self.assertEqual(self.client.get(f"/account/saved/articles/{article.slug}/").status_code, 405)
        self.client.post(f"/account/unsave/articles/{article.slug}/")
        self.assertTrue(SavedContent.objects.filter(user=first_reader, article=article).exists())

        self.client.force_login(first_reader)
        self.client.post(f"/account/unsave/articles/{article.slug}/")
        self.client.post(f"/account/unsave/magazines/{magazine.slug}/")
        self.assertFalse(SavedContent.objects.filter(user=first_reader).exists())

    def test_only_current_admin_enabled_announcement_is_rendered(self):
        now = timezone.now()
        Announcement.objects.create(title="Current edition announcement", is_active=True)
        Announcement.objects.create(
            title="Future announcement",
            is_active=True,
            starts_at=now + timedelta(days=1),
        )
        Announcement.objects.create(
            title="Expired announcement",
            is_active=True,
            ends_at=now - timedelta(seconds=1),
        )
        response = self.client.get("/")
        self.assertContains(response, "Current edition announcement")
        self.assertNotContains(response, "Future announcement")
        self.assertNotContains(response, "Expired announcement")


class DemoDataCommandTests(TestCase):
    @override_settings(DEBUG=True)
    def test_seed_refuses_to_adopt_existing_reserved_identifier(self):
        existing = Category.objects.create(
            name="Client category",
            slug="demo-category-business",
            description="Client-owned taxonomy.",
        )

        with self.assertRaises(CommandError):
            call_command("seed_demo_data")

        existing.refresh_from_db()
        self.assertEqual(existing.name, "Client category")
        self.assertEqual(Category.objects.count(), 1)

    @override_settings(DEBUG=True)
    def test_seed_is_idempotent_and_cleanup_preserves_unmarked_content(self):
        original = Article.objects.create(
            title="Client-owned article",
            slug="client-owned-article",
            body="Do not remove this record.",
        )
        call_command("seed_demo_data")
        call_command("seed_demo_data")

        self.assertEqual(Article.objects.filter(slug__startswith="demo-article-").count(), 30)
        self.assertEqual(Magazine.objects.filter(slug__startswith="demo-magazine-").count(), 17)
        reader_sample = Magazine.objects.get(slug="demo-magazine-reader-sample")
        self.assertTrue(reader_sample.has_pdf)
        reader_sample_file = reader_sample.pdf_file.name
        self.assertEqual(FeaturedLeader.objects.filter(slug__startswith="demo-leader-").count(), 12)
        self.assertEqual(FeaturedLeader.objects.filter(slug__startswith="demo-leader-", is_featured=True).count(), 4)
        self.assertEqual(NewsletterSubscriber.objects.filter(email__endswith="@example.test").count(), 24)
        self.assertEqual(HomepageSection.objects.filter(title__startswith="DEMO — ").count(), 8)
        self.assertEqual(Advertisement.objects.filter(is_demo=True).count(), 8)
        reader_sample.refresh_from_db()
        self.assertEqual(reader_sample.pdf_file.name, reader_sample_file)

        call_command("seed_demo_data", cleanup=True)

        self.assertTrue(Article.objects.filter(pk=original.pk).exists())
        self.assertFalse(Article.objects.filter(slug__startswith="demo-article-").exists())
        self.assertFalse(Magazine.objects.filter(slug__startswith="demo-magazine-").exists())
        self.assertFalse(reader_sample.pdf_file.storage.exists(reader_sample_file))
        self.assertFalse(FeaturedLeader.objects.filter(slug__startswith="demo-leader-").exists())
        self.assertFalse(Advertisement.objects.filter(is_demo=True).exists())
        self.assertFalse(NewsletterSubscriber.objects.filter(email__endswith="@example.test").exists())

    @override_settings(DEBUG=True)
    def test_cleanup_refuses_to_remove_demo_records_referenced_by_client_content(self):
        call_command("seed_demo_data")
        demo_category = Category.objects.get(slug="demo-category-business")
        client_article = Article.objects.create(
            title="Client story",
            slug="client-story",
            body="Reviewed copy.",
            category=demo_category,
        )

        with self.assertRaises(CommandError):
            call_command("seed_demo_data", cleanup=True)

        self.assertTrue(client_article.category_id)
        self.assertEqual(Article.objects.filter(slug__startswith="demo-article-").count(), 30)
        client_article.delete()
        call_command("seed_demo_data", cleanup=True)

    @override_settings(DEBUG=True)
    def test_cleanup_preserves_reader_saves_and_history_for_demo_content(self):
        call_command("seed_demo_data")
        demo_article = Article.objects.get(slug="demo-article-01")
        reader = User.objects.create_user(username="demo-reader", password="test-password")
        saved = SavedContent.objects.create(user=reader, article=demo_article)
        history = ReadingHistory.objects.create(user=reader, article=demo_article)

        with self.assertRaises(CommandError):
            call_command("seed_demo_data", cleanup=True)
        self.assertTrue(Article.objects.filter(pk=demo_article.pk).exists())

        saved.delete()
        with self.assertRaises(CommandError):
            call_command("seed_demo_data", cleanup=True)

        history.delete()
        call_command("seed_demo_data", cleanup=True)
        self.assertFalse(Article.objects.filter(pk=demo_article.pk).exists())

    @override_settings(DEBUG=True)
    def test_cleanup_preserves_demo_campaigns_with_recorded_ad_events(self):
        call_command("seed_demo_data")
        advertisement = Advertisement.objects.get(campaign_identifier="DEMO-CAMPAIGN-01")
        event = AdvertisementEvent.objects.create(
            advertisement=advertisement,
            event_type=AdvertisementEvent.EventType.IMPRESSION,
            placement=advertisement.placement,
        )

        with self.assertRaises(CommandError):
            call_command("seed_demo_data", cleanup=True)
        self.assertTrue(Advertisement.objects.filter(pk=advertisement.pk).exists())

        event.delete()
        call_command("seed_demo_data", cleanup=True)
        self.assertFalse(Advertisement.objects.filter(pk=advertisement.pk).exists())


class MagazineManagementWorkflowTests(TestCase):
    def setUp(self):
        call_command("setup_roles")
        self.editor = self.create_staff_member(
            "workflow-editor",
            "Content Editors",
            ("add_magazine", "view_magazine", "change_magazine"),
        )
        self.reviewer = self.create_staff_member(
            "workflow-reviewer",
            "Publication Reviewers",
            ("view_magazine", "change_magazine", "approve_magazine"),
        )
        self.publisher = self.create_staff_member(
            "workflow-publisher",
            "Publication Publishers",
            ("view_magazine", "change_magazine", "publish_magazine"),
        )
        self.uploaded_magazines = []

    def tearDown(self):
        for magazine in self.uploaded_magazines:
            if magazine.pdf_file:
                magazine.pdf_file.delete(save=False)
        super().tearDown()

    def create_staff_member(self, username, group_name, permission_codenames):
        user = User.objects.create_user(username=username, password="workflow-test-password", is_staff=True)
        group = Group.objects.get(name=group_name)
        user.groups.add(group)
        permissions = Permission.objects.filter(
            content_type__app_label="publications",
            codename__in=permission_codenames,
        )
        user.user_permissions.add(*permissions)
        return user

    def upload_data(self, title="Workflow edition", review_status="in_review", file_bytes=b"%PDF-1.4\nsample"):
        return {
            "title": title,
            "slug": title.lower().replace(" ", "-"),
            "publication_date": date.today().isoformat(),
            "access": Magazine.Access.PUBLIC,
            "review_status": review_status,
            "pdf_file": SimpleUploadedFile(
                f"{title.lower().replace(' ', '-')}.pdf",
                file_bytes,
                content_type="application/pdf",
            ),
        }

    def test_unstaffed_reader_cannot_open_management_screens(self):
        reader = User.objects.create_user(username="ordinary-reader", password="reader-password")
        reader.user_permissions.add(Permission.objects.get(codename="add_magazine"))
        self.client.force_login(reader)
        self.client.raise_request_exception = False

        self.assertEqual(self.client.get("/manage/").status_code, 403)
        self.assertEqual(self.client.get("/manage/magazines/upload/").status_code, 403)

    def test_upload_stays_unpublished_until_reviewed_and_published(self):
        self.client.force_login(self.editor)
        response = self.client.post(
            "/manage/magazines/upload/",
            self.upload_data(),
        )
        self.assertEqual(response.status_code, 302)
        magazine = Magazine.objects.get(slug="workflow-edition")
        self.uploaded_magazines.append(magazine)
        self.assertEqual(magazine.review_status, Magazine.ReviewStatus.IN_REVIEW)
        self.assertFalse(magazine.is_published)
        self.assertEqual(magazine.submitted_by, self.editor)
        self.assertTrue(magazine.has_pdf)
        self.assertTrue(
            ManagementAuditEvent.objects.filter(
                actor=self.editor,
                event_type=ManagementAuditEvent.EventType.MAGAZINE_SUBMITTED,
                object_id=str(magazine.pk),
            ).exists()
        )

        self.client.force_login(self.publisher)
        self.client.post(f"/manage/magazines/{magazine.pk}/publish/publish/")
        magazine.refresh_from_db()
        self.assertFalse(magazine.is_published)

        self.client.force_login(self.reviewer)
        self.client.post(f"/manage/magazines/{magazine.pk}/review/approve/")
        magazine.refresh_from_db()
        self.assertEqual(magazine.review_status, Magazine.ReviewStatus.APPROVED)
        self.assertEqual(magazine.reviewed_by, self.reviewer)

        self.client.force_login(self.publisher)
        self.client.post(f"/manage/magazines/{magazine.pk}/publish/publish/")
        magazine.refresh_from_db()
        self.assertTrue(magazine.is_published)
        self.assertEqual(magazine.published_by, self.publisher)
        self.assertIsNotNone(magazine.published_at)
        self.assertTrue(
            ManagementAuditEvent.objects.filter(
                actor=self.publisher,
                event_type=ManagementAuditEvent.EventType.MAGAZINE_PUBLISHED,
                object_id=str(magazine.pk),
            ).exists()
        )

    def test_upload_requires_a_valid_pdf_and_can_remain_a_draft(self):
        self.client.force_login(self.editor)
        invalid_response = self.client.post(
            "/manage/magazines/upload/",
            self.upload_data(title="Invalid upload", file_bytes=b"not a pdf"),
        )
        self.assertEqual(invalid_response.status_code, 200)
        self.assertFalse(Magazine.objects.filter(slug="invalid-upload").exists())

        self.client.post(
            "/manage/magazines/upload/",
            self.upload_data(title="Draft edition", review_status=Magazine.ReviewStatus.DRAFT),
        )
        magazine = Magazine.objects.get(slug="draft-edition")
        self.uploaded_magazines.append(magazine)
        self.assertEqual(magazine.review_status, Magazine.ReviewStatus.DRAFT)
        self.assertFalse(magazine.is_published)
        self.assertIsNone(magazine.submitted_by)

        self.client.post(f"/manage/magazines/{magazine.pk}/submit/")
        magazine.refresh_from_db()
        self.assertEqual(magazine.review_status, Magazine.ReviewStatus.IN_REVIEW)
        self.assertEqual(magazine.submitted_by, self.editor)
        self.assertIsNotNone(magazine.submitted_at)
        self.assertTrue(
            ManagementAuditEvent.objects.filter(
                actor=self.editor,
                event_type=ManagementAuditEvent.EventType.MAGAZINE_SUBMITTED,
                object_id=str(magazine.pk),
            ).exists()
        )

    def test_registration_creates_a_reader_not_a_staff_user(self):
        response = self.client.post(
            "/register/",
            {
                "username": "new-reader",
                "email": "new-reader@example.test",
                "password1": "reader-safe-password-729!",
                "password2": "reader-safe-password-729!",
            },
        )

        self.assertEqual(response.status_code, 302)
        reader = User.objects.get(username="new-reader")
        self.assertTrue(reader.is_authenticated)
        self.assertFalse(reader.is_staff)
        self.assertFalse(reader.is_superuser)

    def test_reading_and_saved_items_reject_duplicate_user_content_pairs(self):
        reader = User.objects.create_user(username="unique-reader", password="reader-password")
        article = Article.objects.create(title="Unique story", slug="unique-story", body="Text")
        magazine = Magazine.objects.create(title="Unique issue", slug="unique-issue")

        SavedContent.objects.create(user=reader, article=article)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                SavedContent.objects.create(user=reader, article=article)
        SavedContent.objects.create(user=reader, magazine=magazine)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                SavedContent.objects.create(user=reader, magazine=magazine)

        ReadingHistory.objects.create(user=reader, article=article)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ReadingHistory.objects.create(user=reader, article=article)
        ReadingHistory.objects.create(user=reader, magazine=magazine)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ReadingHistory.objects.create(user=reader, magazine=magazine)
