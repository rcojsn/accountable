// Sample figures shared by all three mockups. Today is Saturday 21 Nov 2026.
window.MOCK = {
  today: 'Saturday 21 Nov 2026',
  months: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
  revenue: [185000, 340000, 210000, 395000, 460000, 240000, 720000, 515000, 480000, 830000, 610000, 265000],
  won: [1, 2, 1, 2, 2, 1, 3, 2, 2, 3, 2, 1],
  lost: [1, 0, 1, 1, 0, 2, 1, 0, 1, 1, 1, 2],

  // fill: chart and column colour; on: text on fill; badge/badgeOn: small badges; text: coloured text on light; tint: column wash
  stages: [
    { key: 'new', name: 'New', prob: 10, fill: '#06D6A0', on: '#073B4C', badge: '#06D6A0', badgeOn: '#073B4C', text: '#05795A', tint: 'rgba(6,214,160,.13)' },
    { key: 'qualified', name: 'Qualified', prob: 25, fill: '#FFC145', on: '#073B4C', badge: '#FFC145', badgeOn: '#073B4C', text: '#8A5A00', tint: 'rgba(255,193,69,.18)' },
    { key: 'proposal', name: 'Proposal', prob: 50, fill: '#F78C6B', on: '#073B4C', badge: '#F78C6B', badgeOn: '#073B4C', text: '#A8432A', tint: 'rgba(247,140,107,.15)' },
    { key: 'negotiation', name: 'Negotiation', prob: 75, fill: '#118AB2', on: '#FFFFFF', badge: '#0E6F90', badgeOn: '#FFFFFF', text: '#0E6F90', tint: 'rgba(17,138,178,.11)' },
    { key: 'won', name: 'Won', prob: 100, fill: '#073B4C', on: '#FFFFFF', badge: '#073B4C', badgeOn: '#FFFFFF', text: '#073B4C', tint: 'rgba(7,59,76,.07)' },
    { key: 'lost', name: 'Lost', prob: 0, fill: '#8FA3AA', on: '#073B4C', badge: '#8FA3AA', badgeOn: '#073B4C', text: '#4F6B75', tint: 'rgba(143,163,170,.16)' },
  ],

  // Deals created in the last 12 months, by the furthest stage they reached
  funnel: [
    { stage: 'new', deals: 64, value: 14800000 },
    { stage: 'qualified', deals: 48, value: 12100000 },
    { stage: 'proposal', deals: 36, value: 9600000 },
    { stage: 'negotiation', deals: 28, value: 7900000 },
    { stage: 'won', deals: 22, value: 5250000 },
  ],

  kpis: {
    openValue: 6090000, openDeals: 18, expected: 2500500,
    wonMonth: 265000, wonMonthDeals: 1, wonYear: 5250000,
    lateDeals: 3, overdue: 4,
  },

  deals: [
    { stage: 'new', name: 'Fleet tracking rollout', org: 'Karoo Logistics', value: 240000, close: '15 Jan 2027', contact: 'Sipho Ndlovu' },
    { stage: 'new', name: 'Parts catalogue sync', org: 'Gqeberha Auto Parts', value: 290000, close: '10 Nov', contact: 'Johan Botha', late: true },
    { stage: 'new', name: 'Solar monitoring', org: 'Umoya Energy', value: 310000, close: '30 Jan 2027', contact: 'Ruan Steyn' },
    { stage: 'new', name: 'Clinic booking system', org: 'Baobab Health', value: 180000, close: '28 Feb 2027', contact: 'Aisha Patel' },
    { stage: 'new', name: 'Store analytics pilot', org: 'Protea Retail Group', value: 95000, close: '12 Dec', contact: 'Lerato Khumalo' },
    { stage: 'new', name: 'Brand refresh', org: 'Kloof Street Studio', value: 65000, close: '5 Dec', contact: 'Megan Fourie' },

    { stage: 'qualified', name: 'Payroll integration', org: 'Ubuntu Fintech', value: 420000, close: '18 Dec', contact: 'Kgomotso Molefe' },
    { stage: 'qualified', name: 'Guest Wi-Fi upgrade', org: 'Atlantic Seaboard Hotels', value: 275000, close: '14 Nov', contact: 'Fatima Adams', late: true },
    { stage: 'qualified', name: 'Export cold chain', org: 'Lowveld Citrus Co-op', value: 360000, close: '31 Jan 2027', contact: 'Riaan Pretorius' },
    { stage: 'qualified', name: 'Matter management', org: 'Sandton Legal Partners', value: 335000, close: '20 Feb 2027', contact: 'Naledi Dlamini' },
    { stage: 'qualified', name: 'Learner portal', org: 'Jacaranda Schools Trust', value: 250000, close: '9 Jan 2027', contact: 'Zanele Mthembu' },

    { stage: 'proposal', name: 'Mine site safety app', org: 'Highveld Mining Supply', value: 680000, close: '15 Dec', contact: 'Pieter van der Merwe' },
    { stage: 'proposal', name: 'Risk dashboard', org: 'Fynbos Analytics', value: 340000, close: '31 Oct', contact: 'Kyle Jacobs', late: true },
    { stage: 'proposal', name: 'Supplier portal', org: 'Table Bay Foods', value: 510000, close: '22 Jan 2027', contact: 'Thandi Mokoena' },
    { stage: 'proposal', name: 'Online store rebuild', org: 'Drakensberg Outdoor', value: 390000, close: '4 Dec', contact: 'Ayanda Zulu' },

    { stage: 'negotiation', name: 'Warehouse automation', org: 'Karoo Logistics', value: 720000, close: '30 Nov', contact: 'Sipho Ndlovu' },
    { stage: 'negotiation', name: 'Loyalty programme', org: 'Protea Retail Group', value: 410000, close: '8 Dec', contact: 'Lerato Khumalo' },
    { stage: 'negotiation', name: 'Telehealth add-on', org: 'Baobab Health', value: 220000, close: '27 Nov', contact: 'Aisha Patel' },

    { stage: 'won', name: 'Annual support renewal', org: 'Table Bay Foods', value: 265000, close: '12 Nov', contact: 'Thandi Mokoena' },
    { stage: 'won', name: 'Booking engine', org: 'Atlantic Seaboard Hotels', value: 380000, close: '29 Oct', contact: 'Fatima Adams' },
    { stage: 'won', name: 'Data warehouse', org: 'Fynbos Analytics', value: 230000, close: '27 Oct', contact: 'Kyle Jacobs' },

    { stage: 'lost', name: 'HR system replacement', org: 'Ubuntu Fintech', value: 300000, close: '18 Nov', contact: 'Kgomotso Molefe' },
    { stage: 'lost', name: 'Event sponsorship', org: 'Drakensberg Outdoor', value: 45000, close: '2 Nov', contact: 'Ayanda Zulu' },
  ],

  followups: {
    overdue: [
      { text: 'Call back about the revised quote', on: 'Risk dashboard', kind: 'deal', type: 'call', date: '14 Nov' },
      { text: 'Send two case studies', on: 'Thandi Mokoena', kind: 'contact', type: 'email', date: '17 Nov' },
      { text: 'Chase the signed NDA', on: 'Guest Wi-Fi upgrade', kind: 'deal', type: 'email', date: '18 Nov' },
      { text: 'Confirm the site visit date', on: 'Pieter van der Merwe', kind: 'contact', type: 'call', date: '19 Nov' },
    ],
    today: [
      { text: 'Review contract redlines', on: 'Warehouse automation', kind: 'deal', type: 'note', date: '21 Nov' },
      { text: 'Intro call with the CFO', on: 'Kgomotso Molefe', kind: 'contact', type: 'call', date: '21 Nov' },
    ],
    week: [
      { text: 'Send pricing options', on: 'Loyalty programme', kind: 'deal', type: 'email', date: '24 Nov' },
      { text: 'Demo for clinical staff', on: 'Telehealth add-on', kind: 'deal', type: 'call', date: '25 Nov' },
      { text: 'Quarterly check-in', on: 'Thandi Mokoena', kind: 'contact', type: 'call', date: '27 Nov' },
    ],
    later: 12,
  },

  recent: [
    { type: 'stage', text: 'Moved from Proposal to Negotiation', on: 'Warehouse automation', when: '2 hours ago', from: 'proposal', to: 'negotiation' },
    { type: 'call', text: 'Agreed scope for phase 1', on: 'Lerato Khumalo', when: '3 hours ago' },
    { type: 'email', text: 'Sent proposal v2 with phased pricing', on: 'Supplier portal', when: '5 hours ago' },
    { type: 'note', text: 'Budget approved for Q1, waiting on procurement', on: 'Mine site safety app', when: 'Yesterday 16:20' },
    { type: 'stage', text: 'Moved from Negotiation to Lost', on: 'HR system replacement', when: '18 Nov 10:05', from: 'negotiation', to: 'lost' },
    { type: 'call', text: 'Walked through the integration plan', on: 'Kgomotso Molefe', when: '17 Nov 14:30' },
    { type: 'email', text: 'Shared references from two hotel groups', on: 'Fatima Adams', when: '16 Nov 09:12' },
    { type: 'stage', text: 'Moved from Negotiation to Won', on: 'Annual support renewal', when: '12 Nov 11:48', from: 'negotiation', to: 'won' },
  ],
};
