export enum OrganizationMemberRole {
  OWNER = 'Owner',
  ADMIN = 'Admin',
  OPERATOR = 'Operator',
  MEMBER = 'Member',
}

export enum memberStatus {
  REVIEW  = 'pending_review',
  ACTIVATION = 'pending_activation',
  ACTIVE = 'active',
}

export const getMemberStatusDisplayName = (status: memberStatus | string): string => {
  switch (status) {
    case memberStatus.REVIEW:
      return 'Pending review'
    case memberStatus.ACTIVATION:
      return 'Pending activation'
    case memberStatus.ACTIVE:
      return 'Active'
    default:
      return status
  }
}