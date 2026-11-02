from datetime import timedelta

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone

from publications.models import (
    Article,
    Advertisement,
    AdvertisementEvent,
    Author,
    Category,
    DemoSeedRecord,
    Edition,
    FeaturedLeader,
    HomepageSection,
    Magazine,
    NewsletterSubscriber,
    PartnerOrganization,
    ReadingHistory,
    SavedContent,
    SiteConfiguration,
)


CATEGORIES = [
    ("business", "Business & Markets", "Strategy, enterprise and changing markets."),
    ("technology", "AI & Technology", "Technology, digital systems and responsible AI."),
    ("healthcare", "Healthcare & Science", "Care, research and scientific innovation."),
    ("finance", "Finance & Investment", "Financial services, capital and investment."),
    ("entrepreneurship", "Entrepreneurship", "New ventures and the work of building."),
    ("sustainability", "Sustainability & Industry", "Industry, resilience and the transition ahead."),
    ("leadership", "Leadership & Interviews", "Leadership practices and editorial conversations."),
    ("science", "Science & Society", "Research, discovery and their human context."),
    ("manufacturing", "Manufacturing", "Operations, production and industrial design."),
    ("markets", "Global Markets", "Regional perspectives and market questions."),
]

EDITIONS = [
    ("global", "Global Edition", "Global"),
    ("asia-pacific", "Asia-Pacific Edition", "Asia-Pacific"),
    ("europe", "Europe Edition", "Europe"),
    ("americas", "Americas Edition", "North and South America"),
    ("africa", "Africa Edition", "Africa"),
]

AUTHORS = [
    ("Mira Sen", "An illustrative editorial profile focused on enterprise and leadership."),
    ("Arun Vale", "A fictional contributor writing about technology and organizational choices."),
    ("Leila North", "A demonstration writer exploring healthcare and public-interest design."),
    ("Rowan Bell", "A fictional editorial voice covering finance and investment themes."),
    ("Nia Brooks", "A demonstration contributor interested in entrepreneurship and work."),
    ("Sami Reyes", "A fictional writer examining industry and climate-aware operations."),
    ("Dev Shah", "A demonstration editor covering science and digital trust."),
    ("Ari Morgan", "A fictional contributor writing about markets and future-facing ideas."),
]

MAGAZINES = [
    ("global-business-outlook", "Global Business Outlook 2026", "Strategy for a world in motion", "business", "global", "01", 12),
    ("future-of-artificial-intelligence", "Future of Artificial Intelligence", "People, systems and responsible choices", "technology", "asia-pacific", "02", 28),
    ("global-leaders-and-innovators", "Global Leaders & Innovators", "A collection of considered conversations", "leadership", "europe", "03", 47),
    ("digital-finance-review", "The Digital Finance Review", "Trust and change in financial services", "finance", "global", "04", 66),
    ("healthcare-innovation-report", "Healthcare Innovation Report", "Care shaped around people", "healthcare", "asia-pacific", "05", 85),
    ("sustainable-industry-today", "Sustainable Industry Today", "Building resilience with intention", "sustainability", "europe", "06", 104),
    ("women-in-global-leadership", "Women in Global Leadership", "Different paths, shared questions", "leadership", "global", "07", 123),
    ("future-of-entrepreneurship", "The Future of Entrepreneurship", "Making room for the next idea", "entrepreneurship", "americas", "08", 142),
    ("cybersecurity-and-digital-trust", "Cybersecurity and Digital Trust", "A practical guide to better questions", "technology", "global", "09", 161),
    ("global-markets-and-investment", "Global Markets and Investment", "Signals, uncertainty and perspective", "markets", "americas", "10", 180),
    ("technology-visionaries", "Technology Visionaries", "Designing useful digital futures", "technology", "asia-pacific", "11", 199),
    ("next-generation-manufacturing", "Next Generation Manufacturing", "People and precision on the factory floor", "manufacturing", "europe", "12", 218),
    ("science-health-and-society", "Science, Health & Society", "Discovery in its human context", "science", "asia-pacific", "13", 237),
    ("emerging-business-markets", "Emerging Business Markets", "Local context, global questions", "business", "africa", "14", 256),
    ("executive-leadership-annual", "Executive Leadership Annual", "A year of thoughtful leadership", "leadership", "global", "15", 275),
    ("digital-transformation-review", "Digital Transformation Review", "From ambition to deliberate practice", "technology", "global", "16", 294),
]

