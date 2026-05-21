import type { TeamMember } from '../../store/types';

interface Props {
  member: TeamMember;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap: Record<string, string> = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' };

export function Avatar({ member, size = 'md' }: Props) {
  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: member.avatarColor }}
      title={member.name}
    >
      {member.initials}
    </div>
  );
}
