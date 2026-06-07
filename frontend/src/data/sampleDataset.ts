export const sampleDataset = {
  metadata: {
    intent: 'sample_dataset_load',
    generated_by: 'demo_data',
    timestamp: new Date().toISOString(),
    data_sources: ['Demo dataset']
  },
  companies: [
    {
      account: {
        account_id: 'ACC-1001',
        name: 'Acme Manufacturing',
        website: 'https://acme.example.com',
        industry: 'Manufacturing',
        sub_industry: 'Industrial Automation',
        market_segment: 'Enterprise',
        business_model: 'B2B SaaS',
        hq: 'Austin, TX',
        founded_year: 2012,
        employee_count: 1200,
        public_company: false,
        description: 'Acme Manufacturing delivers industrial AI and automation solutions that reduce downtime, improve quality, and accelerate digital transformation.',
        market_positioning: 'Trusted provider of manufacturing intelligence for enterprise operations'
      },
      products: ['Acme Flow', 'Acme Insight', 'Acme Connect'],
      use_cases: ['Smart manufacturing', 'Predictive maintenance', 'Supply chain optimization'],
      tech_stack: ['React', 'Node.js', 'Python', 'AWS', 'PostgreSQL'],
      customer_segments: ['Industrial', 'Energy', 'Logistics'],
      partnerships: ['Siemens', 'Honeywell', 'Deloitte'],
      competitors: ['FactorySense', 'SmartPlant', 'PredictX'],
      funding: {
        total_raised: '$220M',
        last_round: 'Series C',
        investors: ['Green Ventures', 'Edge Capital']
      },
      contacts: [
        {
          contact_id: 'CON-001',
          name: 'Emma Lawson',
          role: 'VP of Operations',
          department: 'Operations',
          linkedin: 'linkedin.com/in/emmalawson',
          email: 'emma.lawson@acme.example.com',
          phone: '+1-512-555-0101',
          contact_type: 'decision_maker',
          influence_level: 'High',
          lead_score: 92,
          lead_status: 'Engaged',
          last_activity: 'Email outreach',
          notes: ['Interested in predictive maintenance pilot'],
          company: 'Acme Manufacturing'
        },
        {
          contact_id: 'CON-002',
          name: 'Carlos Nguyen',
          role: 'Director of Digital Transformation',
          department: 'Engineering',
          linkedin: 'linkedin.com/in/carlosnguyen',
          email: 'carlos.nguyen@acme.example.com',
          phone: '+1-512-555-0112',
          contact_type: 'influencer',
          influence_level: 'Medium',
          lead_score: 83,
          lead_status: 'Qualified',
          last_activity: 'Product demo',
          notes: ['Needs integration with MES'],
          company: 'Acme Manufacturing'
        },
        {
          contact_id: 'CON-003',
          name: 'Sofia Patel',
          role: 'Procurement Manager',
          department: 'Procurement',
          linkedin: 'linkedin.com/in/sofiapatel',
          email: 'sofia.patel@acme.example.com',
          phone: '+1-512-555-0133',
          contact_type: 'stakeholder',
          influence_level: 'Low',
          lead_score: 74,
          lead_status: 'Prospect',
          last_activity: 'Intro call',
          notes: ['Looking for cost savings narrative'],
          company: 'Acme Manufacturing'
        }
      ],
      leads: [
        {
          lead_id: 'LEAD-001',
          target_role: 'VP of Operations',
          priority: 'High',
          reason: 'Looking to improve equipment uptime',
          lead_department: 'Operations',
          lead_score: 92
        },
        {
          lead_id: 'LEAD-002',
          target_role: 'Director of Engineering',
          priority: 'Medium',
          reason: 'Needs integration with existing systems',
          lead_department: 'Engineering',
          lead_score: 83
        }
      ],
      deals: [
        {
          deal_id: 'DEAL-001',
          deal_name: 'Acme Flow Expansion',
          stage: 'Proposal Sent',
          value_estimate: 420000,
          probability: 68,
          owner: 'Ava Brooks',
          associated_contacts: ['Emma Lawson']
        },
        {
          deal_id: 'DEAL-002',
          deal_name: 'Acme Insight Pilot',
          stage: 'Negotiation',
          value_estimate: 180000,
          probability: 53,
          owner: 'Ava Brooks',
          associated_contacts: ['Carlos Nguyen']
        }
      ],
      interaction_history: [
        { interaction_id: 'INT-001', channel: 'Email', timestamp: '2026-05-29T10:24:00Z', summary: 'Shared pilot program details with operations team.' },
        { interaction_id: 'INT-002', channel: 'LinkedIn', timestamp: '2026-05-31T14:15:00Z', summary: 'Connected with Director of Digital Transformation.' }
      ],
      emails: [
        {
          email_id: 'EML-001',
          subject: 'Acme Flow Pilot Proposal',
          direction: 'OUTBOUND',
          timestamp: '2026-05-31T09:00:00Z',
          summary: 'Sent the initial proposal and ROI analysis.'
        },
        {
          email_id: 'EML-002',
          subject: 'Follow up on MES integration',
          direction: 'INBOUND',
          timestamp: '2026-06-01T13:45:00Z',
          summary: 'Client requested more details on integration options.'
        }
      ],
      call_logs: [
        {
          call_id: 'CAL-001',
          contact: 'Emma Lawson',
          outcome: 'Interested',
          duration: 28,
          notes: 'Discussed ROI and timeline for pilot.',
          timestamp: '2026-05-30T15:30:00Z'
        }
      ],
      sales_insights: {
        pain_points: ['Legacy OT systems', 'Plant inefficiencies', 'Siloed operations'],
        opportunities: ['Predictive maintenance', 'Digital twin use case', 'Operational visibility'],
        value_prop: 'Deliver 25% less downtime with AI-powered operations intelligence.',
        suggested_pitch: 'Our AI platform helps manufacturing teams reduce unplanned downtime and increase output across plants.'
      },
      market_analysis: {
        market_trends: ['AI adoption in production', 'Supply chain resilience', 'Sustainable operations'],
        competitor_landscape: ['FactorySense', 'SmartPlant', 'PredictX']
      },
      lead_discovery: {
        target_roles: ['VP Operations', 'Director of Engineering', 'Procurement Manager'],
        estimated_buying_team_size: 6,
        departments: ['Operations', 'Engineering', 'Procurement']
      },
      ai_summary: {
        account_value: '$1.1M',
        deal_potential: '$420K',
        recommended_next_step: 'Schedule a technical review with VP Operations and CIO.'
      }
    }
  ]
};
