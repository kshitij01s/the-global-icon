from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand, CommandError

from publications.models import Advertisement, AdvertisementEvent


class Command(BaseCommand):
    help = "Create least-privilege editorial, publishing, advertising, and enquiry-management groups."

    def handle(self, *args, **options):
        app_label = "publications"
        roles = {
            "Content Editors": [
                *((f"{action}_{model}", app_label) for model in (
                    "magazine",
                    "article",
                    "author",
                    "featuredleader",
                    "homepagesection",
                    "partnerorganization",
                    "category",
                    "edition",
                    "announcement",
                ) for action in ("view", "add", "change")),
            ],
            "Publication Reviewers": [
                ("view_magazine", app_label),
                ("change_magazine", app_label),
                ("approve_magazine", app_label),
                ("view_management_audit_event", app_label),
            ],
            "Publication Publishers": [
                ("view_magazine", app_label),
                ("change_magazine", app_label),
                ("publish_magazine", app_label),
                ("view_article", app_label),
                ("change_article", app_label),
                ("publish_article", app_label),
                ("view_management_audit_event", app_label),
            ],
            "Advertisement Managers": [
                (f"view_{Advertisement._meta.model_name}", app_label),
                (f"view_{AdvertisementEvent._meta.model_name}", app_label),
                ("add_advertisement", app_label),
                ("change_advertisement", app_label),
            ],
            "Client Enquiry Managers": [
                ("manage_client_enquiry", app_label),
            ],
        }

        for group_name, permission_specs in roles.items():
            group, _ = Group.objects.get_or_create(name=group_name)
            permissions = []
            for codename, permission_app in permission_specs:
                try:
                    permissions.append(
                        Permission.objects.get(
                            content_type__app_label=permission_app,
                            codename=codename,
                        )
                    )
                except Permission.DoesNotExist as error:
                    raise CommandError(
                        f"Required permission {permission_app}.{codename} is missing; "
                        "run migrations before setting up roles."
                    ) from error
            group.permissions.set(permissions)
            self.stdout.write(f"Configured {group_name}: {len(permissions)} permissions.")

        self.stdout.write(
            self.style.SUCCESS(
                "Role groups are ready. Assign groups and is_staff only from a trusted superuser account."
            )
        )
