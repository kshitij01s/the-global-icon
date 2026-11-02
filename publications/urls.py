from django.urls import path
from django.contrib.syndication.views import Feed
from django.utils import timezone

from . import views


class ArticleFeed(Feed):
    title = "THE GLOBAL ICON — Latest stories"
    link = "/articles/"
    description = "The latest stories and perspectives from THE GLOBAL ICON."

    def items(self):
        return views.published_articles()[:20]

    def item_pubdate(self, item):
        return item.published_at or timezone.now()


urlpatterns = [
    path("", views.home, name="home"),
    path("register/", views.register_reader, name="register_reader"),
    path("contact/", views.contact, name="contact"),
    path("contact/thanks/", views.contact_thanks, name="contact_thanks"),
    path("manage/", views.management_dashboard, name="management_dashboard"),
    path("manage/magazines/", views.management_magazines, name="management_magazines"),
    path("manage/magazines/upload/", views.management_magazine_upload, name="management_magazine_upload"),
    path(
        "manage/magazines/<int:pk>/submit/",
        views.management_magazine_submit,
        name="management_magazine_submit",
    ),
    path(
        "manage/magazines/<int:pk>/review/<slug:decision>/",
        views.management_magazine_review,
        name="management_magazine_review",
    ),
    path(
        "manage/magazines/<int:pk>/publish/<slug:action>/",
        views.management_magazine_publish,
        name="management_magazine_publish",
    ),
    path("leaders/", views.leader_list, name="leader_list"),
    path("leaders/<slug:slug>/", views.leader_detail, name="leader_detail"),
    path("magazines/", views.magazine_list, name="magazine_list"),
    path("magazines/<slug:slug>/read/", views.magazine_reader, name="magazine_reader"),
    path("magazines/<slug:slug>/progress/", views.save_reader_progress, name="save_reader_progress"),
    path("magazines/<slug:slug>/", views.magazine_detail, name="magazine_detail"),
    path("magazines/<slug:slug>/pdf/", views.magazine_pdf, name="magazine_pdf"),
    path("ads/<int:pk>/impression/", views.advertisement_impression, name="advertisement_impression"),
    path("ads/<int:pk>/click/", views.advertisement_click, name="advertisement_click"),
    path("articles/", views.article_list, name="article_list"),
    path("articles/<slug:slug>/", views.article_detail, name="article_detail"),
    path("search/", views.search, name="search"),
    path("newsletter/signup/", views.newsletter_signup, name="newsletter_signup"),
    path("newsletter/unsubscribe/<uuid:token>/", views.newsletter_unsubscribe, name="newsletter_unsubscribe"),
    path("account/", views.account, name="account"),
    path("account/preferences/", views.account_preferences, name="account_preferences"),
    path("account/enquiries/", views.client_enquiries, name="client_enquiries"),
    path("account/enquiries/<int:pk>/", views.client_enquiry_detail, name="client_enquiry_detail"),
    path("account/notifications/", views.account_notifications, name="account_notifications"),
    path(
        "account/notifications/<int:pk>/read/",
        views.mark_notification_read,
        name="mark_notification_read",
    ),
    path(
        "account/notifications/read-all/",
        views.mark_all_notifications_read,
        name="mark_all_notifications_read",
    ),
    path("account/profile/", views.account_profile, name="account_profile"),
    path("account/password/", views.account_password_change, name="account_password_change"),
    path("account/saved/articles/<slug:slug>/", views.save_article, name="save_article"),
    path("account/unsave/articles/<slug:slug>/", views.unsave_article, name="unsave_article"),
    path("account/saved/magazines/<slug:slug>/", views.save_magazine, name="save_magazine"),
    path("account/unsave/magazines/<slug:slug>/", views.unsave_magazine, name="unsave_magazine"),
    path("feed.xml", ArticleFeed(), name="article_feed"),
]
