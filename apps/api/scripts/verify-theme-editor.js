/** One-shot verification of theme + page editor APIs. Not a unit test. */
async function main() {
  const base = 'http://localhost:4000/api';
  const out = {};
  const health = await fetch(`${base}/health`).then((r) => r.json());
  out.health = health.status;
  const themes = await fetch(`${base}/themes`).then((r) => r.json());
  out.themeCount = themes.length;
  out.themeKinds = [...new Set(themes.map((t) => t.kind))];
  const active = await fetch(`${base}/themes/active`).then((r) => r.json());
  out.active = {
    slug: active.slug,
    source: active.source,
    allowReader: active.allowReaderPreference,
    rules: active.priorityRules?.length,
  };
  const pageRes = await fetch(`${base}/pages/home`);
  const pageBody = await pageRes.json();
  out.homePage = { status: pageRes.status, slug: pageBody.slug };

  async function login(id, pw) {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: id, password: pw }),
    });
    const data = await res.json();
    return {
      ok: res.ok,
      token: data.accessToken,
      roles: data.user?.roles,
      perms: data.user?.permissions || [],
    };
  }

  const sa = await login('superadmin', 'SuperAdmin123!');
  const ad = await login('admin', 'Admin123456!');
  out.saLogin = {
    ok: sa.ok,
    roles: sa.roles,
    hasThemesManage: sa.perms.includes('themes.manage'),
    hasPagesPublish: sa.perms.includes('pages.publish'),
  };
  out.adLogin = {
    ok: ad.ok,
    roles: ad.roles,
    hasThemesManage: ad.perms.includes('themes.manage'),
    hasPagesEdit: ad.perms.includes('pages.edit'),
    hasPagesPublish: ad.perms.includes('pages.publish'),
  };

  const h = (t) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });
  out.unauthOverview = (await fetch(`${base}/admin/themes/overview`)).status;
  out.saOverview = (await fetch(`${base}/admin/themes/overview`, { headers: h(sa.token) })).status;

  out.adminGlobalDenied = (
    await fetch(`${base}/admin/themes/global`, {
      method: 'POST',
      headers: h(ad.token),
      body: JSON.stringify({ slug: 'classic-light' }),
    })
  ).status;
  out.adminPages = (await fetch(`${base}/admin/pages`, { headers: h(ad.token) })).status;
  out.adminPublishDenied = (
    await fetch(`${base}/admin/pages/home/publish`, {
      method: 'POST',
      headers: h(ad.token),
      body: '{}',
    })
  ).status;

  const ov = await fetch(`${base}/admin/themes/override`, {
    method: 'POST',
    headers: h(sa.token),
    body: JSON.stringify({ slug: 'festival-christmas' }),
  });
  const afterOv = await fetch(`${base}/themes/active`).then((r) => r.json());
  out.override = {
    status: ov.status,
    slug: afterOv.slug,
    source: afterOv.source,
    effects: !!afterOv.effects?.snowfall,
  };
  await fetch(`${base}/admin/themes/override`, {
    method: 'POST',
    headers: h(sa.token),
    body: JSON.stringify({ slug: null }),
  });

  const content = {
    heroEyebrow: 'An international editorial house',
    heroTitle: 'THE GLOBAL ICON',
    heroTagline: 'Stories That Shape Tomorrow.',
    turnPagesHeadline: 'Turn the pages of the moment',
    turnPagesCopy:
      'Discover global stories, influential people, ideas, and publications shaping international business, leadership, and culture.',
    ctaMagazines: 'Explore Magazines',
    ctaStories: 'Discover Stories',
    sectionsVisible: { featured: true, latest: true, stories: true, leaders: true },
  };
  out.draftSave = (
    await fetch(`${base}/admin/pages/home`, {
      method: 'PATCH',
      headers: h(sa.token),
      body: JSON.stringify({
        title: 'Homepage',
        description: 'Hero and editorial homepage content.',
        content,
      }),
    })
  ).status;
  out.publish = (
    await fetch(`${base}/admin/pages/home/publish`, {
      method: 'POST',
      headers: h(sa.token),
      body: '{}',
    })
  ).status;

  await fetch(`${base}/admin/themes/global`, {
    method: 'POST',
    headers: h(sa.token),
    body: JSON.stringify({ slug: 'midnight-dark' }),
  });
  const finalActive = await fetch(`${base}/themes/active`).then((r) => r.json());
  out.finalActive = finalActive.slug;

  const schedules = await fetch(`${base}/admin/themes/overview`, { headers: h(sa.token) }).then((r) =>
    r.json(),
  );
  out.scheduleCount = schedules.schedules?.length;
  out.historyCount = schedules.history?.length;
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
