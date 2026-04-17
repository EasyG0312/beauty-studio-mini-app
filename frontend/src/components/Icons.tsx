/**
 * Premium SVG Icon Set — Line Art Style
 * Все иконки в едином стиле: тонкие линии, скругленные углы
 */

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

const IconBase = ({ children, size = 24, color = "currentColor", className = "" }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

// === NAVIGATION ===
export const IconHome = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </IconBase>
);

export const IconCalendar = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </IconBase>
);

export const IconClipboard = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M9 12h6M9 16h6" />
  </IconBase>
);

export const IconGrid = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </IconBase>
);

export const IconStar = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
  </IconBase>
);

export const IconImage = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </IconBase>
);

export const IconHelp = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
  </IconBase>
);

// === SERVICES ===
export const IconScissors = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
  </IconBase>
);

export const IconNailPolish = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M9 2h6v4H9z" />
    <path d="M10 6h4l1 4H9l1-4z" />
    <path d="M8 10h8l-1 12H9L8 10z" />
  </IconBase>
);

export const IconMakeup = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 2C8 2 6 6 6 10c0 3 2 5 2 8 0 2 2 4 4 4s4-2 4-4c0-3 2-5 2-8 0-4-2-8-6-8z" />
    <path d="M12 2v20" />
  </IconBase>
);

export const IconMassage = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M7 20h10M10 20c-2-3-2-6 0-8s2-4 0-6" />
    <path d="M14 20c2-3 2-6 0-8s-2-4 0-6" />
    <circle cx="12" cy="4" r="2" />
  </IconBase>
);

export const IconColorPalette = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="8" cy="9" r="1.5" fill="currentColor" />
    <circle cx="12" cy="7" r="1.5" fill="currentColor" />
    <circle cx="16" cy="9" r="1.5" fill="currentColor" />
    <circle cx="8" cy="13" r="1.5" fill="currentColor" />
    <path d="M14 17a2 2 0 104 0c0-2-2-3-4-4" />
  </IconBase>
);

// === UTILITY ===
export const IconPhone = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </IconBase>
);

export const IconMapPin = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </IconBase>
);

export const IconClock = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </IconBase>
);

export const IconMessage = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
  </IconBase>
);

export const IconList = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </IconBase>
);

export const IconCrown = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M2 20h20M4 20l2-14 4 6 2-8 2 8 4-6 2 14" />
  </IconBase>
);

export const IconUser = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M20 21a8 8 0 10-16 0" />
  </IconBase>
);

export const IconCheck = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M20 6L9 17l-5-5" />
  </IconBase>
);

export const IconX = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M18 6L6 18M6 6l12 12" />
  </IconBase>
);

export const IconChevronRight = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M9 18l6-6-6-6" />
  </IconBase>
);

export const IconChevronLeft = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M15 18l-6-6 6-6" />
  </IconBase>
);

export const IconRefresh = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M1 4v6h6M23 20v-6h-6" />
    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
  </IconBase>
);

export const IconSend = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </IconBase>
);

export const IconCamera = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" />
    <circle cx="12" cy="13" r="4" />
  </IconBase>
);

export const IconSearch = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </IconBase>
);

export const IconChart = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </IconBase>
);

export const IconUsers = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="9" cy="7" r="4" />
    <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
    <circle cx="17" cy="7" r="3" />
    <path d="M21 21v-2a3 3 0 00-2-2.83" />
  </IconBase>
);

export const IconSettings = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </IconBase>
);

export const IconEdit = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </IconBase>
);
