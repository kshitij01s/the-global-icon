from unittest.mock import patch

from django.contrib.auth.models import Group, User
from django.core import mail
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from .models import (
    Article,
    Category,
    ClientEnquiry,
    Magazine,
    ReaderPreference,
    UserNotification,
)


class ContactWorkflowTests(TestCase):
    def enquiry_data(self, client, **overrides):
        client.get("/contact/")
        data = {
            "submission_token": client.session["contact_submission_token"],
            "full_name": "Alex Reader",
            "company": "Example Studio",
            "email": "ALEX@EXAMPLE.TEST",
            "phone": "+1 (555) 123-4567",
            "enquiry_type": ClientEnquiry.EnquiryType.ADVERTISING,
            "subject": "Campaign information",
            "message": "Please send the media kit.",
            "preferred_contact": "email",
        }
        data.update(overrides)
        return data

    def test_valid_contact_submission_is_saved_and_thank_you_is_one_time(self):
        response = self.client.post("/contact/", self.enquiry_data(self.client))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/contact/thanks/")
        enquiry = ClientEnquiry.objects.get()
        self.assertEqual(enquiry.email, "alex@example.test")
        self.assertEqual(enquiry.status, ClientEnquiry.Status.NEW)
        self.assertContains(self.client.get("/contact/thanks/"), enquiry.reference)
        self.assertRedirects(self.client.get("/contact/thanks/"), "/contact/")

    def test_invalid_phone_and_honeypot_are_rejected(self):
        response = self.client.post(
            "/contact/",
            self.enquiry_data(self.client, phone="not a phone"),
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Enter a valid phone number")
        self.assertFalse(ClientEnquiry.objects.exists())

        response = self.client.post(
            "/contact/",
            self.enquiry_data(self.client, website_confirm="spam"),
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(ClientEnquiry.objects.exists())

    @override_settings(
        CONTACT_RECIPIENT_EMAIL="team@magazine.test",
        DEFAULT_FROM_EMAIL="news@magazine.test",
        PUBLIC_SITE_URL="https://magazine.test",
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_configured_email_is_accepted_and_recorded(self):
        response = self.client.post("/contact/", self.enquiry_data(self.client))

        self.assertRedirects(response, "/contact/thanks/")
        enquiry = ClientEnquiry.objects.get()
        self.assertEqual(enquiry.email_notification_status, ClientEnquiry.EmailNotificationStatus.SENT)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(enquiry.reference, mail.outbox[0].subject)
        self.assertIn("https://magazine.test/admin/", mail.outbox[0].body)

    @override_settings(
        CONTACT_RECIPIENT_EMAIL="team@magazine.test",
        DEFAULT_FROM_EMAIL="news@magazine.test",
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    @patch("publications.views.send_mail", side_effect=OSError("mail service unavailable"))
    def test_email_failure_does_not_discard_enquiry(self, send_mail):
        response = self.client.post("/contact/", self.enquiry_data(self.client))

        self.assertRedirects(response, "/contact/thanks/")
        enquiry = ClientEnquiry.objects.get()
        self.assertEqual(enquiry.email_notification_status, ClientEnquiry.EmailNotificationStatus.FAILED)
        self.assertEqual(enquiry.email_notification_error, "The email service did not accept the notification.")
        send_mail.assert_called_once()

    def test_duplicate_submission_token_returns_existing_enquiry_without_duplicate(self):
        data = self.enquiry_data(self.client)
        first_response = self.client.post("/contact/", data)
        self.assertRedirects(first_response, "/contact/thanks/")

        duplicate_client = self.client_class()
        duplicate_response = duplicate_client.post("/contact/", data)
        self.assertEqual(duplicate_response.status_code, 200)
        self.assertEqual(ClientEnquiry.objects.count(), 1)

    def test_session_rate_limit_blocks_the_fourth_submission(self):
        for _ in range(3):
            response = self.client.post("/contact/", self.enquiry_data(self.client))
            self.assertEqual(response.status_code, 302)

        response = self.client.post("/contact/", self.enquiry_data(self.client))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "please wait a little")
        self.assertEqual(ClientEnquiry.objects.count(), 3)

    def test_enquiry_notifies_staff_with_the_management_permission(self):
        call_command("setup_roles", verbosity=0)
        manager = User.objects.create_user(
            username="enquiry-manager",
            password="test-password",
            is_staff=True,
        )
        manager.groups.add(Group.objects.get(name="Client Enquiry Managers"))

        self.client.post("/contact/", self.enquiry_data(self.client))

        notification = UserNotification.objects.get(recipient=manager)
        self.assertEqual(notification.notification_type, UserNotification.NotificationType.CLIENT_ENQUIRY)
        self.assertIn("/admin/publications/clientenquiry/", notification.target_url)

    def test_clients_can_only_view_their_own_enquiries_and_not_internal_notes(self):
        owner = User.objects.create_user(username="owner", password="test-password")
        other = User.objects.create_user(username="other", password="test-password")
        enquiry = ClientEnquiry.objects.create(
            full_name="Owner Reader",
            company="Example Studio",
            email="owner@example.test",
            enquiry_type=ClientEnquiry.EnquiryType.GENERAL,
            subject="Private enquiry",
            message="Please contact me.",
            submitted_by=owner,
            internal_notes="Confidential staff follow-up.",
        )

        self.client.force_login(owner)
        response = self.client.get(f"/account/enquiries/{enquiry.pk}/")
        self.assertContains(response, "Private enquiry")
        self.assertNotContains(response, "Confidential staff follow-up.")

        self.client.force_login(other)
        self.assertEqual(self.client.get(f"/account/enquiries/{enquiry.pk}/").status_code, 404)


class PublicationNotificationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="reader", password="test-password")
        self.category = Category.objects.create(name="Business", slug="business")
        self.preference = ReaderPreference.objects.create(user=self.user)
        self.preference.preferred_categories.add(self.category)

    def test_article_publication_notifies_followers_once(self):
        with self.captureOnCommitCallbacks(execute=True):
            article = Article.objects.create(
                title="A new perspective",
                slug="new-perspective",
                body="A story for readers.",
                category=self.category,
                status=Article.Status.PUBLISHED,
                published_at=timezone.now(),
            )

        notification = UserNotification.objects.get(recipient=self.user)
        self.assertEqual(notification.notification_type, UserNotification.NotificationType.NEW_PUBLICATION)
        self.assertEqual(notification.target_url, article.get_absolute_url())

        article.title = "An updated perspective"
        article.save()
        self.assertEqual(UserNotification.objects.count(), 1)

    def test_member_only_magazine_is_not_notified_to_nonmembers(self):
        with self.captureOnCommitCallbacks(execute=True):
            Magazine.objects.create(
                title="Members edition",
                slug="members-edition",
                category=self.category,
                access=Magazine.Access.MEMBERS,
                is_published=True,
            )

        self.assertFalse(UserNotification.objects.exists())

        subscribers = Group.objects.create(name="Subscribers")
        self.user.groups.add(subscribers)
        with self.captureOnCommitCallbacks(execute=True):
            Magazine.objects.create(
                title="Members edition two",
                slug="members-edition-two",
                category=self.category,
                access=Magazine.Access.MEMBERS,
                is_published=True,
            )
        self.assertEqual(UserNotification.objects.filter(recipient=self.user).count(), 1)

    def test_language_filters_exclude_other_languages(self):
        Article.objects.create(
            title="English economy",
            slug="english-economy",
            body="Economic outlook.",
            category=self.category,
            status=Article.Status.PUBLISHED,
            published_at=timezone.now(),
        )
        hindi_article = Article.objects.create(
            title="Hindi economy",
            slug="hindi-economy",
            body="Economic outlook.",
            category=self.category,
            language="hi",
            status=Article.Status.PUBLISHED,
            published_at=timezone.now(),
        )

        response = self.client.get("/articles/", {"language": "hi"})
        self.assertContains(response, hindi_article.title)
        self.assertNotContains(response, "English economy")

        response = self.client.get("/search/", {"q": "economy", "language": "hi"})
        self.assertContains(response, hindi_article.title)
        self.assertNotContains(response, "English economy")
