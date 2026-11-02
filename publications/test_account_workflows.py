import re

from django.contrib.auth.models import User
from django.core import mail
from django.test import TestCase, override_settings

from .models import Category, UserNotification


class ReaderAccountWorkflowTests(TestCase):
    def setUp(self):
        self.password = "reader-account-password-729!"
        self.user = User.objects.create_user(
            username="account-reader",
            email="account-reader@example.test",
            password=self.password,
        )

    def test_login_and_logout_use_post_and_redirect_to_home(self):
        login_response = self.client.post(
            "/accounts/login/",
            {"username": self.user.username, "password": self.password},
        )

        self.assertRedirects(login_response, "/")
        self.assertEqual(self.client.get("/account/").status_code, 200)

        logout_response = self.client.post("/accounts/logout/")
        self.assertRedirects(logout_response, "/")
        self.assertRedirects(self.client.get("/account/"), "/accounts/login/?next=/account/")

    def test_profile_and_password_changes_persist_without_ending_the_session(self):
        self.client.force_login(self.user)
        profile_response = self.client.post(
            "/account/profile/",
            {
                "first_name": "Avery",
                "last_name": "Reader",
                "email": "avery-reader@example.test",
            },
        )
        self.assertRedirects(profile_response, "/account/")
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Avery")
        self.assertEqual(self.user.email, "avery-reader@example.test")

        new_password = "reader-account-updated-password-814!"
        password_response = self.client.post(
            "/account/password/",
            {
                "old_password": self.password,
                "new_password1": new_password,
                "new_password2": new_password,
            },
        )
        self.assertRedirects(password_response, "/account/")
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))
        self.assertEqual(self.client.get("/account/").status_code, 200)

    def test_password_reset_sends_a_working_reset_link(self):
        with override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"):
            response = self.client.post(
                "/accounts/password-reset/",
                {"email": self.user.email},
            )

            self.assertRedirects(response, "/accounts/password-reset/done/")
            self.assertEqual(len(mail.outbox), 1)
            reset_path = re.search(
                r"https?://[^/\s]+(/accounts/password-reset/\S+)",
                mail.outbox[0].body,
            ).group(1)
            confirm_response = self.client.get(reset_path, follow=True)
            self.assertEqual(confirm_response.status_code, 200)
            self.assertContains(confirm_response, "Choose a new")
            reset_password = "reader-account-reset-password-518!"
            reset_response = self.client.post(
                confirm_response.request["PATH_INFO"],
                {
                    "new_password1": reset_password,
                    "new_password2": reset_password,
                },
            )
            self.assertRedirects(reset_response, "/accounts/password-reset/complete/")
            self.user.refresh_from_db()
            self.assertTrue(self.user.check_password(reset_password))

    def test_reader_preferences_and_notification_actions_are_account_scoped(self):
        self.client.force_login(self.user)
        category = Category.objects.create(name="Technology", slug="technology")
        preferences_response = self.client.post(
            "/account/preferences/",
            {
                "preferred_categories": [str(category.pk)],
                "notify_followed_publications": "on",
            },
        )
        self.assertRedirects(preferences_response, "/account/")
        self.assertTrue(
            self.user.reader_preferences.preferred_categories.filter(pk=category.pk).exists()
        )
        self.assertTrue(self.user.reader_preferences.notify_followed_publications)

        notification = UserNotification.objects.create(
            recipient=self.user,
            notification_type=UserNotification.NotificationType.NEW_PUBLICATION,
            title="New story",
            message="A story for your followed topic.",
            dedupe_key="article:account-workflow",
        )
        read_response = self.client.post(
            f"/account/notifications/{notification.pk}/read/"
        )
        self.assertRedirects(read_response, "/account/notifications/")
        notification.refresh_from_db()
        self.assertIsNotNone(notification.read_at)

        another_reader = User.objects.create_user(
            username="another-reader",
            password="another-reader-password-814!",
        )
        self.client.force_login(another_reader)
        unauthorized_response = self.client.post(
            f"/account/notifications/{notification.pk}/read/"
        )
        self.assertEqual(unauthorized_response.status_code, 404)

    def test_reading_preferences_require_authentication(self):
        response = self.client.get("/account/preferences/")

        self.assertRedirects(
            response,
            "/accounts/login/?next=/account/preferences/",
        )