ARTICLES = [
    ("How Generative AI Is Transforming Enterprise Operations", "technology", "A practical look at where new tools can help, where judgment remains essential, and how teams can begin with clear questions.", "A hypothetical operations team might begin with one repeatable task, compare assisted and unassisted workflows, and keep a person accountable for the final decision."),
    ("The Future of Global Business Leadership", "leadership", "Leadership is less about predicting every turn and more about helping teams make thoughtful decisions with incomplete information.", "A fictional leadership team can make its assumptions visible, invite challenge early, and explain how a decision may be revisited."),
    ("Five Technology Trends Shaping the Next Decade", "technology", "Rather than chase every new product, organizations can look for durable shifts in how people work, connect and make decisions.", "The useful question for a planning group is not which trend will win, but which capabilities would help it adapt if conditions change."),
    ("Building Sustainable and Resilient Supply Chains", "sustainability", "Resilience begins with understanding dependencies and making trade-offs explicit before disruption forces a rushed response.", "A tabletop exercise can help a fictional procurement team map critical inputs, alternative routes and the consequences of changing suppliers."),
    ("Digital Banking and the Future of Financial Services", "finance", "Convenience, trust and human support are connected design choices in a changing financial-services experience.", "A service-design team can examine a journey from first question to resolution and find where a customer needs a clear explanation or human assistance."),
    ("Healthcare Innovation and Intelligent Diagnostics", "healthcare", "New diagnostic tools should be considered alongside clinical context, accessibility, workflow and the experience of care.", "A fictional care team can evaluate a proposed tool by asking what information it needs, who reviews its output and how uncertainty is communicated."),
    ("Cybersecurity Challenges for Growing Businesses", "technology", "Security practice can grow with a business when responsibilities, access and incident communication are discussed in plain language.", "A small organization can start by mapping its essential services, naming decision owners and rehearsing a calm response to a service interruption."),
    ("Women Entrepreneurs Reshaping Global Markets", "entrepreneurship", "Entrepreneurial paths are varied, and the conditions that help a venture grow deserve as much attention as the founder story.", "A founder-support network can compare access to mentorship, customers and operational knowledge without reducing different experiences to a single template."),
    ("The Rise of Smart Manufacturing", "manufacturing", "Connected production systems create opportunities to improve visibility while raising questions about people, maintenance and data stewardship.", "A plant team can test a small operational improvement and consider how it changes the work of operators, technicians and managers."),
    ("Data Analytics and Modern Business Decisions", "business", "Useful analytics make assumptions legible and help decision-makers understand both the signal and the limits of a dataset.", "A fictional business review can pair a chart with the question it is meant to answer, the data it excludes and the decision that may follow."),
    ("Responsible AI and Enterprise Governance", "technology", "Responsible use is a working practice: define an owner, identify affected people and agree on how concerns will be handled.", "A cross-functional review can document intended use, foreseeable failure modes and a process for pausing a tool when evidence changes."),
    ("Climate Technology and Sustainable Investment", "sustainability", "Investment conversations become more useful when they distinguish a stated ambition from the evidence and operating choices behind it.", "A fictional investment committee can ask which assumptions are most sensitive and what information would change its view."),
    ("Designing Better Digital Health Experiences", "healthcare", "Digital health services work best when the interface reflects the realities of care, including time pressure and different levels of access.", "A design team can test a care journey with representative tasks and make room for people who prefer or require non-digital support."),
    ("A More Human Approach to Financial Inclusion", "finance", "Financial products can be evaluated by how well people understand the choices available to them, not only by how quickly they can sign up.", "A fictional product team can review language, timing and recourse with people who bring different needs to the service."),
    ("Entrepreneurship Beyond the Pitch Deck", "entrepreneurship", "Building a venture includes patient operational work that is easy to miss when attention centers only on fundraising narratives.", "A founder can use a weekly review to separate customer learning, cash planning and team capacity instead of treating growth as one number."),
    ("Circular Design in Modern Industry", "sustainability", "Circular design asks teams to consider repair, reuse and material choices before a product reaches the end of its first use.", "A product group can sketch the life of a component across several owners and identify where better design information would help."),
    ("Making Research More Accessible to the Public", "science", "Clear communication helps people understand what a study asks, what it cannot answer and why the distinction matters.", "An editorial review can replace unexplained terminology with concrete context while preserving the limits of the original work."),
    ("The Changing Role of the Chief Executive", "leadership", "The executive role combines direction-setting with the less visible work of listening, prioritizing and making trade-offs understandable.", "A fictional executive team can use a decision log to show how priorities were chosen and which signals could prompt a review."),
    ("Regional Perspectives on Emerging Markets", "markets", "A regional lens can reveal local context that disappears when diverse economies are described as a single category.", "A writer can frame each market on its own terms and make clear which questions require local reporting rather than broad inference."),
    ("Building Trust into Digital Products", "technology", "Trust is shaped by product behavior, clear choices and an honest explanation of what happens when a user needs help.", "A product team can test whether people can predict the outcome of an action before they confirm it."),
    ("The People Behind Precision Manufacturing", "manufacturing", "Reliable production depends on skilled people, clear processes and tools designed around the work that actually takes place.", "A fictional operations review can invite frontline staff to describe handoffs and recurring friction before proposing a new system."),
    ("What Makes a More Resilient Organization?", "business", "Resilience is not a promise that plans will never fail; it is the ability to notice change and respond without losing sight of purpose.", "A leadership group can identify which decisions are reversible, who needs to be consulted and how it will learn from an unexpected result."),
    ("Science Communication in a Noisy Information Age", "science", "Careful science communication separates established evidence, open questions and practical implications without overstating certainty.", "An editor can make uncertainty visible by distinguishing what is known from what remains under investigation."),
    ("Rethinking the Customer Experience in Banking", "finance", "A thoughtful banking experience helps people understand their options and reach support when the ordinary path does not fit.", "A fictional service team can map a customer journey around questions and resolution rather than internal department boundaries."),
    ("The Next Generation of Health Research", "healthcare", "Research design benefits when it considers who can participate, what outcomes matter and how results will be explained.", "A research group can review its study materials for clarity and discuss what follow-up participants may reasonably expect."),
    ("Small Business, Big Questions: Planning for Change", "entrepreneurship", "Smaller organizations can make useful plans without pretending to know exactly what the next year will bring.", "A small team can identify a few plausible scenarios and agree on the observations that would lead it to adjust course."),
    ("Investment Thinking for a Long Horizon", "markets", "A long horizon can encourage careful questions about uncertainty, stewardship and the difference between a thesis and a guarantee.", "A fictional committee can record the conditions behind its investment view and revisit them when those conditions shift."),
    ("Designing a Thoughtful Digital Workplace", "technology", "Digital workplace choices affect focus, collaboration and the boundaries people need to do sustained work.", "A team can evaluate a new collaboration practice by asking whose work becomes easier, whose becomes harder and how it can tell."),
    ("The Future of Sustainable Materials", "sustainability", "Material decisions connect product performance, supply context and the practical realities of reuse or repair.", "A design review can compare alternatives against stated needs and document what remains unknown about each option."),
    ("Leadership Lessons from Research Teams", "leadership", "Research teams often balance curiosity with rigor, making their coordination practices a useful subject for an editorial conversation.", "A fictional research group can clarify who decides when evidence is incomplete and how dissenting observations are preserved."),
]

