const makeSample = ({ slug, title, type, score, summary, findings, clauses, risks }) => ({
  slug, title, type, score, file: `/samples/${slug}.txt`,
  analysis: {
    isSampleDemo: true,
    summary,
    overallRiskScore: score,
    clauses,
    risks,
    keyFindings: findings,
    recommendations: risks.map(risk => risk.recommendation)
  }
});

const sampleAnalyses = [
  makeSample({
    slug: 'software-services-agreement', title: 'Software Services Agreement', type: 'Commercial contract', score: 62,
    summary: 'This twelve-month software services agreement establishes a recurring managed-service relationship for a monthly fee of $2,500. It addresses payment, confidentiality, intellectual property, service performance, warranties, liability and termination. The commercial structure is workable, but it allocates substantial risk to the customer: ownership of custom deliverables remains with the provider, the liability cap is limited to three months of fees, and service commitments are not supported by measurable response or resolution targets. The customer should prioritize the intellectual-property, liability, data-security and service-level provisions before signing.',
    findings: ['Liability is capped at only three months of fees', 'Customer receives a limited license rather than ownership of custom deliverables', 'Invoices are due within a short 15-day period', 'No measurable uptime or support-response commitments', 'Data-security and incident-notification duties are not defined'],
    clauses: [
      { type: 'payment', text: 'Customer will pay $2,500 per month within 15 days of invoice.', riskLevel: 'medium', explanation: 'The payment window is relatively short.' },
      { type: 'liability', text: 'Provider liability will not exceed fees paid in the preceding three months.', riskLevel: 'high', explanation: 'The cap may be low compared with foreseeable losses.' },
      { type: 'intellectual_property', text: 'Provider retains ownership of all deliverables and grants Customer a non-exclusive license.', riskLevel: 'high', explanation: 'The customer does not own custom deliverables.' },
      { type: 'confidentiality', text: 'Each party will protect Confidential Information for three years after disclosure.', riskLevel: 'medium', explanation: 'Protection is mutual, though sensitive trade secrets may need longer protection.' },
      { type: 'termination', text: 'A material breach must be cured within ten days after notice.', riskLevel: 'medium', explanation: 'Ten days may be insufficient for complex technical remediation.' },
      { type: 'warranty', text: 'Services are provided substantially in accordance with the documentation.', riskLevel: 'medium', explanation: 'The warranty lacks an objective acceptance procedure and specific remedies.' }
      ,{ type: 'service_level', text: 'Provider will use commercially reasonable efforts to keep the service available.', riskLevel: 'high', explanation: 'The clause provides no uptime percentage, support response time, service credits, or termination right for repeated failures.' }
      ,{ type: 'data_protection', text: 'Provider may process Customer data as necessary to deliver the services.', riskLevel: 'high', explanation: 'The agreement does not establish security standards, subprocessors, breach notification, retention limits, or data-return obligations.' }
    ],
    risks: [
      { severity: 'high', category: 'legal', description: 'Customer receives only a non-exclusive license.', recommendation: 'Negotiate ownership or a perpetual transferable license.' },
      { severity: 'high', category: 'financial', description: 'Liability is capped at three months of fees.', recommendation: 'Seek a higher cap and appropriate carve-outs.' },
      { severity: 'medium', category: 'operational', description: 'No measurable support response times are stated.', recommendation: 'Add severity-based support and resolution targets.' },
      { severity: 'medium', category: 'compliance', description: 'The agreement lacks specific data-security obligations.', recommendation: 'Add security standards, incident notification, and data-return terms.' }
      ,{ severity: 'medium', category: 'commercial', description: 'Renewal pricing and fee increases are not controlled.', recommendation: 'Cap annual increases and require advance written notice before renewal.' }
    ]
  }),
  makeSample({
    slug: 'mutual-nda', title: 'Mutual Non-Disclosure Agreement', type: 'Confidentiality', score: 34,
    summary: 'This mutual non-disclosure agreement protects technical, commercial and business information exchanged by both parties for evaluation of a potential collaboration. Its core obligations are reciprocal, include conventional exclusions, and permit legally compelled disclosure after notice. The principal concern is a broad residual-knowledge provision that may allow personnel to use remembered concepts without restriction. The agreement also needs clearer treatment of personal data, return or destruction certification, permitted recipients and dispute jurisdiction.',
    findings: ['Confidentiality duties apply equally to both parties', 'Protection continues for three years after disclosure', 'Residual-knowledge wording materially weakens protection', 'Compelled-disclosure notice is included', 'Return and destruction procedures are incomplete'],
    clauses: [
      { type: 'confidentiality', text: 'Each party will protect Confidential Information for three years.', riskLevel: 'low', explanation: 'The obligation is mutual and time-limited.' },
      { type: 'other', text: 'Unaided memories of personnel may be used without restriction.', riskLevel: 'high', explanation: 'Residual knowledge language can be difficult to police.' },
      { type: 'other', text: 'Confidential Information excludes information independently developed without reference to disclosures.', riskLevel: 'low', explanation: 'This is a conventional and balanced exclusion.' },
      { type: 'other', text: 'Disclosure required by law is permitted after prompt notice where legally allowed.', riskLevel: 'low', explanation: 'The notice requirement gives the owner an opportunity to seek protection.' },
      { type: 'governing_law', text: 'The agreement is governed by the laws of Karnataka, India.', riskLevel: 'medium', explanation: 'The clause should also identify the courts with exclusive jurisdiction.' }
      ,{ type: 'permitted_disclosure', text: 'Information may be shared with employees and advisers who need to know it.', riskLevel: 'medium', explanation: 'Recipients should be bound by duties at least as protective, and the receiving party should remain responsible for their breaches.' }
      ,{ type: 'return_of_information', text: 'Confidential materials will be returned or destroyed upon written request.', riskLevel: 'medium', explanation: 'The clause does not specify a deadline, certification process, backup exception, or continuing protection for retained copies.' }
    ],
    risks: [
      { severity: 'high', category: 'legal', description: 'Residual knowledge may expose sensitive concepts.', recommendation: 'Remove or narrowly define the residual-knowledge exception.' },
      { severity: 'medium', category: 'compliance', description: 'Personal data is not addressed separately.', recommendation: 'Add data-protection obligations where disclosures contain personal data.' },
      { severity: 'medium', category: 'operational', description: 'No destruction-certification process is stated.', recommendation: 'Require written certification after return or destruction.' }
      ,{ severity: 'medium', category: 'legal', description: 'The governing-law clause does not identify an exclusive forum.', recommendation: 'Specify the courts or agreed dispute-resolution process to reduce procedural uncertainty.' }
    ]
  }),
  makeSample({
    slug: 'employment-offer', title: 'Employment Offer Letter', type: 'Employment', score: 48,
    summary: 'This employment offer sets out the employee’s title, annual base salary, probation period, benefits, confidentiality obligations, intellectual-property assignment and termination notice. Compensation is stated clearly, but variable pay and benefit entitlements remain dependent on policies that may change. The invention-assignment language is unusually broad because it does not protect pre-existing work or unrelated personal projects. The final employment documentation should clarify probation standards, leave and benefits, post-employment obligations, dispute procedures and the treatment of intellectual property.',
    findings: ['Base salary is clearly stated at ₹900,000 per annum', 'Six-month probation period needs objective confirmation criteria', 'Invention assignment may capture unrelated personal projects', 'Variable compensation is not documented', 'Benefits may be changed through company policy'],
    clauses: [
      { type: 'payment', text: 'Base salary is ₹900,000 per annum, subject to statutory deductions.', riskLevel: 'low', explanation: 'Compensation is clearly stated.' },
      { type: 'intellectual_property', text: 'Employee assigns all inventions conceived during employment.', riskLevel: 'high', explanation: 'The clause does not exclude unrelated personal projects.' },
      { type: 'termination', text: 'Employment may be terminated with thirty days notice after probation.', riskLevel: 'medium', explanation: 'Notice is stated, but payment in lieu and misconduct procedures are unclear.' },
      { type: 'confidentiality', text: 'Confidentiality obligations continue after employment ends.', riskLevel: 'medium', explanation: 'The duration and permitted disclosures should be defined.' },
      { type: 'other', text: 'Benefits are subject to company policies as amended from time to time.', riskLevel: 'medium', explanation: 'Material benefits may change without an individual amendment.' }
      ,{ type: 'probation', text: 'The employee will remain on probation for six months and may be confirmed at the company’s discretion.', riskLevel: 'medium', explanation: 'The clause does not state performance criteria, review timing, extension limits, or the notice applicable during probation.' }
      ,{ type: 'variable_compensation', text: 'The employee may be eligible for a performance bonus under company policy.', riskLevel: 'medium', explanation: 'Eligibility, target amount, performance measures, vesting and payment timing are not defined.' }
    ],
    risks: [
      { severity: 'high', category: 'legal', description: 'Personal projects may fall within the invention assignment.', recommendation: 'Add exclusions for pre-existing and unrelated inventions.' },
      { severity: 'medium', category: 'financial', description: 'Variable compensation is not defined.', recommendation: 'Document eligibility, targets, calculation, and payment dates.' },
      { severity: 'medium', category: 'compliance', description: 'Post-employment restrictions are not geographically or temporally bounded.', recommendation: 'Use only narrowly tailored restrictions permitted by applicable law.' }
      ,{ severity: 'medium', category: 'operational', description: 'Probation confirmation is entirely discretionary and has no documented review process.', recommendation: 'Add objective criteria, a review date, written confirmation, and clear notice terms.' }
    ]
  }),
  makeSample({
    slug: 'residential-lease', title: 'Residential Lease', type: 'Property', score: 57,
    summary: 'This twelve-month residential lease establishes the rent due date, security deposit, maintenance allocation, inspection rights, renewal and early termination. The basic payment obligations are understandable, but several operational protections are incomplete. Landlord access is not tied to a minimum notice period, minor repairs are undefined, and the deposit clause does not require an itemized deduction statement or repayment deadline. The parties should also document move-in condition, utilities, emergency repairs, renewal notice and consequences of delayed possession.',
    findings: ['Monthly rent is due by the fifth day', 'Security deposit equals two months of rent', 'Landlord inspection rights lack advance-notice requirements', 'Minor-repair responsibility has no monetary threshold', 'Deposit deductions and refund timing are unclear'],
    clauses: [
      { type: 'payment', text: 'Tenant will pay monthly rent on or before the fifth day.', riskLevel: 'low', explanation: 'The due date is clear.' },
      { type: 'other', text: 'Landlord may enter the premises at reasonable times for inspection.', riskLevel: 'medium', explanation: 'Advance notice is not specified.' },
      { type: 'termination', text: 'Tenant may terminate early by paying two months rent.', riskLevel: 'medium', explanation: 'The charge is clear but exceptions for uninhabitable conditions are absent.' },
      { type: 'other', text: 'Tenant is responsible for minor repairs and routine maintenance.', riskLevel: 'medium', explanation: 'Minor repairs are not defined by type or monetary threshold.' },
      { type: 'other', text: 'The security deposit may be deducted for damage beyond ordinary wear.', riskLevel: 'medium', explanation: 'An itemized statement and repayment deadline should be included.' }
      ,{ type: 'renewal', text: 'The lease may be renewed on terms mutually agreed before expiration.', riskLevel: 'medium', explanation: 'No notice window, renewal procedure, or method for determining revised rent is provided.' }
      ,{ type: 'utilities', text: 'Tenant will pay all utility and service charges relating to the premises.', riskLevel: 'medium', explanation: 'The clause should identify each utility, meter responsibility, shared charges, and unpaid balances existing before possession.' }
    ],
    risks: [
      { severity: 'medium', category: 'legal', description: 'Entry rights lack a minimum notice period.', recommendation: 'Require written notice except in emergencies.' },
      { severity: 'medium', category: 'financial', description: 'Deposit deductions lack an itemization deadline.', recommendation: 'Require an itemized statement and prompt refund of the balance.' },
      { severity: 'medium', category: 'operational', description: 'Maintenance responsibility is ambiguous.', recommendation: 'Allocate repairs by category and monetary threshold.' }
      ,{ severity: 'medium', category: 'financial', description: 'Renewal rent and notice requirements are not defined.', recommendation: 'Specify a renewal notice period and an objective rent-review mechanism.' }
    ]
  }),
  makeSample({
    slug: 'freelance-design-agreement', title: 'Freelance Design Agreement', type: 'Independent contractor', score: 71,
    summary: 'This freelance design agreement covers a 50/50 payment schedule, delivery of final files, revisions, intellectual-property ownership, originality warranties and cancellation. It presents significant commercial risk to the designer because ownership transfers upon file delivery rather than full payment, revisions continue until the client is satisfied, and cancellation does not trigger payment for completed work or reserved capacity. Acceptance criteria, delay responsibilities, third-party materials, portfolio rights and late-payment remedies should be made explicit before work begins.',
    findings: ['Ownership transfers before final payment is received', 'Unlimited revisions create uncontrolled scope', 'No cancellation or kill fee protects completed work', 'Acceptance criteria and approval deadlines are absent', 'Third-party assets are not allocated clearly'],
    clauses: [
      { type: 'payment', text: 'Client will pay 50% at signing and 50% after delivery.', riskLevel: 'medium', explanation: 'Payment milestones are clear but acceptance criteria are absent.' },
      { type: 'intellectual_property', text: 'All rights transfer to Client when final files are delivered.', riskLevel: 'critical', explanation: 'Rights transfer is not conditioned on full payment.' },
      { type: 'other', text: 'Designer will provide revisions until Client is satisfied.', riskLevel: 'high', explanation: 'Unlimited revisions create unbounded scope and schedule risk.' },
      { type: 'termination', text: 'Either party may cancel on written notice without a cancellation fee.', riskLevel: 'high', explanation: 'Completed work and reserved capacity may remain unpaid.' },
      { type: 'warranty', text: 'Designer warrants that final work is original.', riskLevel: 'medium', explanation: 'Client-provided assets and third-party licensed materials need exclusions.' }
      ,{ type: 'acceptance', text: 'Client will review final files and notify Designer whether the work is satisfactory.', riskLevel: 'high', explanation: 'There is no review deadline, objective acceptance standard, deemed-acceptance mechanism, or procedure for disputed deliverables.' }
      ,{ type: 'late_payment', text: 'Late invoices may be subject to a service charge.', riskLevel: 'medium', explanation: 'The rate, grace period, suspension right, collection costs, and maximum lawful amount are not specified.' }
    ],
    risks: [
      { severity: 'critical', category: 'financial', description: 'The client receives ownership before the designer is fully paid.', recommendation: 'Condition ownership transfer on receipt of full payment.' },
      { severity: 'high', category: 'operational', description: 'Unlimited revisions can expand scope indefinitely.', recommendation: 'Include a fixed revision allowance and change-order pricing.' },
      { severity: 'high', category: 'financial', description: 'Cancellation has no kill fee or payment rule.', recommendation: 'Require payment for completed work and a reasonable cancellation fee.' }
      ,{ severity: 'high', category: 'legal', description: 'Acceptance depends on subjective client satisfaction without a decision deadline.', recommendation: 'Use objective specifications, a fixed review period, and deemed acceptance if no timely rejection is received.' }
      ,{ severity: 'medium', category: 'legal', description: 'The originality warranty does not exclude client materials or licensed third-party assets.', recommendation: 'Allocate responsibility for supplied assets and disclose all approved third-party materials.' }
    ]
  })
];

export const getSample = (slug) => sampleAnalyses.find(sample => sample.slug === slug) || sampleAnalyses[0];
export default sampleAnalyses;

export const getSampleDocuments = () => sampleAnalyses.map((sample, index) => ({
  _id: `example-${sample.slug}`,
  sampleSlug: sample.slug,
  isPortfolioExample: true,
  originalName: `${sample.title}.pdf`,
  fileType: 'pdf',
  uploadDate: new Date(Date.UTC(2026, 6, 18 - index, 10, 30)).toISOString(),
  status: 'analyzed',
  analysis: sample.analysis
}));
