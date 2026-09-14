import { activeAdminTab } from '@/app/admin/AdminNav';

test('the dashboard tab is active on the admin root', () => {
  expect(activeAdminTab('/admin')).toBe('dashboard');
});

test('the dashboard tab stays active on a member drill-down', () => {
  expect(activeAdminTab('/admin/member/2b1c0d5e-0000-4000-8000-000000000000')).toBe('dashboard');
});

test('the members tab is active on the roster', () => {
  expect(activeAdminTab('/admin/members')).toBe('members');
});

// /admin/members starts with /admin/member, so a naive prefix check lights the
// dashboard tab on the roster page. Guard that.
test('the roster does not read as a member drill-down', () => {
  expect(activeAdminTab('/admin/members')).not.toBe('dashboard');
});

test('no tab is active outside the admin area', () => {
  expect(activeAdminTab('/today')).toBeNull();
});