LEADERS = [
    ("Avery Example", "Technology founder", "Northstar Systems (fictional)", "technology", 0),
    ("Jordan Sample", "Healthcare innovator", "Harborlight Health Lab (fictional)", "healthcare", 5),
    ("Casey Placeholder", "Finance executive", "Cedarline Capital Studio (fictional)", "finance", 4),
    ("Riley Fiction", "Manufacturing director", "Forgeway Works (fictional)", "manufacturing", 8),
    ("Taylor Demo", "Sustainability strategist", "Morrow Circular Design (fictional)", "sustainability", 3),
    ("Morgan Example", "Entrepreneur", "Brightwell Venture House (fictional)", "entrepreneurship", 7),
    ("Quinn Sample", "Research lead", "Lumen Field Institute (fictional)", "science", 16),
    ("Skyler Fiction", "Digital trust specialist", "Kindred Signal Group (fictional)", "technology", 6),
    ("Reese Placeholder", "Market analyst", "Openwater Market Studio (fictional)", "markets", 18),
    ("Drew Demo", "Leadership coach", "Common Ground Practice (fictional)", "leadership", 1),
    ("Parker Example", "Product designer", "Daymark Product Lab (fictional)", "business", 9),
    ("Blair Sample", "Health research director", "Juniper Care Collaborative (fictional)", "healthcare", 24),
]

