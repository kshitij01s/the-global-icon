import re
from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import ClientEnquiry, Magazine, NewsletterSubscriber, ReaderPreference


User = get_user_model()


class NewsletterSignupForm(forms.ModelForm):
    consent = forms.BooleanField(
        required=True,
        label="I agree to receive editorial emails. I can unsubscribe at any time.",
    )

    class Meta:
        model = NewsletterSubscriber
        fields = ["email"]
        widgets = {"email": forms.EmailInput(attrs={"autocomplete": "email", "placeholder": "Email address"})}

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        existing = NewsletterSubscriber.objects.filter(email__iexact=email).first()
        if existing and existing.is_active:
            raise ValidationError("This email is already subscribed.")
        return email

    def save(self, commit=True):
        subscriber = NewsletterSubscriber.objects.filter(email__iexact=self.cleaned_data["email"]).first()
        if subscriber is None:
            subscriber = NewsletterSubscriber(email=self.cleaned_data["email"])
            if commit:
                subscriber.save()
        else:
            subscriber.is_active = True
            subscriber.consented_at = timezone.now()
            subscriber.unsubscribed_at = None
            if commit:
                subscriber.save(update_fields=["is_active", "consented_at", "unsubscribed_at"])
        return subscriber


class MagazineUploadForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["pdf_file"].required = True

    review_status = forms.ChoiceField(
        choices=(
            (Magazine.ReviewStatus.DRAFT, Magazine.ReviewStatus.DRAFT.label),
            (Magazine.ReviewStatus.IN_REVIEW, Magazine.ReviewStatus.IN_REVIEW.label),
        ),
        initial=Magazine.ReviewStatus.IN_REVIEW,
    )

    class Meta:
        model = Magazine
        fields = (
            "title",
            "slug",
            "subtitle",
            "description",
            "issue_number",
            "publication_date",
            "category",
            "edition",
            "publisher_name",
            "cover",
            "cover_alt_text",
            "pdf_file",
            "access",
            "allow_download",
            "review_status",
        )
        widgets = {
            "description": forms.Textarea(attrs={"rows": 5}),
            "publication_date": forms.DateInput(attrs={"type": "date"}),
        }

    def clean_cover(self):
        cover = self.cleaned_data.get("cover")
        if cover and cover.size > 10 * 1024 * 1024:
            raise ValidationError("Cover images must be 10 MB or smaller.")
        return cover


class ReaderProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ("first_name", "last_name", "email")
        widgets = {
            "first_name": forms.TextInput(attrs={"autocomplete": "given-name"}),
            "last_name": forms.TextInput(attrs={"autocomplete": "family-name"}),
            "email": forms.EmailInput(attrs={"autocomplete": "email"}),
        }


class ReaderRegistrationForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "email")

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError("An account with this email address already exists.")
        return email


class ClientEnquiryForm(forms.ModelForm):
    submission_token = forms.UUIDField(widget=forms.HiddenInput)
    website_confirm = forms.CharField(
        required=False,
        label="Leave this field empty",
        widget=forms.TextInput(
            attrs={"tabindex": "-1", "autocomplete": "off", "aria-hidden": "true"}
        ),
    )

    class Meta:
        model = ClientEnquiry
        fields = (
            "full_name",
            "company",
            "email",
            "phone",
            "job_title",
            "website",
            "country_or_region",
            "enquiry_type",
            "subject",
            "message",
            "estimated_budget",
            "preferred_contact",
            "preferred_follow_up_time",
        )
        widgets = {
            "message": forms.Textarea(attrs={"rows": 6, "maxlength": "5000"}),
            "estimated_budget": forms.TextInput(
                attrs={"autocomplete": "off", "maxlength": "100"}
            ),
            "preferred_follow_up_time": forms.TextInput(
                attrs={"maxlength": "120", "placeholder": "Your local time zone, if helpful"}
            ),
        }

    def clean_email(self):
        return self.cleaned_data["email"].strip().lower()

    def clean_phone(self):
        phone = self.cleaned_data.get("phone", "").strip()
        if phone:
            digits = sum(character.isdigit() for character in phone)
            if not re.fullmatch(r"[+0-9().\-\s]{7,32}", phone) or not 7 <= digits <= 15:
                raise ValidationError("Enter a valid phone number, including its country code if known.")
        return phone

    def clean(self):
        cleaned_data = super().clean()
        if cleaned_data.get("enquiry_type") != ClientEnquiry.EnquiryType.ADVERTISING:
            cleaned_data["estimated_budget"] = ""
        if cleaned_data.get("website_confirm"):
            raise ValidationError("Unable to process this submission.")
        return cleaned_data


class ReaderPreferenceForm(forms.ModelForm):
    class Meta:
        model = ReaderPreference
        fields = ("preferred_categories", "notify_followed_publications")
        widgets = {"preferred_categories": forms.CheckboxSelectMultiple}
