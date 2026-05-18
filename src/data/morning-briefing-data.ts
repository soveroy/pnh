export type RagStatus = 'Red' | 'Amber' | 'Green';

export interface Exception {
  id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  recommendedAction: string;
  isApprovalRequired?: boolean;
}

export interface DepartmentBriefing {
  department: string;
  rag_status: RagStatus;
  summary: string;
  exceptions: Exception[];
  as_of_timestamp: string;
}

export interface ManagementBriefing {
  overall_rag_status: RagStatus;
  department_summaries: { department: string; rag_status: RagStatus }[];
  top_alerts: Exception[];
  executive_summary: string;
  as_of_timestamp: string;
}

export const mockDepartmentData: Record<string, DepartmentBriefing> = {
  Operations: {
    department: 'Operations',
    rag_status: 'Amber',
    summary: 'Overall job completion remains steady, but attention is required on delayed projects. The SMRT CD Shelter job is progressing well and is currently on track at 78% completion. However, NHGP Polyclinic is falling behind schedule, and the SMRT project has missed its start date.',
    exceptions: [
      {
        id: 'OP-1',
        title: 'Job #J-1103 (SMRT) Overdue',
        description: 'Project has not started and is 2 days past the scheduled start date.',
        priority: 'High',
        recommendedAction: 'Approve immediate escalation to site supervisor and alert client.',
        isApprovalRequired: true,
      },
      {
        id: 'OP-2',
        title: 'Job #J-1089 (NHGP Polyclinic) Delayed',
        description: 'Currently at 41% completion, tracking 3 days behind the planned schedule.',
        priority: 'Medium',
        recommendedAction: 'Schedule review meeting with project manager to revise timeline.',
        isApprovalRequired: true,
      }
    ],
    as_of_timestamp: '2026-05-11T06:47:00Z'
  },
  Procurement: {
    department: 'Procurement',
    rag_status: 'Amber',
    summary: 'Most outstanding invoices are matched and cleared, such as INV-2041 for $12,400. However, there are significant discrepancies requiring review. A mismatch in amount and an overdue invoice with no GRN need immediate investigation.',
    exceptions: [
      {
        id: 'PR-1',
        title: 'Invoice Mismatch: INV-2038',
        description: 'Invoice amount is $18,200, but the matched PO is only for $17,500.',
        priority: 'High',
        recommendedAction: 'Request clarification from vendor regarding the $700 variance.',
        isApprovalRequired: true,
      },
      {
        id: 'PR-2',
        title: 'Overdue Invoice: INV-2031',
        description: 'Invoice outstanding for 47 days without a corresponding GRN received.',
        priority: 'High',
        recommendedAction: 'Escalate to warehouse manager to confirm receipt of goods.',
        isApprovalRequired: true,
      }
    ],
    as_of_timestamp: '2026-05-11T06:47:00Z'
  },
  Safety: {
    department: 'Safety',
    rag_status: 'Red',
    summary: 'Safety compliance shows critical gaps across multiple sites. While the SMRT CD Shelter site maintains full compliance, other sites require immediate intervention. A pending MSRA expiration and an overdue toolbox meeting pose significant compliance risks.',
    exceptions: [
      {
        id: 'SF-1',
        title: 'MSRA Expiring: SMRT',
        description: 'MSRA expires in 6 days and no renewal process has been initiated.',
        priority: 'High',
        recommendedAction: 'Approve automated reminder to site safety officer to initiate renewal.',
        isApprovalRequired: true,
      },
      {
        id: 'SF-2',
        title: 'Overdue Toolbox Meeting: NHGP Polyclinic',
        description: 'The weekly toolbox meeting is currently overdue by 4 days.',
        priority: 'Medium',
        recommendedAction: 'Prompt site supervisor to conduct and log toolbox meeting immediately.',
        isApprovalRequired: true,
      }
    ],
    as_of_timestamp: '2026-05-11T06:47:00Z'
  },
  'HR Manpower': {
    department: 'HR Manpower',
    rag_status: 'Amber',
    summary: 'Daily attendance indicates a notable absenteeism rate with 17 staff unaccounted for today out of 160. Additionally, there are deployment mismatches and pending certification renewals that need to be addressed to ensure operational continuity.',
    exceptions: [
      {
        id: 'HR-1',
        title: 'Absenteeism Spike',
        description: '17 out of 160 staff failed to check in today.',
        priority: 'High',
        recommendedAction: 'Notify site supervisors to verify whereabouts of missing staff.',
        isApprovalRequired: true,
      },
      {
        id: 'HR-2',
        title: 'Certifications Expiring',
        description: 'Certifications for Jayabal, Raja, and Ajith expire within 14 days.',
        priority: 'Medium',
        recommendedAction: 'Approve scheduling of refresher courses for the 3 staff members.',
        isApprovalRequired: true,
      },
      {
        id: 'HR-3',
        title: 'Deployment Mismatch',
        description: '2 staff members checked in at incorrect sites compared to the schedule.',
        priority: 'Low',
        recommendedAction: 'Flag for HR review to update roster or instruct staff to relocate.',
        isApprovalRequired: false,
      }
    ],
    as_of_timestamp: '2026-05-11T06:47:00Z'
  }
};

export const mockManagementData: ManagementBriefing = {
  overall_rag_status: 'Amber',
  department_summaries: [
    { department: 'Operations', rag_status: 'Amber' },
    { department: 'Procurement', rag_status: 'Amber' },
    { department: 'Safety', rag_status: 'Red' },
    { department: 'HR Manpower', rag_status: 'Amber' }
  ],
  top_alerts: [
    {
      id: 'SF-1',
      title: 'Safety: MSRA Expiring at SMRT',
      description: 'MSRA expires in 6 days; no renewal initiated. Critical compliance risk.',
      priority: 'High',
      recommendedAction: 'Approve automated reminder to site safety officer to initiate renewal.',
      isApprovalRequired: true,
    },
    {
      id: 'OP-1',
      title: 'Operations: Job #J-1103 Overdue',
      description: 'SMRT project is 2 days past scheduled start date.',
      priority: 'High',
      recommendedAction: 'Approve immediate escalation to site supervisor and alert client.',
      isApprovalRequired: true,
    },
    {
      id: 'HR-1',
      title: 'HR: High Absenteeism',
      description: '17 out of 160 staff failed to check in today.',
      priority: 'High',
      recommendedAction: 'Notify site supervisors to verify whereabouts of missing staff.',
      isApprovalRequired: true,
    },
    {
      id: 'PR-1',
      title: 'Procurement: Invoice Mismatch INV-2038',
      description: 'Invoice ($18,200) exceeds PO ($17,500) by $700.',
      priority: 'High',
      recommendedAction: 'Request clarification from vendor regarding variance.',
      isApprovalRequired: true,
    },
    {
      id: 'PR-2',
      title: 'Procurement: Overdue Invoice INV-2031',
      description: 'Outstanding for 47 days with no GRN received.',
      priority: 'High',
      recommendedAction: 'Escalate to warehouse manager to confirm receipt.',
      isApprovalRequired: true,
    }
  ],
  executive_summary: 'Good morning. Your immediate attention is required on safety compliance at the SMRT site, where the MSRA is expiring in 6 days and the project start is already delayed by 2 days. Additionally, we are tracking 17 unaccounted staff absences this morning and a significant invoice discrepancy of $700 on INV-2038 that requires clarification before payment processing. Overall company status is Amber.',
  as_of_timestamp: '2026-05-11T06:47:00Z'
};