SECTION_TITLES = [
    ("Leadership & Interviews", "leadership"),
    ("Healthcare & Science", "healthcare"),
    ("Business & Markets", "business"),
    ("AI & Technology", "technology"),
    ("Innovation & Sustainability", "sustainability"),
    ("Finance & Investment", "finance"),
    ("Entrepreneurship", "entrepreneurship"),
    ("Industry & Manufacturing", "manufacturing"),
]

PARTNERS = [
    "DEMO SEED: Northstar Learning Collective",
    "DEMO SEED: Cedar & Tide Studio",
    "DEMO SEED: Openfield Research Network",
    "DEMO SEED: Common Ground Forum",
]


def build_reader_demo_pdf():
    page_copy = [
        "THE EDITORIAL - FICTIONAL READER DEMONSTRATION",
        "DEMONSTRATION PAGE TWO - Use the reader controls to turn this page.",
    ]
    page_count = 2
    font_object = 3 + page_count * 2
    objects = {
        1: b"<< /Type /Catalog /Pages 2 0 R >>",
        2: (
            f"<< /Type /Pages /Kids [{' '.join(f'{3 + index} 0 R' for index in range(page_count))}] "
            f"/Count {page_count} >>"
        ).encode(),
        font_object: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    }
    for index, text in enumerate(page_copy):
        page_object = 3 + index
        content_object = 3 + page_count + index
        escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content = f"BT /F1 18 Tf 54 720 Td ({escaped}) Tj ET".encode("ascii")
        objects[page_object] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 {font_object} 0 R >> >> "
            f"/Contents {content_object} 0 R >>"
        ).encode()
        objects[content_object] = (
            f"<< /Length {len(content)} >>\nstream\n".encode()
            + content
            + b"\nendstream"
        )

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for object_number in sorted(objects):
        offsets.append(len(pdf))
        pdf.extend(f"{object_number} 0 obj\n".encode() + objects[object_number] + b"\nendobj\n")
    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n".encode()
    )
    return ContentFile(bytes(pdf), name="demo-reader-sample.pdf")


