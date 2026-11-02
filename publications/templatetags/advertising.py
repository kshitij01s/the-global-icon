from django import template

from publications.advertising import eligible_advertisements


register = template.Library()


@register.inclusion_tag("publications/partials/ad_slot.html", takes_context=True)
def ad_slot(context, placement):
    advertisement = eligible_advertisements(placement).first()
    return {
        "advertisement": advertisement,
        "request": context.get("request"),
        "csrf_token": context.get("csrf_token"),
    }


@register.simple_tag
def has_eligible_ad(placement):
    return eligible_advertisements(placement).exists()
