/* A fictional terms of service, a revised version for the Compare page, and offline summary text. */
var SAMPLE_TOS = `CLOUDNEST TERMS OF SERVICE
Last updated: March 1, 2026

1. Acceptance. By creating an account or using the CloudNest services (the "Services"), you agree to be bound by these Terms. If you do not agree, do not use the Services.

2. Changes to Terms. CloudNest may modify these Terms at any time in its sole discretion. Continued use of the Services after changes are posted constitutes acceptance of the modified Terms.

3. Subscriptions and Billing. Paid plans are billed in advance. Your subscription will automatically renew for successive periods equal to the initial term unless you cancel at least thirty (30) days before the renewal date. All fees are non-refundable. Prices may change upon renewal with notice posted on our website.

4. Your Content. You retain ownership of files you upload ("Content"). You hereby grant CloudNest a worldwide, perpetual, irrevocable, royalty-free license to use, reproduce, modify and display your Content for the purpose of operating, promoting and improving the Services.

5. Privacy and Data. We collect usage data through cookies and similar tracking technologies. We may share your personal information with our partners and advertisers to provide personalized offers.

6. Termination. CloudNest may suspend or terminate your account at any time, for any reason, without prior notice. Upon termination, your Content may be permanently deleted.

7. Disclaimer of Warranties. THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE." CLOUDNEST DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED.

8. Limitation of Liability. In no event shall CloudNest's aggregate liability exceed the greater of fifty dollars ($50) or the amounts paid by you in the three (3) months preceding the claim.

9. Indemnification. You agree to indemnify and hold harmless CloudNest and its affiliates from any claims arising out of your use of the Services or your Content.

10. Dispute Resolution. Any dispute shall be resolved by binding arbitration on an individual basis. You waive any right to a jury trial or to participate in a class action or representative proceeding.

11. Governing Law. These Terms are governed by the laws of the State of Delaware, and the courts located in Wilmington, Delaware shall have exclusive jurisdiction.`;
var DEMO_SUM = {
  tldr: 'CloudNest stores your files, but the terms heavily favor the company: auto-renewing non-refundable billing (§3), a perpetual license to your content (§4), data sharing with advertisers (§5), and forced arbitration (§10).',
  you_agree_to: ['Terms can change anytime; using the service means you accept the changes (§2)', 'Your plan auto-renews unless you cancel 30 days early, with no refunds (§3)', 'CloudNest can use, modify and display your files forever, including for promotion (§4)', 'Your personal info may be shared with partners and advertisers (§5)', 'Your account and files can be deleted without notice (§6)', 'Disputes go to private arbitration; no class actions (§10)'],
  red_flags: [{ issue: 'Perpetual, irrevocable license to your content', clause: '§4', severity: 'high', why: 'Unusually broad for a storage service. It survives even if you leave.' }, { issue: 'Data shared with advertisers', clause: '§5', severity: 'high', why: 'Your files and identity may be used for ad targeting.' }, { issue: 'Termination without notice + deletion', clause: '§6', severity: 'high', why: 'You could lose files with no warning, so keep backups.' }, { issue: '30-day cancellation window on auto-renew', clause: '§3', severity: 'med', why: 'Easy to miss, and fees are non-refundable.' }, { issue: 'Liability capped at $50', clause: '§8', severity: 'med', why: 'Data loss compensation would be negligible.' }],
  questions_to_ask: ['Can the content license in §4 be limited to operating the service only?', 'Can I opt out of data sharing with advertisers (§5)?', 'Will I get notice and a chance to export files before termination (§6)?', 'Is there an arbitration opt-out window (§10)?'],
  fairness: 'Heavily one-sided. Fine for non-sensitive files with backups elsewhere, risky for anything important.',
};

var SAMPLE_TOS_V2 = `CLOUDNEST TERMS OF SERVICE
Last updated: September 15, 2026

1. Acceptance. By creating an account or using the CloudNest services (the "Services"), you agree to be bound by these Terms. If you do not agree, do not use the Services.

2. Changes to Terms. CloudNest may modify these Terms at any time in its sole discretion. Continued use of the Services after changes are posted constitutes acceptance of the modified Terms.

3. Subscriptions and Billing. Paid plans are billed in advance. Your subscription will automatically renew for successive periods equal to the initial term unless you cancel at least sixty (60) days before the renewal date. All fees are non-refundable, and an early termination fee of $25 applies. Prices may change upon renewal with notice posted on our website.

4. Your Content. You retain ownership of files you upload ("Content"). You grant CloudNest a limited license to store and display your Content solely to operate the Services. The license ends when you delete your Content.

5. Privacy and Data. We collect usage data through cookies and similar tracking technologies. We may share your personal information with our partners and advertisers to provide personalized offers.

6. Termination. CloudNest may suspend or terminate your account at any time, for any reason, without prior notice. Upon termination, your Content may be permanently deleted.

7. Disclaimer of Warranties. THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE." CLOUDNEST DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED.

8. Limitation of Liability. In no event shall CloudNest's aggregate liability exceed the greater of fifty dollars ($50) or the amounts paid by you in the three (3) months preceding the claim.

9. Account Security. You are responsible for keeping your password confidential and must notify us within seven (7) days of any unauthorized use.

10. Indemnification. You agree to indemnify and hold harmless CloudNest and its affiliates from any claims arising out of your use of the Services or your Content.

11. Dispute Resolution. Any dispute shall be resolved by binding arbitration on an individual basis. You waive any right to a jury trial or to participate in a class action or representative proceeding.

12. Governing Law. These Terms are governed by the laws of the State of Delaware, and the courts located in Wilmington, Delaware shall have exclusive jurisdiction.`;