class Command(BaseCommand):
    help = "Create or remove clearly marked, fictional demonstration content (development only)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--cleanup",
            action="store_true",
            help="Remove only this command's reserved demo records; never removes users or real content.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Demo data can only be managed while DJANGO_DEBUG=True.")
        if options["cleanup"]:
            self.cleanup_demo_data()
            return
        with transaction.atomic():
            self.seed_demo_data()
        self.stdout.write(
            self.style.SUCCESS(
                "Demo data ready: 17 magazine issues (including one two-page reader sample), "
                "30 articles, 12 fictional leader profiles, "
                "8 editorial sections, 4 fictional partners, 8 fictional demo ad campaigns, "
                "and 24 reserved test newsletter records."
            )
        )

    def seed_demo_data(self):
        categories = {}
        for slug, name, description in CATEGORIES:
            category, _ = self.get_or_create_demo(
                Category,
                slug=f"demo-category-{slug}",
                defaults={"name": name, "description": f"DEMONSTRATION CATEGORY — {description}"},
            )
            categories[slug] = category

        editions = {}
        for slug, name, region in EDITIONS:
            editions[slug], _ = self.get_or_create_demo(
                Edition,
                slug=f"demo-edition-{slug}",
                defaults={"name": name, "region": region},
            )

        authors = []
        for index, (name, bio) in enumerate(AUTHORS, start=1):
            author, _ = self.get_or_create_demo(
                Author,
                slug=f"demo-author-{index:02d}",
                defaults={
                    "name": f"Demo Desk {index:02d}",
                    "bio": f"FICTIONAL DEMONSTRATION AUTHOR — {bio}",
                },
            )
            authors.append(author)

        magazines = {}
        for slug, title, subtitle, category, edition, issue, days_ago in MAGAZINES:
            magazine, _ = self.get_or_create_demo(
                Magazine,
                slug=f"demo-magazine-{slug}",
                defaults={
                    "title": title,
                    "subtitle": f"Demonstration edition — {subtitle}",
                    "description": (
                        f"Fictional demonstration edition for local review. {subtitle}. "
                        "No PDF is included; upload reviewed editorial material before launch."
                    ),
                    "issue_number": issue,
                    "edition": editions[edition],
                    "category": categories[category],
                    "is_featured": issue == "01",
                    "is_published": True,
                    "publication_date": timezone.localdate() - timedelta(days=days_ago),
                    "meta_description": f"Demonstration edition: {title}. Illustrative content for local evaluation.",
                    "cover_alt_text": f"CSS-generated demonstration cover for {title}",
                },
            )
            magazines[slug] = magazine

        reader_sample, _ = self.get_or_create_demo(
            Magazine,
            slug="demo-magazine-reader-sample",
            defaults={
                "title": "Digital Reader Demonstration",
                "subtitle": "A short, original sample for testing reader controls",
                "description": (
                    "An original, fictional two-page PDF created only to preview the digital reader. "
                    "It is not a real magazine issue or editorial report."
                ),
                "issue_number": "DEMO",
                "edition": editions["global"],
                "category": categories["business"],
                "pdf_file": build_reader_demo_pdf(),
                "allow_download": True,
                "is_published": True,
                "publication_date": timezone.localdate(),
                "publisher_name": "THE GLOBAL ICON demonstration desk",
                "meta_description": "A fictional two-page PDF for previewing the digital magazine reader.",
                "cover_alt_text": "Fictional digital reader demonstration cover",
            },
        )
        magazines["reader-sample"] = reader_sample

        articles = {}
        for index, (title, category, excerpt, scenario) in enumerate(ARTICLES):
            author = authors[index % len(authors)]
            slug = f"demo-article-{index + 1:02d}"
            article, _ = self.get_or_create_demo(
                Article,
                slug=slug,
                defaults={
                    "title": title,
                    "excerpt": f"DEMONSTRATION COPY — {excerpt}",
                    "body": (
                        f"{excerpt}\n\n"
                        f"{scenario}\n\n"
                        "This original demonstration essay is a thought exercise, not reported "
                        "research or a claim about an actual person, organization or event. "
                        "Replace it with reviewed editorial work before public use."
                    ),
                    "author": author,
                    "category": categories[category],
                    "status": Article.Status.PUBLISHED,
                    "is_featured": index < 4,
                    "published_at": timezone.now() - timedelta(days=index * 3),
                    "meta_description": f"Demonstration editorial: {title}.",
                },
            )
            articles[slug] = article

        for index, (name, designation, organization, category, article_index) in enumerate(LEADERS, start=1):
            article = articles[f"demo-article-{article_index + 1:02d}"]
            magazine = list(magazines.values())[article_index % len(magazines)]
            self.get_or_create_demo(
                FeaturedLeader,
                slug=f"demo-leader-{index:02d}",
                defaults={
                    "name": name,
                    "designation": designation,
                    "organization": organization,
                    "introduction": (
                        f"FICTIONAL DEMONSTRATION PROFILE. {name} and {organization} are invented "
                        "for this local website preview. This profile is not a real interview or biography."
                    ),
                    "category": categories[category],
                    "article": article,
                    "magazine": magazine,
                    "publication_date": timezone.localdate() - timedelta(days=index * 9),
                    "is_published": True,
                    "is_featured": index <= 4,
                    "display_order": index,
                },
            )

        for index, (title, category_slug) in enumerate(SECTION_TITLES, start=1):
            category = categories[category_slug]
            section, created = self.get_or_create_demo(
                HomepageSection,
                title=f"DEMO — {title}",
                category=category,
                defaults={
                    "subtitle": "Illustrative demonstration dispatches; replace with reviewed editorial content.",
                    "display_order": index + 2,
                    "is_visible": True,
                },
            )
            if created:
                selected = Article.objects.filter(
                    slug__startswith="demo-article-",
                    category=category,
                ).order_by("published_at")[:3]
                section.featured_articles.set(selected)

        for index, name in enumerate(PARTNERS, start=1):
            self.get_or_create_demo(
                PartnerOrganization,
                name=name,
                defaults={"display_order": index, "is_visible": True},
            )

        demo_placements = [
            Advertisement.Placement.HOMEPAGE_BANNER,
            Advertisement.Placement.HOMEPAGE_SIDEBAR,
            Advertisement.Placement.MAGAZINE_SIDEBAR,
            Advertisement.Placement.READER_SIDEBAR,
            Advertisement.Placement.BETWEEN_SECTIONS,
            Advertisement.Placement.RELATED_MAGAZINES,
            Advertisement.Placement.NEWSLETTER,
            Advertisement.Placement.FEATURED_PARTNER,
        ]
        for index, placement in enumerate(demo_placements, start=1):
            self.get_or_create_demo(
                Advertisement,
                campaign_identifier=f"DEMO-CAMPAIGN-{index:02d}",
                defaults={
                    "title": f"DEMO — Explore an idea for {placement.label.lower()}",
                    "advertiser": "Fictional demo advertiser",
                    "description": (
                        "Illustrative sample placement only. This is not a real advertiser, "
                        "paid campaign or endorsement."
                    ),
                    "destination_url": f"https://example.test/demo-promotion-{index:02d}",
                    "placement": placement,
                    "is_active": True,
                    "display_priority": 10,
                    "alt_text": "Fictional demonstration advertisement",
                    "cta_label": "View demo promotion",
                    "track_impressions": True,
                    "track_clicks": True,
                    "is_demo": True,
                },
            )

        for index in range(1, 25):
            self.get_or_create_demo(
                NewsletterSubscriber,
                email=f"demo-seed-reader-{index:02d}@example.test",
                defaults={
                    "consented_at": timezone.now() - timedelta(days=index),
                    "is_active": True,
                },
            )

        config, created = SiteConfiguration.objects.get_or_create(
            pk=1,
            defaults={
                "site_name": "THE GLOBAL ICON",
                "tagline": "Stories That Shape Tomorrow.",
                "hero_title": "Stories That Shape Tomorrow.",
                "hero_copy": "Discover the people, ideas, and innovations shaping our world.",
                "newsletter_heading": "The week, in perspective.",
                "newsletter_copy": "Thoughtful reads and new editions, delivered to your inbox.",
            },
        )
        changed_fields = []
        if created:
            config.featured_article = articles["demo-article-01"]
            config.featured_magazine = magazines["global-business-outlook"]
            config.save(update_fields=["featured_article", "featured_magazine", "updated_at"])

    def get_or_create_demo(self, model, **kwargs):
        record, created = model.objects.get_or_create(**kwargs)
        if created:
            DemoSeedRecord.objects.create(
                model_name=model._meta.label_lower,
                object_id=record.pk,
            )
        elif not DemoSeedRecord.objects.filter(
            model_name=model._meta.label_lower,
            object_id=record.pk,
        ).exists():
            raise CommandError(
                f"Reserved demo identifier already exists for {model._meta.verbose_name}; "
                "refusing to adopt or modify it."
            )
        return record, created

    def marked_ids(self, model):
        return DemoSeedRecord.objects.filter(
            model_name=model._meta.label_lower,
        ).values_list("object_id", flat=True)

    def delete_marked(self, model):
        ids = list(self.marked_ids(model))
        if ids:
            for record in model.objects.filter(pk__in=ids):
                for field in record._meta.concrete_fields:
                    if isinstance(field, models.FileField):
                        stored_file = getattr(record, field.name)
                        if stored_file:
                            stored_file.storage.delete(stored_file.name)
            model.objects.filter(pk__in=ids).delete()
            DemoSeedRecord.objects.filter(
                model_name=model._meta.label_lower,
                object_id__in=ids,
            ).delete()

    def cleanup_demo_data(self):
        with transaction.atomic():
            demo_articles = Article.objects.filter(pk__in=self.marked_ids(Article))
            demo_magazines = Magazine.objects.filter(pk__in=self.marked_ids(Magazine))
            demo_categories = Category.objects.filter(pk__in=self.marked_ids(Category))
            demo_editions = Edition.objects.filter(pk__in=self.marked_ids(Edition))
            demo_authors = Author.objects.filter(pk__in=self.marked_ids(Author))
            if FeaturedLeader.objects.exclude(pk__in=self.marked_ids(FeaturedLeader)).filter(
                Q(article__in=demo_articles) | Q(magazine__in=demo_magazines) | Q(category__in=demo_categories)
            ).exists():
                raise CommandError("A non-demo leader references demo content; remove that reference before cleanup.")
            if HomepageSection.objects.exclude(pk__in=self.marked_ids(HomepageSection)).filter(
                Q(category__in=demo_categories) | Q(featured_articles__in=demo_articles)
            ).exists():
                raise CommandError("A non-demo homepage section references demo content; remove that reference before cleanup.")
            if Article.objects.exclude(pk__in=self.marked_ids(Article)).filter(
                Q(category__in=demo_categories) | Q(author__in=demo_authors)
            ).exists():
                raise CommandError("A non-demo article references demo content; remove that reference before cleanup.")
            if Magazine.objects.exclude(pk__in=self.marked_ids(Magazine)).filter(
                Q(category__in=demo_categories) | Q(edition__in=demo_editions)
            ).exists():
                raise CommandError("A non-demo magazine references demo content; remove that reference before cleanup.")
            if SavedContent.objects.filter(
                Q(article__in=demo_articles) | Q(magazine__in=demo_magazines)
            ).exists() or ReadingHistory.objects.filter(
                Q(article__in=demo_articles) | Q(magazine__in=demo_magazines)
            ).exists():
                raise CommandError(
                    "A reader saved or viewed demo content; remove those personal records before cleanup."
                )
            demo_advertisements = Advertisement.objects.filter(pk__in=self.marked_ids(Advertisement))
            if AdvertisementEvent.objects.filter(advertisement__in=demo_advertisements).exists():
                raise CommandError(
                    "A demo campaign has recorded advertisement events; export or remove those events before cleanup."
                )

            self.delete_marked(FeaturedLeader)
            self.delete_marked(HomepageSection)
            self.delete_marked(Advertisement)
            self.delete_marked(Article)
            self.delete_marked(Magazine)
            self.delete_marked(Author)
            self.delete_marked(PartnerOrganization)
            self.delete_marked(NewsletterSubscriber)
            self.delete_marked(Edition)
            self.delete_marked(Category)
        self.stdout.write(self.style.SUCCESS("Removed reserved demo-seed records only."))
